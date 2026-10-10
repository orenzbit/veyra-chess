// Veyra SAN helper (MIT). Resolves SAN text to a legal move using js-chess-engine (MIT).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const J = require('js-chess-engine');

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const newPosition = (fen = START_FEN) => J.status(fen);
export const fenOf = (cfg) => J.getFen ? J.getFen(cfg) : null;

const SAN_RE = /^([NBRQK])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=?([NBRQ]))?$/;

/** Returns {from,to,uci,next,promotion} or throws Error with a precise reason. */
export function applySan(cfg, raw) {
  const san = raw.replace(/[+#!?]+$/g, '');
  const legal = J.moves(cfg);
  const white = cfg.turn === 'white';
  let from, to, promo = null;
  if (san === 'O-O' || san === 'O-O-O') {
    const r = white ? '1' : '8';
    from = 'E' + r; to = (san === 'O-O' ? 'G' : 'C') + r;
    if (!cfg.pieces[from] || cfg.pieces[from].toUpperCase() !== 'K' || !(legal[from] || []).includes(to))
      throw new Error(`castling ${san} is not legal here`);
  } else {
    const m = SAN_RE.exec(san);
    if (!m) throw new Error(`cannot parse SAN "${raw}"`);
    const [, pc, ff, fr, cap, dest, pr] = m;
    const type = pc || 'P';
    to = dest.toUpperCase();
    promo = pr || null;
    const cands = [];
    for (const [f, targets] of Object.entries(legal)) {
      const p = cfg.pieces[f];
      if (!p || p.toUpperCase() !== type) continue;
      if (!targets.includes(to)) continue;
      if (ff && f[0].toLowerCase() !== ff) continue;
      if (fr && f[1] !== fr) continue;
      if (type === 'P') {
        const isCapture = f[0] !== to[0];
        if (!!cap !== isCapture) continue; // SAN is strict about 'x' for pawns
        if (isCapture && !ff) continue;
      }
      cands.push(f);
    }
    if (cands.length === 0) throw new Error(`illegal move "${raw}"`);
    if (cands.length > 1) throw new Error(`ambiguous move "${raw}" (${cands.join(',')})`);
    from = cands[0];
    if (!cap && cfg.pieces[to]) throw new Error(`"${raw}" captures but has no 'x'`);
    if (type === 'P' && (to[1] === '8' || to[1] === '1') && !promo) throw new Error(`promotion piece missing in "${raw}"`);
    if (type === 'P' && promo && promo !== 'Q') throw new Error(`underpromotion not supported by openings compiler`);
  }
  const next = J.move(cfg, from, to);
  return { from, to, uci: (from + to).toLowerCase() + (promo ? promo.toLowerCase() : ''), next };
}

export const stripMoveNumbers = (s) => s.replace(/\d+\.(\.\.)?/g, ' ').replace(/\s+/g, ' ').trim();
