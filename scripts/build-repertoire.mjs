// Veyra Chess — builds the opening repertoire in the daxaur/tabia module format (MIT).
// Inputs : data-src/veyra-openings.txt (flat lines), data-src/masters-notes.json, data-src/daxaur/*.js (MIT, credited)
// Outputs: data/repertoire/*.js + index.js, public/data/repertoire.json, public/data/openings.json (flat, for book detection)
// Every line is replayed move-by-move on the rules engine; any illegal move fails the build.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { applySan, newPosition, stripMoveNumbers } from './lib/san.mjs';

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const notes = JSON.parse(fs.readFileSync('data-src/masters-notes.json', 'utf8'));
const errors = [];

// ---- canonical module for each family in the flat source
const MERGE = {
  "King's Gambit Accepted": "King's Gambit", "King's Gambit Declined": "King's Gambit",
  'Veresov Opening': 'Richter-Veresov Attack', 'Neo-Grünfeld Defense': 'Grünfeld Defense',
  'Mikenas Defense': 'Nimzowitsch Defense', "Larsen's Opening": 'Nimzo-Larsen Attack', 'Dunst Opening': 'Van Geet Opening',
};
const IRREGULAR = new Set(["Anderssen's Opening", 'Ware Opening', 'Polish Opening', 'Saragossa Opening', 'Mieses Opening', "Queen's Pawn Game",
  "Van't Kruijs Opening", "King's Pawn Opening", "King's Pawn Game", 'Hungarian Opening', 'Grob Opening', 'Clemenz Opening', 'Desprez Opening',
  'Amar Opening', 'Indian Defense', 'Portuguese Opening']);
const canon = (fam) => IRREGULAR.has(fam) ? 'Irregular Openings' : (MERGE[fam] || fam);

// ---- parse the flat source
const mods = new Map(); // canonical name -> {name, lines:[]}
let tier = 1;
fs.readFileSync('data-src/veyra-openings.txt', 'utf8').split(/\r?\n/).forEach((raw, i) => {
  const line = raw.trim();
  if (line.includes('EXTENSION 1')) tier = 2;
  if (line.includes('EXTENSION 6')) tier = 1;
  if (!line || line.startsWith('#')) return;
  const [name, mv] = line.split('|').map((x) => x.trim());
  const sans = stripMoveNumbers(mv).split(' ');
  const orig = name.split(':')[0].trim();
  const label = name.includes(':') ? name.slice(name.indexOf(':') + 1).trim() : '';
  const c = canon(orig);
  if (!mods.has(c)) mods.set(c, { name: c, lines: [] });
  mods.get(c).lines.push({ orig, label, sans, tier });
});

// ---- load the credited daxaur/tabia modules
const THEIRS = { bdg: 'Blackmar-Diemer Gambit', budapest: 'Budapest Gambit', benoni: 'Benoni Defense', qg: "Queen's Gambit", ruylopez: 'Ruy Lopez',
  italian: 'Italian Game', sicilian: 'Sicilian Defense', french: 'French Defense', carokann: 'Caro-Kann Defense', scotchgambit: 'Scotch Gambit' };
const DEFAULT_GROUPS = { accepted: { label: 'Accepted', blurb: 'Black takes the pawn' }, ryder: { label: 'Ryder', blurb: 'The double-pawn gambit' }, declined: { label: 'Declined', blurb: 'Black gives the pawn back' } };
const theirs = [];
for (const f of fs.readdirSync('data-src/daxaur').filter((x) => x.endsWith('.js'))) {
  const { repertoire } = await import(pathToFileURL(path.resolve('data-src/daxaur', f)).href);
  theirs.push(structuredClone(repertoire));
}
const theirMoves = new Set();
for (const r of theirs) for (const l of r.lines) theirMoves.add(l.moves.map((m) => m[0]).join(' '));

// ---- numbered trunk string
const numbered = (sans) => sans.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.` : '') + s).join(' ');
const commonPrefix = (arrs) => { if (!arrs.length) return []; let p = arrs[0]; for (const a of arrs) { let k = 0; while (k < p.length && k < a.length && p[k] === a[k]) k++; p = p.slice(0, k); } return p; };

// ---- build my modules
const out = []; // final repertoire objects
const buildMine = (m) => {
  const note = notes[m.name];
  if (!note) errors.push(`missing masters note for "${m.name}"`);
  const lines = []; const groups = {}; const ids = new Set(); const firstInGroup = new Map();
  for (const l of m.lines) {
    if (theirMoves.has(l.sans.join(' '))) continue; // already covered by a credited daxaur line
    let gKey, gLabel;
    if (m.name === 'King\'s Gambit' && /Accepted|Declined/.test(l.orig)) { gKey = slug(l.orig.replace("King's Gambit ", '')); gLabel = l.orig.replace("King's Gambit ", ''); }
    else if (l.orig !== m.name) { gKey = slug(l.orig); gLabel = l.orig; }
    else { const base = (l.label.replace(/\s*\(line ending.*\)$/, '').split(',')[0] || 'Main').trim() || 'Main'; gKey = slug(base); gLabel = base; }
    groups[gKey] = groups[gKey] || { label: gLabel, blurb: '' };
    let id = slug(l.label || l.orig) || 'line'; let n = 2; const base = id; while (ids.has(id)) id = `${base}-${n++}`; ids.add(id);
    const line = { id, name: l.label || l.orig, group: gKey, moves: l.sans.map((s) => [s]), _tier: l.tier };
    lines.push(line);
    const cur = firstInGroup.get(gKey); if (!cur || l.sans.length < cur.moves.length) firstInGroup.set(gKey, line);
  }
  if (!lines.length) return null;
  for (const l of firstInGroup.values()) l.star = true;
  const star0 = lines.filter((l) => l.star).sort((a, b) => a.moves.length - b.moves.length)[0];
  if (star0 && note) star0.idea = note.idea;
  const trunk = numbered(commonPrefix(lines.map((l) => l.moves.map((x) => x[0]))));
  return { id: slug(m.name), name: m.name, color: note?.color || 'w', oneLiner: note?.oneLiner || '', trunk, groups, lines, source: 'veyra' };
};
const mine = [...mods.values()].map(buildMine).filter(Boolean);

// ---- merge into daxaur modules where the opening is the same, else keep both
const mineByName = new Map(mine.map((r) => [r.name, r]));
for (const t of theirs) {
  const key = THEIRS[t.id];
  const r = key && mineByName.get(key);
  t.source = 'daxaur/tabia (MIT)';
  if (r) {
    t.groups = { ...DEFAULT_GROUPS, ...(t.groups || {}) };
    const ids = new Set(t.lines.map((l) => l.id));
    for (const l of r.lines) { let id = l.id; let n = 2; while (ids.has(id)) id = `${l.id}-${n++}`; ids.add(id); delete l.star; t.lines.push({ ...l, id, group: `v-${l.group}` }); }
    for (const [k, v] of Object.entries(r.groups)) t.groups[`v-${k}`] = v;
    mineByName.delete(key);
  }
  out.push(t);
}
for (const r of mineByName.values()) out.push(r);

// ---- validate and compute flat book
const flat = []; const seenFlat = new Set();
for (const r of out) {
  r.id = r.id || slug(r.name);
  for (const l of r.lines) {
    let cfg = newPosition(); const ucis = []; const sans = l.moves.map((m) => m[0]);
    try { for (const s of sans) { const a = applySan(cfg, s); ucis.push(a.uci); cfg = a.next; } }
    catch (e) { errors.push(`${r.name} / ${l.name}: ${e.message}`); continue; }
    const key = sans.join(' ');
    if (!seenFlat.has(key)) { seenFlat.add(key); flat.push({ id: `${r.id}/${l.id}`, name: l.name === r.name ? r.name : `${r.name}: ${l.name}`, family: r.name, m: key, uci: ucis.join(' '), ply: sans.length, source: r.source, ...(l._tier ? { tier: l._tier } : {}) }); }
  }
}
if (errors.length) { console.error('REPERTOIRE BUILD FAILED\n' + errors.join('\n')); process.exit(1); }

// ---- write modules
fs.rmSync('data/repertoire', { recursive: true, force: true }); fs.mkdirSync('data/repertoire', { recursive: true });
const CATEGORY = (r) => /Gambit|Counter/.test(r.name) ? 'Gambits' : (r.color === 'b' ? 'Defences' : (/System|Attack|Irregular|Bird|English Opening|Réti|Zukertort|Van Geet|Barnes|Catalan|Larsen/.test(r.name) ? 'Systems' : 'Classical'));
for (const r of out) {
  r.category = r.category || CATEGORY(r);
  const { lines, ...head } = r;
  const clean = lines.map(({ _tier, ...x }) => x);
  const body = JSON.stringify({ ...head, lines: '__LINES__' }, null, 1).replace('"__LINES__"', '[\n' + clean.map((x) => '  ' + JSON.stringify(x)).join(',\n') + '\n ]');
  fs.writeFileSync(`data/repertoire/${r.id}.js`, `// ${r.name} — ${r.source === 'veyra' ? 'Veyra Chess (MIT)' : 'daxaur/tabia (MIT), extended by Veyra Chess'}\n// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.\nexport const repertoire = ${body};\n`);
}
const idx = out.map((r) => `import { repertoire as r_${r.id.replace(/-/g, '_')} } from './${r.id}.js';`).join('\n') + `\n\nexport const openings = [${out.map((r) => 'r_' + r.id.replace(/-/g, '_')).join(', ')}];\nexport const CATEGORIES = ['Gambits', 'Classical', 'Defences', 'Systems'];\nexport function openingById(id) { return openings.find((o) => o.id === id); }\n`;
fs.writeFileSync('data/repertoire/index.js', idx);
fs.writeFileSync('public/data/repertoire.json', JSON.stringify(out.map((r) => ({ ...r, lines: r.lines.map(({ _tier, ...x }) => x) }))));
fs.writeFileSync('public/data/openings.json', JSON.stringify(flat.sort((a, b) => a.m.localeCompare(b.m))));
const nl = out.reduce((s, r) => s + r.lines.length, 0);
console.log(`repertoire: ${out.length} openings, ${nl} lines, ${flat.length} unique move-lines; all legal`);
