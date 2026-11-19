/** Existing review evaluations are White's winning chance in percent, not fractions. */
export function whiteEvaluation(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

/** Disconnected runs prevent missing evaluations from being filled or joined. */
export function evaluationSegments(values: Array<number | null>): Array<{ line: string; top: string; bottom: string }> {
  const count = values.length;
  const x = (i: number) => count <= 1 ? 50 : 2 + 96 * i / (count - 1);
  const y = (value: number) => 4 + 92 * (100 - value) / 100;
  const result: Array<{ line: string; top: string; bottom: string }> = [];
  let points: Array<{ x: number; y: number }> = [];
  const finish = () => {
    if (!points.length) return;
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
    const first = points[0].x, last = points[points.length - 1].x;
    result.push({ line, top: `${line} L${last} 0 L${first} 0 Z`, bottom: `${line} L${last} 100 L${first} 100 Z` });
    points = [];
  };
  values.forEach((value, i) => { if (value === null) finish(); else points.push({ x: x(i), y: y(value) }); });
  finish();
  return result;
}

export function reviewScore(value: unknown, checkmate: boolean, whiteChance: number | null): string {
  if (checkmate) return whiteChance === 100 ? '+M0' : whiteChance === 0 ? '-M0' : 'M';
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 90000) {
    const plies = 1000000 - Math.abs(value);
    const moves = Math.max(1, Math.ceil(plies / 2));
    return value > 0 ? `+M${moves}` : `-M${moves}`;
  }
  return (value > 0 ? '+' : '') + (value / 100).toFixed(2);
}

export function pgnSource(pgn: string): string {
  const site = /^\[Site\s+"([^"\r\n]*)"\]/mi.exec(pgn)?.[1];
  if (site?.trim().toLowerCase() === 'chess.com') return 'chesscom';
  if (site?.trim().toLowerCase() === 'lichess.org') return 'lichess';
  try {
    const url = new URL(site || '');
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    const host = url.hostname.toLowerCase();
    if (host === 'chess.com' || host === 'www.chess.com') return 'chesscom';
    if (host === 'lichess.org' || host === 'www.lichess.org') return 'lichess';
  } catch {}
  return '';
}

export function reviewIdentity(pgn: string, source: string, username: string, explicit: unknown): { white: string; black: string; side: 'white' | 'black' | null } {
  const header = (name: string) => (new RegExp('^\\[' + name + '\\s+"([^"\\r\\n]*)"\\]', 'mi').exec(pgn)?.[1] || '').trim();
  const white = header('White'), black = header('Black');
  if (explicit === 'white' || explicit === 'black') return { white, black, side: explicit };
  const target = username.trim().toLowerCase();
  if (!target || (source !== 'chesscom' && source !== 'lichess')) return { white, black, side: null };
  const w = white.toLowerCase() === target, b = black.toLowerCase() === target;
  return { white, black, side: w === b ? null : w ? 'white' : 'black' };
}
