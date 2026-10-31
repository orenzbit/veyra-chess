// Blindfold training: how a game ends by player action (resign, draw offer, abort) and what the
// review PGN records. Pure functions so they can be tested without a browser.

export type ManualEndKind = 'resign' | 'draw' | 'abort';
export interface GameEnd { kind: ManualEndKind | 'natural'; text: string; pgnResult: '1-0' | '0-1' | '1/2-1/2' | '*'; termination: string }

const POINTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material of `color` minus the opponent's, in pawns, from the board field of a FEN. */
export function materialBalance(fen: string, color: 'w' | 'b'): number {
  const board = String(fen || '').split(' ')[0] || '';
  let white = 0;
  let black = 0;
  for (const ch of board) {
    const value = POINTS[ch.toLowerCase()];
    if (value === undefined) continue;
    if (ch === ch.toUpperCase()) white += value; else black += value;
  }
  return color === 'w' ? white - black : black - white;
}

/** The bot accepts a draw offer unless it is ahead by more than this much material (in pawns). */
export const DRAW_ACCEPT_MAX_LEAD = 1;

export function botAcceptsDraw(fen: string, botColor: 'w' | 'b'): boolean {
  return materialBalance(fen, botColor) <= DRAW_ACCEPT_MAX_LEAD;
}

export function manualGameEnd(kind: ManualEndKind, playerColor: 'w' | 'b'): GameEnd {
  if (kind === 'resign') {
    return playerColor === 'w'
      ? { kind, text: 'שחור ניצח בכניעה', pgnResult: '0-1', termination: 'White resigned' }
      : { kind, text: 'לבן ניצח בכניעה', pgnResult: '1-0', termination: 'Black resigned' };
  }
  if (kind === 'draw') return { kind, text: 'תיקו בהסכמה', pgnResult: '1/2-1/2', termination: 'Draw by agreement' };
  return { kind, text: 'המשחק בוטל — ללא תוצאה', pgnResult: '*', termination: 'Aborted' };
}

/** Result of a game that ended on the board (mate, stalemate, draw rules), or null if it is still on. */
export function naturalGameEnd(game: any): GameEnd | null {
  if (game.isCheckmate()) {
    return game.turn() === 'w'
      ? { kind: 'natural', text: 'שחור ניצח במט', pgnResult: '0-1', termination: 'Checkmate' }
      : { kind: 'natural', text: 'לבן ניצח במט', pgnResult: '1-0', termination: 'Checkmate' };
  }
  if (game.isStalemate()) return { kind: 'natural', text: 'תיקו — פט', pgnResult: '1/2-1/2', termination: 'Stalemate' };
  if (game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return { kind: 'natural', text: 'תיקו', pgnResult: '1/2-1/2', termination: 'Draw' };
  return null;
}

/** Rows for the two-column move table: one row per move number, oldest first. */
export function moveRows(sans: string[]): Array<{ number: number; white: string; black: string | null }> {
  const rows: Array<{ number: number; white: string; black: string | null }> = [];
  for (let i = 0; i < sans.length; i += 2) rows.push({ number: i / 2 + 1, white: sans[i], black: i + 1 < sans.length ? sans[i + 1] : null });
  return rows;
}

/** PGN for the regular review: the played moves plus player names, result and how the game ended. */
export function blindfoldReviewPgn(ChessCtor: any, sans: string[], options: { playerColor: 'w' | 'b'; botName: string; end: GameEnd | null }): string {
  const copy = new ChessCtor();
  for (const san of sans) copy.move(san);
  const you = 'You';
  const botName = String(options.botName || 'Bot').replace(/"/g, "'");
  copy.header(
    'Event', 'Veyra blindfold training',
    'White', options.playerColor === 'w' ? you : botName,
    'Black', options.playerColor === 'b' ? you : botName,
    'Result', options.end ? options.end.pgnResult : '*',
  );
  if (options.end) copy.header('Termination', options.end.termination);
  return copy.pgn();
}
