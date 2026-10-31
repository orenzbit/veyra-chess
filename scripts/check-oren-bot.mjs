#!/usr/bin/env node
// Independent check for the Oren bot profile (id `orenzbit`). Read-only.
//   node scripts/check-oren-bot.mjs [--pgn-dir=.] [--profile=public/data/bots/orenzbit.json] [--index=public/data/bots/index.json] [--base-index=<index.json>]
// Exit 0 = all checks PASS; exit 1 = a check FAILED. Warnings are printed and do not fail.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const match = arg.match(/^--([a-z-]+)=(.*)$/);
  if (!match) throw new Error('unknown argument: ' + arg);
  return [match[1], match[2]];
}));
const pgnDir = args['pgn-dir'] || '.';
const profilePath = args.profile || 'public/data/bots/orenzbit.json';
const indexPath = args.index || 'public/data/bots/index.json';
const baseIndexPath = args['base-index'] || null;
const ACCOUNT = 'orenzbit';
const CANONICAL = /^orenzbit-\d{4}-\d{2}\.pgn$/;
const REQUIRED = ['id', 'slug', 'elo', 'name', 'title', 'tier', 'stage', 'flavor', 'piece', 'era', 'region', 'persona', 'historicalNote', 'style', 'styleLabel', 'openingEraNote', 'quips', 'openingsAsWhite', 'openingsAsBlack', 'gambits'];
const failures = [];
const pass = (label) => console.log('PASS: ' + label);
const check = (label, condition, detail = '') => {
  if (condition) pass(label);
  else { failures.push(label + (detail ? ' — ' + detail : '')); console.log('FAIL: ' + label + (detail ? ' — ' + detail : '')); }
};
const warn = (text) => console.log('WARN: ' + text);

function parseHeaders(text) {
  const headers = {};
  const re = /^\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let match;
  while ((match = re.exec(text))) headers[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return headers;
}
const splitGames = (text) => text.split(/(?=^\[Event\s+")/m).filter((chunk) => /^\[Event\s+"/m.test(chunk));
const isAccount = (value) => String(value || '').trim().toLowerCase() === ACCOUNT;
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const profile = JSON.parse(await readFile(profilePath, 'utf8'));
const index = JSON.parse(await readFile(indexPath, 'utf8'));

// 1. Manifest entry matches the runtime profile; exactly one entry for the bot.
const entries = index.filter((entry) => entry.id === profile.id);
check('index has exactly one entry for ' + profile.id, entries.length === 1, 'found ' + entries.length);
check('index entry equals the runtime profile', entries.length === 1 && sameJson(entries[0], profile));
const runtimePath = join(dirname(profilePath), profile.id + '.json');
const runtimeOk = await readFile(runtimePath, 'utf8').then((text) => sameJson(JSON.parse(text), profile), () => false);
check('runtime file ' + runtimePath + ' equals the profile', runtimeOk);
console.log('INFO: index entries = ' + index.length);

// 2. Collateral: other entries unchanged versus the base manifest, when provided.
if (baseIndexPath) {
  const base = JSON.parse(await readFile(baseIndexPath, 'utf8'));
  const others = (list) => list.filter((entry) => entry.id !== profile.id);
  check('other index entries unchanged versus base index', sameJson(others(index), others(base)));
  check('index grew by exactly one entry versus base', index.length === base.length + (base.some((e) => e.id === profile.id) ? 0 : 1));
}

// 3. Required schema fields and non-empty repertoire.
for (const key of REQUIRED) check('schema field ' + key, key in profile && profile[key] !== undefined && profile[key] !== null && profile[key] !== '');
check('quips have at least 3 non-empty lines', Array.isArray(profile.quips) && profile.quips.length >= 3 && profile.quips.every((line) => typeof line === 'string' && line.trim()));
check('gambits, openingsAsWhite and openingsAsBlack are non-empty arrays', ['openingsAsWhite', 'openingsAsBlack', 'gambits'].every((key) => Array.isArray(profile[key]) && profile[key].length > 0));
const legalLine = (movesText) => {
  const game = new Chess();
  const tokens = movesText.split(/\s+/).map((token) => token.replace(/^\d+\.+/, '')).filter((token) => token);
  return tokens.every((san) => game.move(san, { sloppy: true }));
};
const lines = [...profile.openingsAsWhite, ...profile.openingsAsBlack, ...profile.gambits];
check('every repertoire line is legal from the start position', lines.every((line) => typeof line.moves === 'string' && legalLine(line.moves)), lines.filter((line) => !legalLine(line.moves)).map((line) => line.name).slice(0, 3).join(' | '));
check('at least 8 distinct lines for each colour', profile.openingsAsWhite.length >= 8 && profile.openingsAsBlack.length >= 8);

// 4. Identity decisions (owner B2/B4) and the no-sourceFile rule.
check('id and slug are orenzbit', profile.id === 'orenzbit' && profile.slug === 'orenzbit');
check('display name is אורן', profile.name === 'אורן');
const others = index.filter((entry) => entry.id !== profile.id);
const measured = profile.measuredOwnEloMedian;
check('measured own-Elo median recorded as 200', measured === 200, String(measured));
const takenElo = new Set(others.map((entry) => entry.elo));
let expectedElo = null;
for (let d = 0; d <= 3900 && expectedElo === null; d += 1) {
  for (const c of d === 0 ? [measured] : [measured + d, measured - d]) if (expectedElo === null && c >= 100 && c <= 4000 && !takenElo.has(c)) expectedElo = c;
}
check('Elo is the nearest unused integer to the measured median (recomputed from index)', profile.elo === expectedElo, `expected ${expectedElo}, profile ${profile.elo}`);
check('Elo is unique in the manifest', others.every((entry) => entry.elo !== profile.elo));
check('eloAdjustment records measured median and assigned Elo', profile.eloAdjustment?.measuredMedian === 200 && profile.eloAdjustment?.assignedElo === profile.elo && typeof profile.eloAdjustment?.reason === 'string');
const donor = [...others].sort((a, b) => Math.abs(a.elo - measured) - Math.abs(b.elo - measured) || a.elo - b.elo || a.id.localeCompare(b.id))[0];
check('copiedFrom is the regular bot with the closest Elo to the measured median', profile.copiedFrom === donor.id, `donor ${donor.id}`);
check('quips are copied verbatim from the donor bot', sameJson(profile.quips, donor.quips));
check('tier, stage and piece are copied from the donor bot', ['tier', 'stage', 'piece'].every((key) => profile[key] === donor[key]));
check('region is the factual label אונליין', profile.region === 'אונליין');
const eraYears = [...(profile.sourceYearRange || '').matchAll(/\d{4}/g)].map((m) => m[0]);
const expectedEra = eraYears.length && eraYears[0] !== eraYears[eraYears.length - 1] ? eraYears[0] + '–' + eraYears[eraYears.length - 1] : eraYears[0];
check('era is the year span of the usable games', profile.era === expectedEra && expectedEra === '2025–2026', `expected ${expectedEra}, profile ${profile.era}`);
check('region and era are unique in the manifest', others.every((entry) => entry.region !== profile.region && entry.era !== profile.era));
check('style is universal with label אוניברסלי', profile.style === 'universal' && profile.styleLabel === 'אוניברסלי');
check('profile has no sourceFile (keeps check-historical-holdout out of scope)', !('sourceFile' in profile));
check('gambits are derived from training games (names show the source)', profile.gambits.every((line) => /משחקי המקור/.test(line.name)));

// 5. Split bookkeeping and leakage between examples and holdout.
check('training + holdout equals sourceGameCount', profile.trainingGameCount + profile.holdoutGameCount === profile.sourceGameCount, `${profile.trainingGameCount}+${profile.holdoutGameCount} vs ${profile.sourceGameCount}`);
check('holdoutGameKeys length equals holdoutGameCount', Array.isArray(profile.holdoutGameKeys) && profile.holdoutGameKeys.length === profile.holdoutGameCount);
const holdoutSet = new Set(profile.holdoutGameKeys);
check('holdout game keys are unique', holdoutSet.size === profile.holdoutGameKeys.length);
check('between 8 and 24 held-out positions', profile.holdoutPositions.length >= 8 && profile.holdoutPositions.length <= 24);
check('held-out positions come only from holdout games', profile.holdoutPositions.every((p) => holdoutSet.has(p.gameId)));
check('example games are training-only and not holdout games', profile.exampleGames.every((g) => g.split === 'training' && !holdoutSet.has(g.gameId)));

// 6. Recompute the holdout set from the PGN files (chunk rule only; no training replay needed).
const names = (await readdir(pgnDir)).filter((name) => CANONICAL.test(name)).sort();
const holdoutFromPgn = [];
const opponentNames = new Set();
const seenLinks = new Set();
for (const name of names) {
  const text = await readFile(join(pgnDir, name), 'utf8');
  splitGames(text).forEach((chunk, chunkIdx) => {
    const headers = parseHeaders(chunk);
    if (!headers.Link || seenLinks.has(headers.Link)) return;
    seenLinks.add(headers.Link);
    const opponent = isAccount(headers.White) ? headers.Black : isAccount(headers.Black) ? headers.White : null;
    if (opponent) opponentNames.add(opponent);
    if (chunkIdx % 10 !== 0) return;
    if (isAccount(headers.White) === isAccount(headers.Black)) return;
    let moves;
    try { const game = new Chess(); game.loadPgn(chunk, { sloppy: true }); moves = game.history({ verbose: true }); } catch { return; }
    if (moves.length >= 8) holdoutFromPgn.push(headers.Link);
  });
}
check('holdout keys recomputed from PGN equal holdoutGameKeys (same order)', sameJson(holdoutFromPgn, profile.holdoutGameKeys), `pgn=${holdoutFromPgn.length} profile=${profile.holdoutGameKeys.length}`);

// 7. Held-out positions are legal and the stored move matches the stored SAN.
let positionFailures = [];
for (const p of profile.holdoutPositions) {
  try {
    const game = new Chess(p.fen);
    const move = game.move({ from: p.sourceMove.slice(0, 2), to: p.sourceMove.slice(2, 4), promotion: p.sourceMove.slice(4) || undefined });
    if (!move || move.san !== p.sourceSan) positionFailures.push(p.gameId + ' ply ' + p.ply);
  } catch { positionFailures.push(p.gameId + ' ply ' + p.ply + ' (invalid FEN)'); }
}
check('every held-out position replays to its stored move', positionFailures.length === 0, positionFailures.slice(0, 3).join(' | '));

// 8. Privacy: no opponent username from the PGN headers appears in the profile text.
const profileText = JSON.stringify(profile).toLowerCase();
const leaked = [...opponentNames].filter((name) => name.length >= 4 && profileText.includes(name.toLowerCase()));
check('no opponent username appears in the profile', leaked.length === 0, leaked.slice(0, 3).join(', '));

// 9. Identity collisions with other manifest entries (informational; the owner accepted copied values).
for (const other of index.filter((entry) => entry.id !== profile.id)) {
  const same = ['elo', 'region', 'era', 'name'].filter((key) => other[key] === profile[key]);
  if (same.length) warn('same ' + same.join('/') + ' as ' + other.id + ' (copied per owner decision)');
}

// 10. Source digest bookkeeping: same construction as the builder (name + file SHA-256, joined by newlines).
const digestLines = [];
for (const name of names) digestLines.push(name + ' ' + createHash('sha256').update(await readFile(join(pgnDir, name))).digest('hex'));
check('sourceSetSha256 matches the canonical PGN files present', profile.sourceSetSha256 === createHash('sha256').update(digestLines.join('\n')).digest('hex'));

if (failures.length) {
  console.log('FAILED: ' + failures.length + ' check(s).');
  process.exit(1);
}
console.log('PASS: Oren bot profile validated (' + profile.id + ', ' + profile.sourceGameCount + ' usable games, ' + profile.holdoutGameCount + ' holdout).');
