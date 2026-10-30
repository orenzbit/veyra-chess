// Veyra puzzle tactics — TS port (src/puzzle-tactics.ts).
import { sqToRC, rcToSq, inBoard, kingSquare, countPieces, parseFEN, validUCI } from './board.js';
import type { Grid } from './board.js';
import { applyUCIMove } from './moves.js';

const KNIGHT = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
const STRAIGHT = [[1,0],[-1,0],[0,1],[0,-1]];
const DIAG = [[1,1],[1,-1],[-1,1],[-1,-1]];
export type Motif = 'missed_mate'|'hanging_piece'|'king_safety'|'opening'|'endgame'|'time_pressure'|'general';

export function isAttacked(grid: Grid, sq: string, by: string): boolean {
  const { r, f } = sqToRC(sq);
  const P = by==='w'?'P':'p', N = by==='w'?'N':'n', K = by==='w'?'K':'k';
  const B = by==='w'?'B':'b', R = by==='w'?'R':'r', Q = by==='w'?'Q':'q';
  const pr = by==='w' ? r+1 : r-1;
  for (const df of [-1,1]) if (inBoard(pr,f+df) && grid[pr][f+df]===P) return true;
  for (const s of KNIGHT) if (inBoard(r+s[0],f+s[1]) && grid[r+s[0]][f+s[1]]===N) return true;
  for (let dr=-1;dr<=1;dr++) for (let df=-1;df<=1;df++) {
    if(!dr&&!df) continue;
    if (inBoard(r+dr,f+df) && grid[r+dr][f+df]===K) return true;
  }
  for (const s of STRAIGHT) {
    let rr=r+s[0], ff=f+s[1];
    while (inBoard(rr,ff)) { const c=grid[rr][ff]; if(c){ if(c===R||c===Q) return true; break; } rr+=s[0]; ff+=s[1]; }
  }
  for (const s of DIAG) {
    let rr=r+s[0], ff=f+s[1];
    while (inBoard(rr,ff)) { const c=grid[rr][ff]; if(c){ if(c===B||c===Q) return true; break; } rr+=s[0]; ff+=s[1]; }
  }
  return false;
}

export function moveGivesCheck(fen: string, uci: string, turn: string): boolean {
  const p = parseFEN(fen);
  if (!p.ok || !p.grid) throw new Error('bad fen');
  if (p.turn !== turn) throw new Error('wrong side to move');
  const res = applyUCIMove(p.grid, uci, turn);
  const opp = turn==='w'?'b':'w';
  const ks = kingSquare(res.grid, opp);
  if (!ks) return false;
  return isAttacked(res.grid, ks, turn);
}

// Castling and en passant are not supported by moveIsCheckmate; those moves are never reported as mate here.
function safeMate(fen: string, uci: string, turn: string): boolean {
  try { return moveIsCheckmate(fen, uci, turn); } catch { return false; }
}

export function moveIsCheckmate(fen: string, uci: string, turn: string): boolean {
  const parsed = parseFEN(fen);
  if (!parsed.ok || !parsed.grid || !parsed.turn) throw new Error('bad fen: ' + parsed.error);
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

export function phaseOfPly(ply: number): string {
  const n = Number(ply)||0;
  if (n<=16) return 'opening';
  if (n<=50) return 'middlegame';
  return 'endgame';
}

export function classifyMotif(info: { fen: string; bestUci: string; severity: number; ply: number; clocksSec?: number|null }): Motif {
  const turn = String(info.fen).split(/\s+/)[1]==='b'?'b':'w';
  if (info.severity>=0.35 && safeMate(info.fen, info.bestUci, turn)) return 'missed_mate';
  if (info.clocksSec!=null && Number(info.clocksSec)<10) return 'time_pressure';
  const p = parseFEN(info.fen);
  if (p.ok && p.grid && countPieces(p.grid)<=7) return 'endgame';
  if (Number(info.ply)<=16) return 'opening';
  return 'general';
}

export function seedRating(drop: number): number {
  const d = Math.max(0, Math.min(1, Number(drop)||0));
  return Math.max(400, Math.min(1500, Math.round(400 + d*2000)));
}
