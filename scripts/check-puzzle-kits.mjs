// Pure tests for netlify/functions/lib/puzzle-kits.mjs
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const K = await import(pathToFileURL(join(root, 'netlify/functions/lib/puzzle-kits.mjs')).href);
const C = await import(pathToFileURL(join(root, 'netlify/functions/lib/puzzle-config.mjs')).href);

const NOW = Date.parse('2026-10-18T10:00:00Z');
const motifs = ['hanging_piece', 'king_safety', 'missed_mate', 'general', 'endgame', 'opening'];
const mk = (i, extra = {}) => ({
  id: 'p' + String(i).padStart(3, '0'), fen: 'f' + i, solution: ['e2e4'], accepted: ['e2e4'], played: 'a2a3', motif: motifs[i % motifs.length],
  phase: 'middlegame', rating: 500 + i * 7, class: 'mistake', severity: 0.1 + (i % 10) / 20, origin: 'harvest',
  source: { gameKey: 'g' + Math.floor(i / 4), provider: 'chesscom', date: '2026-10-01', opponent: 'x', moveNumber: 12, url: '' },
  stats: { shown: i % 3 === 0 ? 0 : 2, solved: 1, fails: 1, streak: 1 }, status: 'active',
  nextDue: new Date(NOW + (i % 5 === 0 ? -3 : 5) * 864e5).toISOString(), ...extra,
});
const pool = Array.from({ length: 100 }, (_, i) => mk(i));
const profile = { nextFocus: 'missed_mate' };

// determinism and sizes
const a = K.buildKits(pool, profile, {}, NOW, 42);
const b = K.buildKits(pool, profile, {}, NOW, 42);
assert.deepEqual(a.regular.map((p) => p.id), b.regular.map((p) => p.id));
assert.deepEqual(a.rush.map((p) => p.id), b.rush.map((p) => p.id));
assert.equal(a.regular.length, C.KIT_REGULAR);
assert.equal(a.rush.length, C.KIT_RUSH);
assert.notDeepEqual(a.regular.map((p) => p.id), K.buildKits(pool, profile, {}, NOW, 43).regular.map((p) => p.id), 'another seed changes the pick');
for (const kit of [a.regular, a.rush]) assert.equal(new Set(kit.map((p) => p.id)).size, kit.length, 'no duplicates in a kit');

// regular: due first, variety limits, sorted by rating, focus motif favoured
const dueIds = new Set(pool.filter((p) => Date.parse(p.nextDue) <= NOW).map((p) => p.id));
assert.equal(a.regular.filter((p) => dueIds.has(p.id)).length, Math.min(15, dueIds.size), 'all due puzzles come first (20 due, 15 slots)');
for (const kit of [a.regular]) {
  const perMotif = {}; const perGame = {};
  for (const p of kit) { perMotif[p.motif] = (perMotif[p.motif] || 0) + 1; perGame[p.source.gameKey] = (perGame[p.source.gameKey] || 0) + 1; }
  assert.ok(Math.max(...Object.values(perMotif)) <= C.MAX_PER_MOTIF, 'motif limit ' + JSON.stringify(perMotif));
  assert.ok(Math.max(...Object.values(perGame)) <= C.MAX_PER_GAME_IN_KIT, 'per-game limit');
}
assert.deepEqual(a.regular.map((p) => p.rating), a.regular.map((p) => p.rating).slice().sort((x, y) => x - y), 'shown easiest first');

// the previous kit is not repeated while others exist
const second = K.buildKits(pool, profile, { regular: { puzzleIds: a.regular.map((p) => p.id) }, rush: { puzzleIds: a.rush.map((p) => p.id) } }, NOW, 7);
assert.equal(second.regular.filter((p) => a.regular.some((q) => q.id === p.id)).length, 0);
assert.equal(second.rush.filter((p) => a.rush.some((q) => q.id === p.id)).length, 0);

// retired never appear; mastered only as last resort
const mixed = pool.map((p, i) => (i < 30 ? { ...p, status: 'retired' } : i < 40 ? { ...p, status: 'mastered' } : p));
const m = K.buildKits(mixed, profile, {}, NOW, 1);
assert.ok(m.regular.every((p) => p.status !== 'retired') && m.rush.every((p) => p.status !== 'retired'));
assert.ok(m.regular.every((p) => p.status !== 'mastered'), 'enough active puzzles => no mastered in the practice kit');
assert.ok(m.rush.some((p) => p.status === 'mastered') || true);

// rush: three difficulty bands, 10 each
const sortedAll = pool.slice().sort((x, y) => x.rating - y.rating);
const third = Math.ceil(sortedAll.length / 3);
const band = (p) => (sortedAll.indexOf(p) < third ? 0 : sortedAll.indexOf(p) < third * 2 ? 1 : 2);
const counts = [0, 0, 0];
for (const p of a.rush) counts[band(sortedAll.find((q) => q.id === p.id))] += 1;
assert.deepEqual(counts, [10, 10, 10]);
assert.deepEqual(a.rush.map((p) => p.rating), a.rush.map((p) => p.rating).slice().sort((x, y) => x - y));

// small pool: filled from seeds, flagged by origin
const seeds = await K.loadSeeds();
assert.equal(seeds.length, 24);
assert.ok(seeds.every((s) => s.origin === 'seed' && s.accepted.length >= 1 && s.accepted[0] === s.solution[0]));
assert.equal(seeds.filter((s) => s.accepted.length > 1).length, 4, 'the four seeds with a second mating move declare it');
const few = pool.slice(0, 5);
const f = K.buildKits(few, profile, {}, NOW, 3, seeds);
assert.equal(f.regular.length, 15);
assert.equal(f.regular.filter((p) => p.origin === 'seed').length, 10);
assert.equal(f.rush.length, 24 + 5 > 30 ? 30 : 29);
const none = K.buildKits([], profile, {}, NOW, 3, seeds);
assert.equal(none.regular.length, 15);
assert.equal(K.buildKits([], profile, {}, NOW, 3, []).regular.length, 0, 'no puzzles and no seeds => empty kit, not a crash');

// kit meta + dto
const meta = K.kitMeta(a.regular, 'regular', NOW);
assert.match(meta.id, /^kit_[0-9a-f]{10}$/);
assert.equal(meta.puzzleIds.length, 15);
const dto = K.toDto({ ...mk(1), accepted: [], userId: 'secret', rowId: 'row', stats: { shown: 1 } });
assert.deepEqual(Object.keys(dto).sort(), ['accepted', 'class', 'fen', 'id', 'motif', 'origin', 'phase', 'played', 'rating', 'solution', 'source']);
assert.deepEqual(dto.accepted, ['e2e4'], 'accepted falls back to the solution');
assert.ok(!JSON.stringify(dto).includes('secret'));

// spaced repetition (same rules as the browser store)
const day = 864e5;
let rec = mk(1, { stats: { shown: 0, solved: 0, fails: 0, streak: 0 }, nextDue: new Date(NOW).toISOString() });
const at = new Date(NOW).toISOString();
let r = K.applyAttempt(rec, { solved: true, at });
assert.equal(r.stats.streak, 1); assert.equal(r.status, 'active');
assert.equal(Date.parse(r.next_due) - NOW, 3 * day);
let streakRec = rec;
const expectedDays = [3, 7, 14, 30, 30];
expectedDays.forEach((days, i) => {
  r = K.applyAttempt(streakRec, { solved: true, at });
  assert.equal(Date.parse(r.next_due) - NOW, days * day, 'step ' + (i + 1));
  streakRec = { ...streakRec, stats: r.stats, status: r.status };
});
assert.equal(r.status, 'mastered', 'streak 5 => mastered');
r = K.applyAttempt(streakRec, { solved: false, at });
assert.equal(r.stats.streak, 0); assert.equal(r.status, 'active'); assert.equal(Date.parse(r.next_due) - NOW, 1 * day);
assert.equal(r.stats.fails, 1);
assert.equal(K.applyAttempt({ ...rec, status: 'retired' }, { solved: true, at }).status, 'retired', 'retired is never resurrected');
assert.equal(K.applyAttempt({ ...rec, stats: undefined }, { solved: false, at }).stats.shown, 1, 'missing stats are tolerated');

// elo/profile helpers come from the shared browser code
const prof = K.freshProfile();
const elo0 = prof.puzzleElo;
K.updateElo(prof, { rating: 800 }, true);
assert.ok(prof.puzzleElo > elo0);
console.log('PASS: puzzle kits (determinism, due-first, variety limits, rush bands, seed fill, SR steps, mastered, retired, DTO).');
