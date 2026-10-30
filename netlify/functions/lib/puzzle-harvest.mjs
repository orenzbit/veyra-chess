// Puzzle extraction from one game: find the user's mistakes with the engine and turn them into puzzles.
// Pure: the engine is injected ({ search(fen, budget) -> { uci, score, depth } }), no network, no database.
// Scores are centipawns from WHITE's point of view (engine convention).
import { Chess } from '../../../rules-src/chess-compat.mjs';
import { hashPuzzleId } from '../../../src/puzzle-repo.mjs';
import {
  AFTER_WIN_MAX, ALT_CP, BEST_WIN_MIN, BLUNDER, BOOK_PLIES, CANDIDATES_STAGE2, DROP_MIN, MATE_CP,
  ALT_VERIFY, MATE_RESCREEN, MAX_PER_GAME, MAX_PLIES, MIN_GAME_PLIES, SCREEN, STAGE1, STAGE2, ambiguousLimit,
} from './puzzle-config.mjs';

export const cpToWin = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
const moverPov = (win, turn) => (turn === 'w' ? win : 100 - win);
const turnOf = (fen) => (String(fen).split(' ')[1] === 'b' ? 'b' : 'w');
const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export function seedRating(drop) {
  const d = Math.max(0, Math.min(1, Number(drop) || 0));
  return Math.max(400, Math.min(1500, Math.round(400 + d * 2000)));
}

export function positionKey(fen) { return String(fen).split(' ').slice(0, 4).join(' '); }

/** Sum of piece values for each colour (kings excluded). */
export function materialOf(fen) {
  const sums = { w: 0, b: 0, nonPawnTotal: 0, pieces: 0 };
  for (const ch of String(fen).split(' ')[0]) {
    const lower = ch.toLowerCase();
    if (!VALUES[lower]) { if (lower === 'k') sums.pieces += 1; continue; }
    sums[ch === lower ? 'b' : 'w'] += VALUES[lower];
    sums.pieces += 1;
    if (lower !== 'p') sums.nonPawnTotal += VALUES[lower];
  }
  return sums;
}

export function phaseOf(fen, moveNumber) {
  if (materialOf(fen).nonPawnTotal <= 16) return 'endgame';
  return moveNumber <= 12 ? 'opening' : 'middlegame';
}

export function legalUci(fen) {
  return new Chess(fen).moves({ verbose: true }).map((m) => m.lan);
}

function afterFen(fen, uci) {
  const g = new Chess(fen);
  g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return { chess: g, fen: g.fen() };
}

/** Score of `uci` from the mover's point of view, in centipawns, using a shallow search. */
function moveCp(fen, uci, engine, budget) {
  const mover = turnOf(fen);
  const { chess, fen: next } = afterFen(fen, uci);
  if (chess.isCheckmate()) return { cp: MATE_CP + 99999, mate: true };
  if (chess.isGameOver()) return { cp: 0, mate: false };
  const r = engine.search(next, budget);
  const cp = mover === 'w' ? r.score : -r.score;
  return { cp, mate: cp >= MATE_CP };
}

/**
 * Which first moves also count as correct. See plan appendix D.
 * Returns { accepted:[uci], ambiguous:boolean, legalMoves:n }.
 */
export function screenAccepted(fen, solution, engine, budget = SCREEN) {
  const legal = legalUci(fen);
  const scored = legal.map((uci) => ({ uci, ...moveCp(fen, uci, engine, budget) }));
  const sol = scored.find((s) => s.uci === solution);
  let accepted;
  const bestCp = Math.max(...scored.map((s) => s.cp));
  if (bestCp >= MATE_CP || (sol && sol.mate)) {
    // A shallow search misses the longer mates, which would reject a valid mating move. Mate puzzles are rare,
    // so re-scan every move deeper and keep the union.
    const mating = new Set(scored.filter((s) => s.cp >= MATE_CP).map((s) => s.uci));
    for (const uci of legal) {
      if (!mating.has(uci) && moveCp(fen, uci, engine, MATE_RESCREEN).cp >= MATE_CP) mating.add(uci);
    }
    accepted = legal.filter((uci) => mating.has(uci));
  } else {
    accepted = scored.filter((s) => s.cp >= bestCp - ALT_CP).map((s) => s.uci);
    // A move that looks equal in a shallow search can lose to a tactic one move deeper. Every alternative is
    // therefore re-scored as deep as the puzzle itself and must still be within ALT_CP of the solution.
    if (accepted.some((u) => u !== solution)) {
      const solCp = moveCp(fen, solution, engine, ALT_VERIFY).cp;
      accepted = accepted.filter((u) => u === solution || moveCp(fen, u, engine, ALT_VERIFY).cp >= solCp - ALT_CP);
    }
  }
  if (!accepted.includes(solution)) accepted.unshift(solution);
  return { accepted, ambiguous: accepted.length > ambiguousLimit(legal.length), legalMoves: legal.length };
}

/**
 * Motif classifier V2 (search based). First match wins:
 * missed_mate, king_safety, hanging_piece, time_pressure, endgame, opening, general.
 */
export function classifyMotifV2({ fenBefore, bestUci, playedUci, bestScoreMover, replyUci, replyScoreMover, clockSec, moveNumber }) {
  const mover = turnOf(fenBefore);
  const best = afterFen(fenBefore, bestUci);
  if (best.chess.isCheckmate() || bestScoreMover >= MATE_CP) return 'missed_mate';
  const played = afterFen(fenBefore, playedUci);
  let replyMates = false;
  let materialSwing = 0;
  if (!played.chess.isGameOver() && replyUci) {
    const reply = afterFen(played.fen, replyUci);
    replyMates = reply.chess.isCheckmate();
    const before = materialOf(fenBefore);
    const after = materialOf(reply.fen);
    const net = (m) => m[mover] - m[mover === 'w' ? 'b' : 'w'];
    materialSwing = net(after) - net(before);
  }
  if (replyMates || replyScoreMover <= -MATE_CP) return 'king_safety';
  if (materialSwing <= -3) return 'hanging_piece';
  if (Number.isFinite(clockSec) && clockSec < 10) return 'time_pressure';
  if (materialOf(fenBefore).pieces < 8) return 'endgame';
  if (moveNumber <= 8) return 'opening';
  return 'general';
}

/** Search result of the position after a move; terminal positions are scored without the engine. */
function afterResult(fenAfter, mover, engine, budget) {
  const g = new Chess(fenAfter);
  if (g.isCheckmate()) return { uci: null, score: mover === 'w' ? MATE_CP : -MATE_CP };
  if (g.isGameOver()) return { uci: null, score: 0 };
  const r = engine.search(fenAfter, budget);
  return { uci: r.uci, score: r.score };
}

const toMover = (score, turn) => (turn === 'w' ? score : -score);
const dropOf = (bestScore, afterScore, turn) => {
  const bestWin = moverPov(cpToWin(bestScore), turn);
  const afterWin = moverPov(cpToWin(afterScore), turn);
  return { bestWin, afterWin, drop: Math.max(0, (bestWin - afterWin) / 100) };
};

/**
 * Analyse one game for one user.
 * game: { key, provider, url, pgn, date, opponent, timeClass, userColor, variant, headers }
 * clocks: seconds left after each ply (optional, [] when unknown)
 * options: { shouldStop() } - lets the job runner stop between plies when its time budget is gone.
 * Returns { puzzles, log:{ skipReason, pliesScanned, candidates, searches, droppedAmbiguous } }.
 */
export function scanGame(game, engine, options = {}) {
  const log = { skipReason: null, pliesScanned: 0, candidates: 0, searches: 0, droppedAmbiguous: 0, stopped: false };
  const countedEngine = { search: (fen, budget) => { log.searches += 1; return engine.search(fen, budget); } };
  const skip = (reason) => { log.skipReason = reason; return { puzzles: [], log }; };
  if (game.variant && game.variant !== 'Standard') return skip('variant');
  if (game.headers && (game.headers.SetUp === '1' || game.headers.FEN)) return skip('custom_start');
  if (game.userColor !== 'w' && game.userColor !== 'b') return skip('color_unresolved');
  let plies;
  const chess = new Chess();
  try {
    chess.loadPgn(game.pgn);
    plies = chess.history({ verbose: true });
  } catch {
    return skip('bad_pgn');
  }
  if (plies.length < MIN_GAME_PLIES) return skip('too_short');
  const clocks = Array.isArray(game.clocks) ? game.clocks : [];
  const stop = options.shouldStop || (() => false);

  const candidates = [];
  for (let i = BOOK_PLIES; i < Math.min(plies.length, MAX_PLIES); i += 1) {
    const p = plies[i];
    if (p.color !== game.userColor) continue;
    if (stop()) { log.stopped = true; break; }
    const fenBefore = p.before;
    const fenAfter = p.after;
    const playedUci = p.lan;
    if (legalUci(fenBefore).length === 1) continue;
    log.pliesScanned += 1;
    const b = countedEngine.search(fenBefore, STAGE1);
    if (!b.uci || b.uci === playedUci) continue;
    const a = afterResult(fenAfter, p.color, countedEngine, STAGE1);
    const { bestWin, afterWin, drop } = dropOf(b.score, a.score, p.color);
    if (drop < DROP_MIN || bestWin < BEST_WIN_MIN || afterWin >= AFTER_WIN_MAX) continue;
    candidates.push({ i, fenBefore, fenAfter, bestUci: b.uci, playedUci, drop });
  }
  log.candidates = candidates.length;

  const confirmed = [];
  candidates.sort((a, b) => b.drop - a.drop);
  for (const c of candidates.slice(0, CANDIDATES_STAGE2)) {
    if (stop()) { log.stopped = true; break; }
    const b2 = countedEngine.search(c.fenBefore, STAGE2);
    if (b2.uci !== c.bestUci) continue;
    const turn = turnOf(c.fenBefore);
    const a2 = afterResult(c.fenAfter, turn, countedEngine, STAGE2);
    const { drop } = dropOf(b2.score, a2.score, turn);
    if (drop < DROP_MIN) continue;
    confirmed.push({ ...c, severity: drop, bestScore: b2.score, reply: a2 });
  }
  confirmed.sort((a, b) => b.severity - a.severity);

  const puzzles = [];
  const seenKeys = new Set();
  for (const c of confirmed.slice(0, MAX_PER_GAME)) {
    const key = positionKey(c.fenBefore);
    if (seenKeys.has(key)) continue;
    const screen = screenAccepted(c.fenBefore, c.bestUci, engine);
    log.searches += screen.legalMoves;
    if (screen.ambiguous) { log.droppedAmbiguous += 1; continue; }
    // If the move the user really played is among the accepted ones, calling it a mistake would be wrong.
    if (screen.accepted.includes(c.playedUci)) { log.droppedPlayedOk = (log.droppedPlayedOk || 0) + 1; continue; }
    const turn = turnOf(c.fenBefore);
    if (turn !== game.userColor) continue;
    const moveNumber = Math.floor(c.i / 2) + 1;
    const motif = classifyMotifV2({
      fenBefore: c.fenBefore, bestUci: c.bestUci, playedUci: c.playedUci,
      bestScoreMover: toMover(c.bestScore, turn), replyUci: c.reply.uci, replyScoreMover: toMover(c.reply.score, turn),
      clockSec: clocks.length === plies.length ? clocks[c.i] : NaN, moveNumber,
    });
    seenKeys.add(key);
    puzzles.push({
      puzzleId: hashPuzzleId(c.fenBefore, [c.bestUci]),
      fen: c.fenBefore, solution: [c.bestUci], accepted: screen.accepted, played: c.playedUci,
      motif, phase: phaseOf(c.fenBefore, moveNumber), class: c.severity >= BLUNDER ? 'blunder' : 'mistake',
      severity: Math.round(c.severity * 1000) / 1000, rating: seedRating(c.severity), origin: 'harvest',
      source: {
        gameKey: game.key, provider: game.provider, url: game.url || '', date: game.date || '',
        opponent: game.opponent || '', moveNumber, timeClass: game.timeClass || 'unknown', userColor: game.userColor,
      },
    });
  }
  return { puzzles, log };
}
