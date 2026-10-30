// Validates data/puzzle-seed.json: FEN well-formed, each solution step
// pseudo-legal, record ids unique, schema intact. Exit 1 on any failure.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorFEN, mirrorUCI, parseFEN } from '../src/puzzle-board.mjs';
import { applyUCIMove } from '../src/puzzle-moves.mjs';
import { hashPuzzleId } from '../src/puzzle-repo.mjs';
import { inCheck, isCheckmate, legalMoves } from '../src/puzzle-legal.mjs';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const castlingMirror = mirrorFEN('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
if (castlingMirror !== '4k2r/8/8/8/8/8/8/4K3 b k - 0 1') {
  throw new Error('castling rights were not mirrored by color and canonically ordered');
}

const raw = await readFile(join(projectRoot, 'data', 'puzzle-seed.json'), 'utf8');
const doc = JSON.parse(raw);
if (doc.version !== 1 || !Array.isArray(doc.puzzles) || doc.count !== doc.puzzles.length) {
  throw new Error('bad seed envelope or count');
}
const seen = new Set();
let mates = 0, hang = 0, gen = 0, end = 0, altMates = 0;
for (const p of doc.puzzles) {
  if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || seen.has(p.id)) {
    throw new Error('invalid or duplicate puzzle id: ' + (p && p.id));
  }
  if (!Array.isArray(p.solution) || p.solution.length === 0) {
    throw new Error('empty or invalid solution for ' + p.id);
  }
  seen.add(p.id);
  const expect = hashPuzzleId(p.fen, p.solution);
  if (expect !== p.id) throw new Error('id mismatch for ' + p.fen);
  const parsed = parseFEN(p.fen);
  if (!parsed.ok) throw new Error('bad FEN ' + p.fen + ' : ' + parsed.error);
  let grid = parsed.grid;
  let turn = parsed.turn;
  if (inCheck(grid, turn === 'w' ? 'b' : 'w')) throw new Error('illegal position: side not to move is in check ' + p.id);
  // The app accepts any checkmate, so every mating first move must be declared in accepted.
  if (!Array.isArray(p.accepted) || !p.accepted.includes(p.solution[0])) throw new Error('accepted must include the stored solution move ' + p.id);
  const legal = new Set(legalMoves(grid, turn));
  if (p.accepted.some((uci) => !legal.has(uci))) throw new Error('accepted move is not legal in ' + p.id);
  const opponent = turn === 'w' ? 'b' : 'w';
  for (const uci of legal) {
    if (isCheckmate(applyUCIMove(grid, uci, turn).grid, opponent) && !p.accepted.includes(uci)) {
      throw new Error('undeclared alternative mate ' + uci + ' in ' + p.id);
    }
  }
  if (p.accepted.length > 1) altMates++;
  for (const step of p.solution) {
    const res = applyUCIMove(grid, step, turn);
    grid = res.grid;
    if (inCheck(grid, turn)) throw new Error('illegal move leaves own king in check: ' + step + ' in ' + p.id);
    turn = turn === 'w' ? 'b' : 'w';
  }
  if (p.motif === 'missed_mate' && !isCheckmate(grid, turn)) {
    throw new Error('missed_mate solution is not checkmate: ' + p.id);
  }
  if (!['missed_mate', 'hanging_piece', 'king_safety', 'opening', 'endgame', 'time_pressure', 'general'].includes(p.motif)
    || typeof p.rating !== 'number' || !Number.isFinite(p.rating)) {
    throw new Error('bad meta ' + p.id);
  }
  if (p.motif === 'missed_mate') mates++;
  else if (p.motif === 'hanging_piece') hang++;
  else if (p.motif === 'endgame') end++;
  else gen++;
}
const seeds = doc.puzzles.filter((p) => p.source && p.source.kind === 'seed');
const mirrors = doc.puzzles.filter((p) => p.source && p.source.kind === 'mirror');
const mirrorsByFen = new Map(mirrors.map((p) => [p.fen, p]));
if (seeds.length !== mirrors.length || mirrorsByFen.size !== mirrors.length) {
  throw new Error('seed/mirror records are missing or duplicated');
}
for (const seed of seeds) {
  const mirror = mirrorsByFen.get(mirrorFEN(seed.fen));
  if (!mirror) throw new Error('missing mirror for ' + seed.fen);
  const expected = seed.solution.map(mirrorUCI);
  if (JSON.stringify(mirror.solution) !== JSON.stringify(expected)) {
    throw new Error('incorrect mirrored solution for ' + seed.fen);
  }
}
if (doc.puzzles.length !== 24) throw new Error('expected 24 records, got ' + doc.puzzles.length);
console.log('PASS: 24 records, ids unique, all solutions legal (king safety enforced), mates verified.');
console.log('PASS: each mirror matches its seed position and solution.');
console.log('PASS: accepted lists hold the stored move and every mating first move (' + altMates + ' records with more than one accepted move).');
console.log('motifs: mate=' + mates + ' hanging=' + hang + ' endgame=' + end + ' general=' + gen);
