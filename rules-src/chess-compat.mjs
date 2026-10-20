// Veyra rules layer (MIT): a Chess-compatible API built on js-chess-engine (MIT).
// The supported API surface is covered by scripts/check-rules.mjs.
import * as J0 from 'js-chess-engine';
import * as Adapter from 'js-chess-engine/dist/adapters/APIAdapter.js';

// js-chess-engine's top-level helpers build a full AI engine (transposition table) on every
// call, which costs ~70ms. We only need rules, so build a Game without running its constructor.
const GameProto = (J0.Game || J0.default?.Game).prototype;
const mkGame = (cfg) => { const g = Object.create(GameProto); g.board = Adapter.configToBoard(cfg); g.history = []; return g; };
const J = {
  status: (cfg) => mkGame(cfg).exportJson(),
  moves: (cfg) => mkGame(cfg).moves(),
  move: (cfg, f, t) => mkGame(cfg).move(f, t),
};

export const DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const WHITE = 'w';
export const BLACK = 'b';
const FILES = 'abcdefgh';
const PROMOS = ['q', 'r', 'b', 'n'];

const sqUp = (s) => s[0].toUpperCase() + s[1];
const sqLo = (s) => s[0].toLowerCase() + s[1];
const colorOf = (p) => (p === p.toUpperCase() ? 'w' : 'b');
const typeOf = (p) => p.toLowerCase();

/** Returns {ok:true} or {ok:false,error} after strict FEN validation. */
export function validateFen(fen) {
  const t = String(fen).trim().split(/\s+/);
  if (t.length !== 6) return { ok: false, error: 'FEN needs 6 fields' };
  if (!/^(0|[1-9]\d*)$/.test(t[5]) || +t[5] < 1) return { ok: false, error: 'bad move number' };
  if (!/^(0|[1-9]\d*)$/.test(t[4])) return { ok: false, error: 'bad half-move clock' };
  if (!/^(-|[a-h][36])$/.test(t[3])) return { ok: false, error: 'bad en passant square' };
  if ((t[3][1] === '3' && t[1] === 'w') || (t[3][1] === '6' && t[1] === 'b')) return { ok: false, error: 'bad en passant rank' };
  if (!/^(KQ?k?q?|Qk?q?|kq?|q|-)$/.test(t[2])) return { ok: false, error: 'bad castling' };
  if (!/^(w|b)$/.test(t[1])) return { ok: false, error: 'bad side to move' };
  const rows = t[0].split('/');
  if (rows.length !== 8) return { ok: false, error: 'need 8 ranks' };
  let wk = 0, bk = 0;
  for (const row of rows) {
    let n = 0, prevNum = false;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) { if (prevNum) return { ok: false, error: 'two digits in a row' }; n += +ch; prevNum = true; }
      else if (/[pnbrqkPNBRQK]/.test(ch)) { n += 1; prevNum = false; if (ch === 'k') bk++; if (ch === 'K') wk++; }
      else return { ok: false, error: 'bad piece ' + ch };
    }
    if (n !== 8) return { ok: false, error: 'rank is not 8 wide' };
  }
  if (wk !== 1 || bk !== 1) return { ok: false, error: 'need exactly one king per side' };
  const r0 = rows[0], r7 = rows[7];
  if (/[pP]/.test(r0) || /[pP]/.test(r7)) return { ok: false, error: 'pawn on back rank' };
  return { ok: true };
}

function cfgFromFen(fen) {
  const t = fen.trim().split(/\s+/);
  while (t.length < 6) t.push(['', 'w', '-', '-', '0', '1'][t.length]);
  const pieces = {};
  t[0].split('/').forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += +ch;
      else { pieces[FILES[f].toUpperCase() + (8 - i)] = ch; f++; }
    }
  });
  const c = t[2];
  const base = {
    pieces, turn: t[1] === 'w' ? 'white' : 'black', isFinished: false, check: false, checkMate: false, staleMate: false,
    castling: { whiteShort: c.includes('K'), whiteLong: c.includes('Q'), blackShort: c.includes('k'), blackLong: c.includes('q') },
    enPassant: t[3] === '-' ? null : sqUp(t[3]), halfMove: +t[4], fullMove: +t[5],
  };
  return J.status(base);
}

function placement(cfg) {
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    let s = '', e = 0;
    for (let f = 0; f < 8; f++) {
      const p = cfg.pieces[FILES[f].toUpperCase() + r];
      if (p) { if (e) { s += e; e = 0; } s += p; } else e++;
    }
    rows.push(s + (e || ''));
  }
  return rows.join('/');
}
const castleStr = (cfg) => {
  const c = cfg.castling;
  return (c.whiteShort ? 'K' : '') + (c.whiteLong ? 'Q' : '') + (c.blackShort ? 'k' : '') + (c.blackLong ? 'q' : '') || '-';
};

/** Legal moves as plain records, promotions expanded, in a stable order. */
function legalFrom(cfg) {
  if (!Object.values(cfg?.pieces || {}).some((p) => typeOf(p) === 'k')) return [];
  const map = J.moves(cfg);
  const out = [];
  const white = cfg.turn === 'white';
  for (const from of Object.keys(map)) {
    const piece = cfg.pieces[from];
    const type = typeOf(piece);
    for (const to of [...new Set(map[from])]) {
      let captured = cfg.pieces[to] ? typeOf(cfg.pieces[to]) : undefined;
      let flags = captured ? 'c' : 'n';
      if (type === 'p') {
        if (!captured && from[0] !== to[0]) { captured = 'p'; flags = 'e'; }
        else if (Math.abs(+from[1] - +to[1]) === 2) flags = 'b';
      }
      if (type === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) flags = to[0] === 'G' ? 'k' : 'q';
      const promoRank = white ? '8' : '1';
      if (type === 'p' && to[1] === promoRank) {
        for (const pr of PROMOS) out.push({ color: white ? 'w' : 'b', from: sqLo(from), to: sqLo(to), piece: 'p', captured, promotion: pr, flags: flags + 'p' });
      } else {
        out.push({ color: white ? 'w' : 'b', from: sqLo(from), to: sqLo(to), piece: type, captured, flags });
      }
    }
  }
  return out;
}

function applyTo(cfg, m) {
  // J.move() can return stale check/mate flags, so always re-derive status.
  const next = J.move(cfg, sqUp(m.from), sqUp(m.to));
  if (m.promotion) {
    const to = sqUp(m.to);
    next.pieces = { ...next.pieces, [to]: m.color === 'w' ? m.promotion.toUpperCase() : m.promotion };
  }
  return J.status(next);
}

function fenOfCfg(cfg, legal) {
  let ep = '-';
  if (cfg.enPassant) {
    const e = sqLo(cfg.enPassant);
    if ((legal || legalFrom(cfg)).some((m) => m.flags.includes('e') && m.to === e)) ep = e;
  }
  return [placement(cfg), cfg.turn === 'white' ? 'w' : 'b', castleStr(cfg), ep, cfg.halfMove, cfg.fullMove].join(' ');
}

function sanOf(cfg, m, legal, next) {
  let s;
  if (m.flags.includes('k')) s = 'O-O';
  else if (m.flags.includes('q')) s = 'O-O-O';
  else {
    s = '';
    if (m.piece !== 'p') {
      const others = legal.filter((o) => o.piece === m.piece && o.to === m.to && o.from !== m.from);
      s += m.piece.toUpperCase();
      if (others.length) {
        const sameFile = others.some((o) => o.from[0] === m.from[0]);
        const sameRank = others.some((o) => o.from[1] === m.from[1]);
        if (sameFile && sameRank) s += m.from;
        else if (sameFile) s += m.from[1];
        else s += m.from[0];
      }
    } else if (m.captured) s += m.from[0];
    if (m.captured) s += 'x';
    s += m.to;
    if (m.promotion) s += '=' + m.promotion.toUpperCase();
  }
  const n = next || applyTo(cfg, m);
  if (n.checkMate) s += '#'; else if (n.check) s += '+';
  return s;
}

class MoveView {
  constructor(game, cfg, legal, m) {
    this._g = game; this._cfg = cfg; this._legal = legal;
    this.color = m.color; this.from = m.from; this.to = m.to; this.piece = m.piece;
    if (m.captured) this.captured = m.captured;
    if (m.promotion) this.promotion = m.promotion;
    this.flags = m.flags;
    this._m = m;
  }
  get next() { return this._next || (this._next = applyTo(this._cfg, this._m)); }
  get san() { return this._san || (this._san = sanOf(this._cfg, this._m, this._legal, this.next)); }
  get lan() { return this.from + this.to + (this.promotion || ''); }
  get before() { return fenOfCfg(this._cfg, this._legal); }
  get after() { return fenOfCfg(this.next); }
  isCapture() { return this.flags.includes('c') || this.flags.includes('e'); }
  isPromotion() { return this.flags.includes('p'); }
  isEnPassant() { return this.flags.includes('e'); }
  isKingsideCastle() { return this.flags.includes('k'); }
  isQueensideCastle() { return this.flags.includes('q'); }
  isBigPawn() { return this.flags.includes('b'); }
}

const cleanSan = (s) => s.replace(/[+#]?[?!]*$/, '');

export class Chess {
  constructor(fen = DEFAULT_POSITION) { this.load(fen); }

  load(fen) {
    const t = String(fen).trim().split(/\s+/);
    // chess.js rejects FENs with a missing field count; padding would silently invent a position.
    if (t.length !== 6) throw new Error('Invalid FEN: FEN needs 6 fields');
    const padded = t.slice();
    const v = validateFen(padded.join(' '));
    if (!v.ok) throw new Error('Invalid FEN: ' + v.error);
    this._cfg = cfgFromFen(padded.join(' '));
    this._startFen = null;
    this._hist = [];
    this._headers = {};
    this._counts = new Map();
    this._legalCache = null;
    this._bumpPos(this._cfg, 1);
    if (padded.join(' ') !== DEFAULT_POSITION) this._startFen = padded.join(' ');
    return this;
  }
  reset() { return this.load(DEFAULT_POSITION); }
  clear() {
    this._cfg = {
      pieces: {}, turn: 'white', isFinished: false, check: false, checkMate: false, staleMate: false,
      castling: { whiteShort: false, whiteLong: false, blackShort: false, blackLong: false },
      enPassant: null, halfMove: 0, fullMove: 1,
    };
    this._startFen = null;
    this._hist = [];
    this._headers = {};
    this._counts = new Map();
    this._legalCache = null;
    this._bumpPos(this._cfg, 1);
    return this;
  }

  _posKey(cfg) {
    const f = fenOfCfg(cfg, cfg === this._cfg ? this._legal() : undefined).split(' ');
    return f.slice(0, 4).join(' ');
  }
  _bumpPos(cfg, d) { const k = this._posKey(cfg); this._counts.set(k, (this._counts.get(k) || 0) + d); }
  _legal() { return this._legalCache || (this._legalCache = legalFrom(this._cfg)); }

  fen() { return fenOfCfg(this._cfg, this._legal()); }
  turn() { return this._cfg.turn === 'white' ? 'w' : 'b'; }
  get(square) {
    const p = this._cfg.pieces[sqUp(square)];
    return p ? { type: typeOf(p), color: colorOf(p) } : undefined;
  }
  board() {
    const out = [];
    for (let r = 8; r >= 1; r--) {
      const row = [];
      for (let f = 0; f < 8; f++) {
        const sq = FILES[f] + r, p = this._cfg.pieces[sq.toUpperCase()];
        row.push(p ? { square: sq, type: typeOf(p), color: colorOf(p) } : null);
      }
      out.push(row);
    }
    return out;
  }

  moves(opts = {}) {
    let list = this._legal();
    if (opts.square) list = list.filter((m) => m.from === opts.square);
    if (opts.piece) list = list.filter((m) => m.piece === opts.piece);
    const views = list.map((m) => new MoveView(this, this._cfg, this._legal(), m));
    return opts.verbose ? views : views.map((v) => v.san);
  }

  isCheck() { return !!this._cfg.check; }
  inCheck() { return this.isCheck(); }
  isCheckmate() { return !!this._cfg.checkMate; }
  isStalemate() { return !!this._cfg.staleMate; }
  isInsufficientMaterial() {
    const pcs = Object.entries(this._cfg.pieces).filter(([, p]) => typeOf(p) !== 'k');
    if (pcs.length === 0) return true;
    if (pcs.some(([, p]) => ['p', 'r', 'q'].includes(typeOf(p)))) return false;
    if (pcs.length === 1) return true; // K+B or K+N vs K
    if (pcs.some(([, p]) => typeOf(p) === 'n')) return false;
    // only bishops left: insufficient when all sit on the same square colour
    const col = pcs.map(([sq]) => (sq.charCodeAt(0) - 65 + +sq[1]) % 2);
    return col.every((c) => c === col[0]);
  }
  isThreefoldRepetition() { return (this._counts.get(this._posKey(this._cfg)) || 0) >= 3; }
  isDrawByFiftyMoves() { return this._cfg.halfMove >= 100; }
  isDraw() {
    return (this._cfg.halfMove >= 100 && !this._cfg.checkMate) || this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition();
  }
  isGameOver() { return this.isCheckmate() || this.isDraw(); }

  _find(input) {
    const legal = this._legal();
    if (typeof input === 'string') {
      const want = cleanSan(input.replace(/0/g, 'O'));
      // exact SAN (with or without annotation) first
      for (const m of legal) {
        if (cleanSan(sanOf(this._cfg, m, legal)) === want) return m;
      }
      // lenient parse: optional x, overspecified squares, promotion with or without '='
      const re = /^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([NBRQnbrq]))?$/;
      const mt = re.exec(want);
      if (!mt) return null;
      const [, pc, ff, fr, dest, pr] = mt;
      const type = (pc || 'P').toLowerCase();
      const cands = legal.filter((m) => m.piece === type && m.to === dest &&
        (!ff || m.from[0] === ff) && (!fr || m.from[1] === fr) &&
        (pr ? m.promotion === pr.toLowerCase() : !m.promotion));
      return cands.length === 1 ? cands[0] : null;
    }
    if (input && typeof input === 'object') {
      const pr = input.promotion ? String(input.promotion).toLowerCase() : undefined;
      const candidates = legal.filter((m) => m.from === input.from && m.to === input.to);
      if (pr) return candidates.find((m) => m.promotion === pr) || null;
      if (candidates.some((m) => m.promotion)) return candidates.find((m) => m.promotion === 'q') || null;
      return candidates.find((m) => !m.promotion) || null;
    }
    return null;
  }

  move(input, opts = {}) {
    const m = this._find(input);
    if (!m) {
      // chess.js contract: `sloppy` callers (e.g. opening-line probes) expect null, not a throw.
      if (opts && opts.sloppy) return null;
      throw new Error('Invalid move: ' + (typeof input === 'string' ? input : JSON.stringify(input)));
    }
    const view = new MoveView(this, this._cfg, this._legal(), m);
    const san = view.san;
    this._hist.push({ cfg: this._cfg, legal: this._legalCache, view, san });
    this._cfg = view.next;
    this._legalCache = null;
    this._bumpPos(this._cfg, 1);
    return view;
  }

  undo() {
    const h = this._hist.pop();
    if (!h) return null;
    this._bumpPos(this._cfg, -1);
    this._cfg = h.cfg;
    this._legalCache = h.legal;
    return h.view;
  }

  history(opts = {}) {
    return opts.verbose ? this._hist.map((h) => h.view) : this._hist.map((h) => h.san);
  }

  header(...args) {
    for (let i = 0; i < args.length; i += 2) if (typeof args[i] === 'string' && typeof args[i + 1] === 'string') this._headers[args[i]] = args[i + 1];
    return { ...this._headers };
  }
  getHeaders() { return { ...this._headers }; }

  pgn(opts = {}) {
    const hdr = { Event: '?', Site: '?', Date: '????.??.??', Round: '?', White: '?', Black: '?', Result: '*', ...this._headers };
    if (this._startFen) { hdr.SetUp = '1'; hdr.FEN = this._startFen; }
    const lines = Object.entries(hdr).map(([k, v]) => `[${k} "${v}"]`);
    let n = this._startFen ? +this._startFen.split(' ')[5] : 1;
    let black = this._startFen ? this._startFen.split(' ')[1] === 'b' : false;
    const parts = [];
    this._hist.forEach((h, i) => {
      if (!black) { parts.push(`${n}.`); }
      else if (i === 0) parts.push(`${n}...`);
      parts.push(h.san);
      if (black) n++;
      black = !black;
    });
    parts.push(hdr.Result);
    const text = parts.join(' ');
    if (!this._hist.length && lines.length) return lines.join(opts.newline || '\n') + (opts.newline || '\n') + ' ' + hdr.Result;
    return (lines.length ? lines.join(opts.newline || '\n') + (opts.newline || '\n') + (opts.newline || '\n') : '') + text;
  }

  loadPgn(pgn, opts = {}) {
    const src = String(pgn).replace(/\r/g, '');
    const headers = {};
    const body = [];
    for (const line of src.split('\n')) {
      const h = /^\s*\[\s*([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]\s*$/.exec(line);
      if (h && !body.length) headers[h[1]] = h[2].replace(/\\(["\\])/g, '$1');
      else body.push(line);
    }
    let text = body.join('\n').replace(/;[^\n]*/g, ' ').replace(/\{[^}]*\}/g, ' ');
    for (let prev = ''; prev !== text;) { prev = text; text = text.replace(/\([^()]*\)/g, ' '); }
    text = text.replace(/\$\d+/g, ' ');
    if (headers.SetUp === '1' && headers.FEN) this.load(headers.FEN); else this.reset();
    this._headers = {};
    for (const [k, v] of Object.entries(headers)) if (!(headers.SetUp === '1' && (k === 'SetUp' || k === 'FEN'))) this._headers[k] = v;
    const toks = text.split(/\s+/).filter(Boolean);
    for (let tok of toks) {
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) { if (!this._headers.Result) this._headers.Result = tok; continue; }
      tok = tok.replace(/^\d+\.+/, '');
      if (!tok) continue;
      // sloppy PGN (archive imports) skips unreadable tokens instead of aborting the whole game.
      if (opts && opts.sloppy) { try { this.move(tok); } catch { /* skip unknown token */ } continue; }
      this.move(tok);
    }
  }
}

export default Chess;
