// Veyra puzzle tactics — attack detection + motif classification.
// Original MIT code, zero dependencies. Pure ESM (browser + Node).
import { sqToRC, rcToSq, inBoard, kingSquare, countPieces, parseFEN, validUCI } from './puzzle-board.mjs';
import { applyUCIMove } from './puzzle-moves.mjs';

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const STRAIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

export function isAttacked(grid, sq, by) {
  const pos = sqToRC(sq);
  const r = pos.r, f = pos.f;
  const P = by === 'w' ? 'P' : 'p';
  const N = by === 'w' ? 'N' : 'n';
  const K = by === 'w' ? 'K' : 'k';
  const B = by === 'w' ? 'B' : 'b';
  const R = by === 'w' ? 'R' : 'r';
  const Q = by === 'w' ? 'Q' : 'q';
  const pr = by === 'w' ? r + 1 : r - 1;
  for (const df of [-1, 1]) {
    if (inBoard(pr, f + df) && grid[pr][f + df] === P) return true;
  }
  for (const step of KNIGHT) {
    if (inBoard(r + step[0], f + step[1]) && grid[r + step[0]][f + step[1]] === N) return true;
  }
  for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) {
    if (!dr && !df) continue;
    if (inBoard(r + dr, f + df) && grid[r + dr][f + df] === K) return true;
  }
  for (const step of STRAIGHT) {
    let rr = r + step[0], ff = f + step[1];
    while (inBoard(rr, ff)) {
      const c = grid[rr][ff];
      if (c) { if (c === R || c === Q) return true; break; }
      rr += step[0]; ff += step[1];
    }
  }
  for (const step of DIAG) {
    let rr = r + step[0], ff = f + step[1];
    while (inBoard(rr, ff)) {
      const c = grid[rr][ff];
      if (c) { if (c === B || c === Q) return true; break; }
      rr += step[0]; ff += step[1];
    }
  }
  return false;
}

export function moveGivesCheck(fen, uci, turn) {
  const p = parseFEN(fen);
  if (!p.ok) throw new Error('bad fen: ' + p.error);
  if (p.turn !== turn) throw new Error('wrong side to move');
  const res = applyUCIMove(p.grid, uci, turn);
  const opp = turn === 'w' ? 'b' : 'w';
  const ks = kingSquare(res.grid, opp);
  if (!ks) return false;
  return isAttacked(res.grid, ks, turn);
}

export function moveIsCheckmate(fen, uci, turn) {
  const parsed = parseFEN(fen);
  if (!parsed.ok) throw new Error('bad fen: ' + parsed.error);
  if (parsed.turn !== turn) throw new Error('wrong side to move');
  if (!validUCI(uci)) throw new Error('bad UCI: ' + uci);

  const from = sqToRC(uci.slice(0, 2));
  const to = sqToRC(uci.slice(2, 4));
  const movingPiece = parsed.grid[from.r][from.f];
  if (!movingPiece) throw new Error('empty source ' + uci.slice(0, 2));
  if (movingPiece.toLowerCase() === 'p' && Math.abs(to.r - from.r) === 2) return false;

  const result = applyUCIMove(parsed.grid, uci, turn);
  const opponent = turn === 'w' ? 'b' : 'w';
  const opponentKing = kingSquare(result.grid, opponent);
  const ownKing = kingSquare(result.grid, turn);
  if (!opponentKing || !ownKing
    || !isAttacked(result.grid, opponentKing, turn)
    || isAttacked(result.grid, ownKing, opponent)) return false;

  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromFile = 0; fromFile < 8; fromFile++) {
      const piece = result.grid[fromRow][fromFile];
      if (!piece || (piece === piece.toUpperCase()) !== (opponent === 'w')) continue;
      for (let toRow = 0; toRow < 8; toRow++) {
        for (let toFile = 0; toFile < 8; toFile++) {
          const target = result.grid[toRow][toFile];
          if (target && target.toLowerCase() === 'k') continue;
          const promotes = piece.toLowerCase() === 'p' && toRow === (opponent === 'w' ? 0 : 7);
          const promotions = promotes ? ['q', 'r', 'b', 'n'] : [''];
          const reply = rcToSq(fromRow, fromFile) + rcToSq(toRow, toFile);
          for (const promotion of promotions) {
            try {
              const response = applyUCIMove(result.grid, reply + promotion, opponent);
              const king = kingSquare(response.grid, opponent);
              if (king && !isAttacked(response.grid, king, turn)) return false;
            } catch (error) {
              if (!(error instanceof Error)) throw error;
            }
          }
        }
      }
    }
  }
  return true;
}

export function phaseOfPly(ply) {
  const n = Number(ply) || 0;
  if (n <= 16) return 'opening';
  if (n <= 50) return 'middlegame';
  return 'endgame';
}

// Heuristic motif classifier (v1). 'hanging_piece' is reserved for
// hand-authored seed records; harvested records use the rules below.
export function classifyMotif(info) {
  const fen = info.fen, bestUci = info.bestUci;
  const severity = Number(info.severity) || 0;
  const ply = Number(info.ply) || 0;
  const clocksSec = info.clocksSec == null ? null : Number(info.clocksSec);
  const turn = String(fen).split(/\s+/)[1] === 'b' ? 'b' : 'w';
  if (severity >= 0.35 && moveIsCheckmate(fen, bestUci, turn)) return 'missed_mate';
  if (clocksSec != null && clocksSec < 10) return 'time_pressure';
  const p = parseFEN(fen);
  if (p.ok && countPieces(p.grid) <= 7) return 'endgame';
  if (ply <= 16) return 'opening';
  return 'general';
}

export function seedRating(drop) {
  const d = Math.max(0, Math.min(1, Number(drop) || 0));
  return Math.max(400, Math.min(1500, Math.round(400 + d * 2000)));
}
