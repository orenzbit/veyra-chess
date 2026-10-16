// Veyra puzzle core — board model. Original MIT code, zero dependencies.
// Pure ESM: runs in browser and Node. No DOM, no network.
const FILES = 'abcdefgh';

export function sqToRC(sq) {
  return { r: 8 - Number(sq[1]), f: FILES.indexOf(sq[0]) };
}
export function rcToSq(r, f) { return FILES[f] + String(8 - r); }
export function inBoard(r, f) { return r >= 0 && r < 8 && f >= 0 && f < 8; }

export function parsePlacement(rankRows) {
  const grid = Array.from({ length: 8 }, () => Array(8).fill(null));
  rankRows.forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) f += Number(ch);
      else { grid[r][f] = ch; f += 1; }
    }
  });
  return grid;
}

export function parseFEN(fen) {
  const parts = String(fen || '').trim().split(/\s+/);
  if (parts.length !== 6) return { ok: false, error: 'FEN needs 6 fields' };
  const place = parts[0], turn = parts[1], cast = parts[2], ep = parts[3];
  const half = parts[4], full = parts[5];
  if (turn !== 'w' && turn !== 'b') return { ok: false, error: 'bad side' };
  if (!/^(KQ?k?q?|Qk?q?|kq?|q|-)$/.test(cast)) return { ok: false, error: 'bad castling' };
  if (!/^(-|[a-h][36])$/.test(ep)) return { ok: false, error: 'bad ep' };
  if (!/^\d+$/.test(half) || !/^[1-9]\d*$/.test(full)) return { ok: false, error: 'bad counters' };
  const rows = place.split('/');
  if (rows.length !== 8) return { ok: false, error: 'need 8 ranks' };
  let wk = 0, bk = 0;
  for (const row of rows) {
    let n = 0, prevNum = false;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        if (prevNum) return { ok: false, error: 'double digit' };
        n += Number(ch); prevNum = true;
      } else if (/[pnbrqkPNBRQK]/.test(ch)) {
        n += 1; prevNum = false;
        if (ch === 'K') wk++; if (ch === 'k') bk++;
      } else return { ok: false, error: 'bad piece ' + ch };
    }
    if (n !== 8) return { ok: false, error: 'rank not 8 wide' };
  }
  if (wk !== 1 || bk !== 1) return { ok: false, error: 'need one king each' };
  if (/[pP]/.test(rows[0]) || /[pP]/.test(rows[7])) return { ok: false, error: 'pawn on back rank' };
  return { ok: true, grid: parsePlacement(rows), turn, castling: cast, ep, half: Number(half), full: Number(full) };
}

export function validUCI(u) { return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(String(u || '')); }

function isWhite(p) { return p === p.toUpperCase(); }
export function kingSquare(grid, color) {
  const k = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if (grid[r][f] === k) return rcToSq(r, f);
  return null;
}

export function countPieces(grid) {
  let n = 0;
  for (const row of grid) for (const c of row) if (c) n++;
  return n;
}

// A rank flip changes color but preserves files, so king/queen-side rights stay put.
export function mirrorCastling(cast) {
  if (cast === '-') return '-';
  const order = { K: 0, Q: 1, k: 2, q: 3 };
  return cast.split('').map((ch) =>
    ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())
    .sort((a, b) => order[a] - order[b]).join('');
}
export function mirrorFEN(fen) {
  const parts = String(fen).trim().split(/\s+/);
  const rows = parts[0].split('/').reverse().map((row) =>
    row.replace(/[pnbrqkPNBRQK]/g, (ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())));
  const turn = parts[1] === 'w' ? 'b' : 'w';
  const cast = mirrorCastling(parts[2]);
  let ep = parts[3];
  if (ep !== '-') ep = ep[0] + (ep[1] === '3' ? '6' : '3');
  return [rows.join('/'), turn, cast, ep, parts[4], parts[5]].join(' ');
}

export function mirrorUCI(uci) {
  if (!uci) return uci;
  const flip = (sq) => sq[0] + String(9 - Number(sq[1]));
  return flip(uci.slice(0, 2)) + flip(uci.slice(2, 4)) + (uci.length === 5 ? uci[4] : '');
}
