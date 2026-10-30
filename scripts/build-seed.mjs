// Builds data/puzzle-seed.json from 12 hand-authored white-to-move
// positions plus 12 programmatic color-flipped mirrors = 24 records.
// Every position below was hand-designed; the validator (check-puzzles)
// proves FEN + solution legality. No external puzzle source is used.
import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorFEN, mirrorUCI, parseFEN } from '../src/puzzle-board.mjs';
import { applyUCIMove } from '../src/puzzle-moves.mjs';
import { legalMoves, isCheckmate } from '../src/puzzle-legal.mjs';
import { hashPuzzleId, freshStats } from '../src/puzzle-repo.mjs';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const buildDate = new Date().toISOString().slice(0, 10);

const SEED12 = [
  { fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', solution: ['e1e8'], motif: 'missed_mate', rating: 700, note: 'back-rank rook' },
  { fen: '7k/5ppp/8/4Q3/8/8/5PPP/6K1 w - - 0 1', solution: ['e5e8'], motif: 'missed_mate', rating: 750, note: 'queen corridor' },
  { fen: '6k1/5ppp/8/8/8/8/5PPP/1R2R1K1 w - - 0 1', solution: ['e1e8'], motif: 'missed_mate', rating: 650, note: 'doubled rooks' },
  { fen: 'k7/8/2K5/1Q6/8/8/8/8 w - - 0 1', solution: ['b5b7'], motif: 'missed_mate', rating: 800, note: 'queen vs bare king' },
  { fen: 'k7/8/1K6/8/8/8/8/2R5 w - - 0 1', solution: ['c1c8'], motif: 'missed_mate', rating: 850, note: 'rook + king' },
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1', solution: ['h5f7'], motif: 'missed_mate', rating: 900, note: 'scholar pattern' },
  { fen: '4k3/8/8/3r4/8/3Q4/5PPP/5RK1 w - - 0 1', solution: ['d3d5'], motif: 'hanging_piece', rating: 800, note: 'free rook' },
  { fen: '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', solution: ['d5e7'], motif: 'general', rating: 950, note: 'knight fork K+R' },
  { fen: '5k2/5ppp/8/3q4/8/8/5PPP/3R2K1 w - - 0 1', solution: ['d1d5'], motif: 'hanging_piece', rating: 1000, note: 'queen forked by rook' },
  { fen: '2k5/4P3/8/8/8/8/5PPP/4K2R w - - 0 1', solution: ['e7e8q'], motif: 'endgame', rating: 900, note: 'promotion' },
  { fen: 'k7/4R3/2N5/8/8/8/5PPP/6K1 w - - 0 1', solution: ['e7a7'], motif: 'missed_mate', rating: 850, note: 'arabian mate' },
  { fen: '6rk/6pp/7N/8/8/8/5PPP/6K1 w - - 0 1', solution: ['h6f7'], motif: 'missed_mate', rating: 1100, note: 'smothered mate' },
];

// The app accepts any checkmate, so every first move that mates at once is declared here,
// next to the stored solution. check-seed.mjs requires the declared list to contain all of them.
function acceptedFirstMoves(fen, solution) {
  const parsed = parseFEN(fen);
  const opponent = parsed.turn === 'w' ? 'b' : 'w';
  const mates = legalMoves(parsed.grid, parsed.turn)
    .filter((uci) => isCheckmate(applyUCIMove(parsed.grid, uci, parsed.turn).grid, opponent));
  return [...new Set([solution[0], ...mates])];
}

function toRecord(s, kind) {
  const rec = {
    fen: s.fen,
    solution: s.solution.slice(),
    accepted: acceptedFirstMoves(s.fen, s.solution),
    played: '',
    source: { gameId: 'seed', ply: 0, date: buildDate, opponent: '', kind },
    motif: s.motif,
    severity: s.motif === 'missed_mate' ? 0.5 : 0.25,
    class: s.motif === 'missed_mate' ? 'blunder' : 'mistake',
    rating: s.rating,
    stats: freshStats(),
    createdAt: new Date().toISOString(),
    note: s.note,
  };
  rec.id = hashPuzzleId(rec.fen, rec.solution);
  return rec;
}

const puzzles = [];
for (const s of SEED12) {
  puzzles.push(toRecord(s, 'seed'));
  const m = {
    fen: mirrorFEN(s.fen),
    solution: s.solution.map(mirrorUCI),
    motif: s.motif, rating: s.rating, note: s.note + ' (mirror)',
  };
  puzzles.push(toRecord(m, 'mirror'));
}

const outputPath = join(projectRoot, 'data', 'puzzle-seed.json');
const temporaryPath = join(dirname(outputPath), '.puzzle-seed-' + randomUUID() + '.tmp');
await mkdir(dirname(outputPath), { recursive: true });
try {
  await writeFile(temporaryPath, JSON.stringify({
    version: 1,
    built: new Date().toISOString().slice(0, 10),
    count: puzzles.length,
    puzzles,
  }, null, 1), { flag: 'wx' });
  await rename(temporaryPath, outputPath);
} finally {
  try {
    await unlink(temporaryPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
console.log('seed built: ' + puzzles.length + ' puzzles (12 authored + 12 mirrors)');
