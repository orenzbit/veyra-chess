// The coach's words (COACH_EXPLAIN_ENABLED): for a mistake, inaccuracy, miss or blunder in game review, say
// WHAT went wrong (a named category), WHERE (the move, the square or piece, the opponent's punishing reply),
// WHY it matters (material, mate or position, with the evaluation swing in plain words) and WHAT to play instead.
// The category comes from detectors that read the board and the engine's two lines: the best line from the
// position before the move, and the opponent's best line after it. A tactic is only named when the engine's line
// shows it paying off (the material it wins, or the mate); otherwise the coach falls back to a plain sentence.
import { attacksFrom, attackersOf, explainBestMove, lineSteps, type CoachStep } from './coach-explain.ts';
import { CATEGORY_LABEL, WHAT, WHY, BETTER, IDEA, IDEA_INF, FALLBACK, BANDS, SUMMARY, type CategoryKey } from './coach-words-he.ts';

export { CATEGORY_LABEL, type CategoryKey };

type Color = 'w' | 'b';
type Piece = { type: string; color: Color };
type Board = Map<string, Piece>;
type ChessCtor = new (fen?: string) => any;

export type MistakeInput = {
  /** The position before the move the player made. */
  fenBefore: string;
  /** The move the player made. */
  played: { from: string; to: string; promotion?: string | null };
  /** 0-based ply of the move in the game (used for its number only when the FEN's move counter is missing). */
  ply?: number;
  classification?: string;
  /** The mover's winning chance (0..100) after the engine's best move and after the move played. */
  moverChanceBest: number;
  moverChanceAfter: number;
  /** The review's scores in centipawns from White's side (±90000 and beyond is mate), when known. */
  bestScore?: number | null;
  afterScore?: number | null;
  /** The engine's line (UCI) from fenBefore, best move first. */
  bestLine: string[];
  /** The engine's line (UCI) from the position after the move played: the opponent's best reply first. */
  replyLine: string[];
  /** Pick a fixed variant (tests); by default the variant is picked from the position, so it is stable. */
  variant?: number;
};

export type Diagnosis = {
  category: CategoryKey;
  sub: string;
  label: string;
  moveLabel: string;
  moveNumber: number;
  san: string;
  bestSan: string;
  replySan: string;
  /** Material in points the category is about (lost to the reply line, or missed in the best line); 100 = mate. */
  stake: number;
  /** WHAT + WHERE, WHY, BETTER: three sentences. */
  what: string;
  why: string;
  better: string;
  text: string[];
  drop: number;
  facts: Record<string, any>;
};

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME: Record<string, string> = { p: 'רגלי', n: 'פרש', b: 'רץ', r: 'צריח', q: 'מלכה', k: 'מלך' };
const FILES = 'abcdefgh';
const MATE = 90000;

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const fem = (t: string) => t === 'q';
const gv = (t: string, m: string, f: string) => (fem(t) ? f : m);
const the = (t: string) => 'ה' + NAME[t];
function readBoard(fen: string, Chess: ChessCtor): Board {
  const b: Board = new Map();
  for (const row of new Chess(fen).board()) for (const cell of row) if (cell) b.set(cell.square, { type: cell.type, color: cell.color });
  return b;
}
function material(b: Board, c: Color) { let n = 0; for (const p of b.values()) if (p.color === c && p.type !== 'k') n += VALUE[p.type]; return n; }
function nonPawn(b: Board, c: Color) { let n = 0; for (const p of b.values()) if (p.color === c && p.type !== 'k' && p.type !== 'p') n += VALUE[p.type]; return n; }
function kingSq(b: Board, c: Color) { for (const [s, p] of b) if (p.color === c && p.type === 'k') return s; return ''; }
function enPrise(b: Board, s: string) {
  const p = b.get(s); if (!p || p.type === 'k') return { hit: false, undefended: false, cheaper: '' };
  const att = attackersOf(b, s, other(p.color)); if (!att.length) return { hit: false, undefended: false, cheaper: '' };
  const def = attackersOf(b, s, p.color).filter(d => b.get(d)!.type !== 'k' || att.length < 2);
  const undefended = !def.length;
  const cheaper = att.find(a => VALUE[b.get(a)!.type] < VALUE[p.type]) || '';
  // Attacked more times than defended counts too; the engine's line has to confirm the loss anyway.
  return { hit: undefended || !!cheaper || att.length > def.length, undefended, cheaper };
}
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function fill(t: string, slots: Record<string, any>) {
  return t.replace(/\{(\w+)\}/g, (_, k) => { if (slots[k] === undefined || slots[k] === null || slots[k] === '') throw new Error(`coach-words: slot {${k}} is empty in "${t}"`); return String(slots[k]); });
}
function points(n: number) { return n === 1 ? 'נקודת חומר אחת' : `${n} נקודות חומר`; }
// "a rook", "the exchange", "3 points": the material as a noun, and with the preposition ב ("win a rook").
function gainWords(gain: number, pieces: string[]) {
  const top = [...pieces].sort((a, b) => VALUE[b] - VALUE[a]);
  const exact = top.find(t => VALUE[t] === gain);
  if (exact && exact !== 'p' || (exact === 'p' && gain === 1)) return { noun: NAME[exact!], bet: 'ב' + NAME[exact!] };
  if (top.length && VALUE[top[0]] === gain) return { noun: NAME[top[0]], bet: 'ב' + NAME[top[0]] };
  if (gain === 2 && top[0] === 'r') return { noun: 'את האיכות (צריח תמורת כלי קל)', bet: 'באיכות (צריח תמורת כלי קל)' };
  return { noun: points(gain), bet: gain === 1 ? 'ב' + points(gain) : 'ב-' + points(gain) };
}
function band(chance: number) { return BANDS.find(b => chance >= b.min)!; }
function swingWords(before: number, after: number, cpBefore: number | null, cpAfter: number | null) {
  const a = band(before), b = band(after);
  const cp = cpBefore !== null && cpAfter !== null && Math.abs(cpBefore) < MATE && Math.abs(cpAfter) < MATE ? Math.abs(cpBefore - cpAfter) / 100 : null;
  const num = (x: number) => (x >= 10 ? String(Math.round(x)) : x.toFixed(1));
  const one = cp !== null && num(cp) === '1.0';
  const size = cp !== null && cp >= 0.5 ? (one ? ' (בערך נקודה אחת לפי המנוע)' : ` (בערך ${num(cp)} נקודות לפי המנוע)`) : '';
  if (a === b) return cp !== null && cp >= 1 ? `${one ? 'בנקודה אחת' : `ב-${num(cp)} נקודות`} לפי המנוע, ${a.still}` : `מעט, ${a.still}`;
  return `${a.from} ${b.to}${size}`;
}
// "12.Nf3" / "12...Nf6"
function moveLabelOf(fen: string, san: string, ply?: number) {
  const parts = fen.split(' '); const n = Number(parts[5]) || (ply !== undefined ? Math.floor(ply / 2) + 1 : 1);
  return { n, label: parts[1] === 'w' ? `${n}.${san}` : `${n}...${san}` };
}
function passed(b: Board, s: string) {
  const p = b.get(s); if (!p || p.type !== 'p') return false;
  const f = FILES.indexOf(s[0]); const r = Number(s[1]); const dir = p.color === 'w' ? 1 : -1;
  for (const [t, q] of b) {
    if (q.type !== 'p' || q.color === p.color) continue;
    const tf = FILES.indexOf(t[0]); const tr = Number(t[1]);
    if (Math.abs(tf - f) <= 1 && (tr - r) * dir > 0) return false;
  }
  return true;
}
function pawnWeak(b: Board, c: Color) {
  const files = new Map<number, number>();
  for (const [s, p] of b) if (p.color === c && p.type === 'p') { const f = FILES.indexOf(s[0]); files.set(f, (files.get(f) || 0) + 1); }
  let doubled = 0, isolated = 0; const dFiles: string[] = []; const iFiles: string[] = [];
  for (const [f, n] of files) {
    if (n > 1) { doubled += n - 1; dFiles.push(FILES[f]); }
    if (!files.has(f - 1) && !files.has(f + 1)) { isolated += n; iFiles.push(FILES[f]); }
  }
  return { doubled, isolated, dFiles, iFiles };
}
// Material the side `who` wins along a line, from `startFen`, in points. When the line stops right after a
// capture, the count before that capture is also taken and the smaller one kept, so a capture whose recapture
// the line did not show is never counted as won.
function lineGain(Chess: ChessCtor, startFen: string, steps: CoachStep[], who: Color) {
  const b0 = readBoard(startFen, Chess);
  const diff = (b: Board) => material(b, who) - material(b, other(who));
  const d0 = diff(b0); const ds = [d0];
  for (const st of steps) ds.push(diff(readBoard(st.fenAfter, Chess)));
  let end = ds[ds.length - 1];
  const last = steps[steps.length - 1];
  if (last && last.captured && ds.length > 1) {
    const recapture = new Chess(last.fenAfter).moves({ verbose: true }).some((m: any) => m.to === last.to);
    if (recapture) end = Math.min(end, ds[ds.length - 2]);
  }
  const taken = steps.filter(st => st.color === who && st.captured).map(st => st.captured!);
  return { gain: end - d0, taken };
}
function endsInMate(Chess: ChessCtor, steps: CoachStep[]) { return steps.length > 0 && new Chess(steps[steps.length - 1].fenAfter).isCheckmate(); }
function mateIn1Threats(Chess: ChessCtor, fen: string, by: Color): string[] {
  const parts = fen.split(' '); if (parts[1] !== by) { const probe = new Chess(fen); if (probe.inCheck()) return []; parts[1] = by; parts[3] = '-'; }
  let c: any; try { c = new Chess(parts.join(' ')); } catch { return []; }
  const out: string[] = [];
  for (const m of c.moves({ verbose: true })) { const t = new Chess(c.fen()); const mv = t.move({ from: m.from, to: m.to, promotion: m.promotion || undefined }); if (mv && t.isCheckmate()) out.push(mv.san); }
  return out;
}
const DIRS: Record<string, number[][]> = { b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] };
DIRS.q = [...DIRS.b, ...DIRS.r];
// Lines from the slider on `s`: the first piece it hits and the one behind it.
function xrays(b: Board, s: string) {
  const p = b.get(s); const out: { front: string; back: string }[] = [];
  if (!p || !DIRS[p.type]) return out;
  const f = FILES.indexOf(s[0]), r = Number(s[1]) - 1;
  for (const [df, dr] of DIRS[p.type]) {
    let nf = f + df, nr = r + dr; let front = '';
    while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      const t = FILES[nf] + (nr + 1);
      if (b.has(t)) { if (!front) front = t; else { out.push({ front, back: t }); break; } }
      nf += df; nr += dr;
    }
  }
  return out;
}
const MINOR_HOME: Record<Color, string[]> = { w: ['b1', 'g1', 'c1', 'f1'], b: ['b8', 'g8', 'c8', 'f8'] };
function homeMinors(b: Board, c: Color) {
  return MINOR_HOME[c].filter(s => { const p = b.get(s); return p && p.color === c && (p.type === (('bg'.includes(s[0])) ? 'n' : 'b')); });
}
function listPieces(b: Board, sqs: string[]) {
  const names = sqs.map(s => `${the(b.get(s)!.type)} ב-${s}`);
  return names.length <= 1 ? names.join('') : names.slice(0, -1).join(', ') + ' ו' + names[names.length - 1];
}

type Finding = { category: CategoryKey; sub: string; stake: number; slots: Record<string, any>; why: string; idea?: { key: string; slots: Record<string, any> } };

export function diagnoseMistake(Chess: ChessCtor, input: MistakeInput): Diagnosis | null {
  const before = new Chess(input.fenBefore);
  const me: Color = before.turn(); const them = other(me);
  let playedMove: any = null;
  try { playedMove = before.move({ from: input.played.from, to: input.played.to, promotion: input.played.promotion || undefined }); } catch { playedMove = null; }
  if (!playedMove) return null;
  const fenAfter = before.fen();
  const B0 = readBoard(input.fenBefore, Chess); const A = readBoard(fenAfter, Chess);
  const best = lineSteps(Chess, input.fenBefore, input.bestLine, 8);
  const reply = lineSteps(Chess, fenAfter, input.replyLine, 8);
  const san = playedMove.san;
  // The move played is the engine's own best move: nothing went wrong, so there is nothing to explain here.
  if (best[0] && best[0].uci === input.played.from + input.played.to + (input.played.promotion || '')) return null;
  const { n: moveNumber, label: moveLabel } = moveLabelOf(input.fenBefore, san, input.ply);
  const bestSan = best[0]?.san || '';
  const replySan = reply[0]?.san || '';
  const playedUci = input.played.from + input.played.to + (input.played.promotion || '');
  const drop = Math.max(0, input.moverChanceBest - input.moverChanceAfter);
  const pov = (s: number | null | undefined) => (s === null || s === undefined || !Number.isFinite(s) ? null : me === 'w' ? s : -s);
  const cpBest = pov(input.bestScore), cpAfter = pov(input.afterScore);
  const swing = swingWords(input.moverChanceBest, input.moverChanceAfter, cpBest, cpAfter);
  const base = { move: moveLabel, n: moveNumber, san, best: bestSan, reply: replySan, swing };
  // Material from the position before the move: the move itself and the opponent's line.
  const lost = lineGain(Chess, input.fenBefore, [{ uci: playedUci, san, from: playedMove.from, to: playedMove.to, color: me, captured: playedMove.captured || null, fenBefore: input.fenBefore, fenAfter }, ...reply], them);
  const missedRaw = lineGain(Chess, input.fenBefore, best, me);
  // What the best line wins beyond what the move played (and the reply line) keeps: a capture both moves make is not missed.
  const missed = { gain: missedRaw.gain + lost.gain, taken: missedRaw.taken };
  // What a missed chance is worth, in words: the best line's own gain, not the gap to the line played.
  const missedWords = (net: number) => gainWords(Math.max(1, Math.min(net, missedRaw.gain > 0 ? missedRaw.gain : net)), missedRaw.taken);
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);
  const replyMates = endsInMate(Chess, reply) || (cpAfter !== null && cpAfter <= -MATE);
  const bestMates = endsInMate(Chess, best) || (cpBest !== null && cpBest >= MATE);
  const playedMates = new Chess(fenAfter).isCheckmate();
  const fullmove = Number(input.fenBefore.split(' ')[5]) || moveNumber;
  const queens = [...B0.values()].filter(p => p.type === 'q').length;
  const endgame = (queens === 0 && nonPawn(B0, me) <= 13 && nonPawn(B0, them) <= 13) || nonPawn(B0, me) + nonPawn(B0, them) <= 14;
  const opening = fullmove <= 15 && !endgame;

  // ---- Mate ----
  if (bestMates && !playedMates && !replyMates) {
    const lineMate = endsInMate(Chess, best);
    const inOne = lineMate && best.length === 1;
    add({ category: 'missed_mate', sub: inOne ? 'one' : '', stake: 100, slots: {}, why: 'missed_mate',
      idea: inOne ? undefined : lineMate ? { key: 'mate_line', slots: { n: Math.ceil(best.length / 2), line: best.map(s => s.san).join(' ') } } : { key: 'mate_score', slots: {} } });
  }
  if (replyMates && reply.length) {
    const lineMate = endsInMate(Chess, reply);
    const last = reply[reply.length - 1];
    const endB = lineMate ? readBoard(last.fenAfter, Chess) : null;
    const ksq = kingSq(endB || A, me); const backRank = me === 'w' ? '1' : '8';
    const mater = endB?.get(last.to);
    const isBackRank = !!(lineMate && mater && (mater.type === 'r' || mater.type === 'q') && last.to[1] === backRank && ksq[1] === backRank);
    const threatsBefore = mateIn1Threats(Chess, input.fenBefore, them);
    const stopsMate = best.length ? !mateIn1Threats(Chess, best[0].fenAfter, them).length : false;
    const idea = stopsMate && threatsBefore.length ? { key: 'stops_mate', slots: {} } : undefined;
    if (isBackRank) add({ category: 'back_rank', sub: reply.length === 1 ? 'now' : '', stake: 100, slots: { ksq, mater: the(mater!.type), mates: gv(mater!.type, 'נותן מט', 'נותנת מט'), matesq: last.to }, why: 'mate', idea });
    else if (threatsBefore.length) add({ category: 'mate_threat', sub: 'ignored', stake: 100, slots: { threat: threatsBefore[0] }, why: 'mate', idea });
    else add({ category: 'mate_threat', sub: reply.length === 1 && lineMate ? 'now' : 'allowed', stake: 100, slots: {}, why: 'mate' });
  }

  // ---- Tactics the opponent's line shows (the reply punishes the move) ----
  const r0 = reply[0];
  if (r0 && lost.gain >= 1 && !replyMates) {
    const R1 = readBoard(r0.fenAfter, Chess);
    const piece = R1.get(r0.to)!;
    const gw = gainWords(lost.gain, lost.taken);
    const common = { gain: gw.bet.slice(1), gainNoun: gw.noun };
    // Fork: the replying piece attacks two of ours (the king, or pieces worth more than it or undefended).
    const targets = attacksFrom(R1, r0.to).filter(s => { const t = R1.get(s); return t && t.color === me && (t.type === 'k' || (VALUE[t.type] >= 3 && (VALUE[t.type] > VALUE[piece.type] || !attackersOf(R1, s, me).length))); })
      .sort((a, b) => VALUE[R1.get(b)!.type] - VALUE[R1.get(a)!.type]);
    const forkSafe = !enPrise(R1, r0.to).hit || targets.some(s => R1.get(s)!.type === 'k');
    const later = reply.slice(1).filter(st => st.color === them && st.captured);
    const capturesOn = (sq: string) => reply.some(st => st.color === them && st.captured && st.to === sq);
    if (targets.length >= 2 && forkSafe && targets.slice(1).some(s => capturesOn(s)) && lost.gain >= 2) {
      const check = targets.some(s => R1.get(s)!.type === 'k');
      const tl = targets.filter(s => R1.get(s)!.type !== 'k');
      const ti = (s: string) => `${the(R1.get(s)!.type)} ב-${s}`;
      add({ category: 'fork', sub: check ? 'allowed_check' : 'allowed', stake: lost.gain, why: 'material',
        slots: { ...common, F: the(piece.type), fsq: r0.to, attacks: gv(piece.type, 'תוקף', 'תוקפת'), gives: gv(piece.type, 'נותן', 'נותנת'), t1: ti(check ? tl[0] : targets[0]), t2: check ? '' : ti(targets[1]), goes: gv(R1.get(tl[0])!.type, 'הולך', 'הולכת') } });
    }
    // Pin / skewer: an enemy slider on a line through two of our pieces, and the line wins one of them.
    const sliders = [...R1].filter(([s, p]) => p.color === them && DIRS[p.type]);
    for (const [s, p] of sliders) {
      for (const { front, back } of xrays(R1, s)) {
        const X = R1.get(front)!, Y = R1.get(back)!;
        if (X.color !== me || Y.color !== me) continue;
        const wasThere = (() => { const pa = A.get(s); if (!pa || pa.type !== p.type || pa.color !== them) return false; return xrays(A, s).some(l => l.front === front && l.back === back); })();
        const madeByReply = r0.to === s;
        if (!madeByReply && !wasThere) continue;
        // An old pin is only the story when the reply goes after the pinned piece.
        const replyHitsPinned = madeByReply || r0.to === front || attacksFrom(R1, r0.to).includes(front);
        const hitPinned = attackersOf(R1, front, them).some(a => a !== s && VALUE[R1.get(a)!.type] < VALUE[X.type]);
        // Not a pin when the pinned piece can simply take the pinner without losing on the exchange.
        const xHitsBack = attacksFrom(R1, front).includes(s) && (VALUE[p.type] >= VALUE[X.type] || !attackersOf(R1, s, them).length);
        if ((X.type !== 'p' || Y.type === 'k') && VALUE[X.type] < VALUE[Y.type] && replyHitsPinned && (capturesOn(front) || hitPinned) && lost.gain >= 2 && !xHitsBack) {
          const before0 = B0.get(s); const existed = !!before0 && before0.type === p.type && before0.color === them && xrays(B0, s).some(l => l.front === front && l.back === back);
          add({ category: 'pin', sub: madeByReply ? 'made' : existed ? '' : 'into', stake: lost.gain, why: 'material', slots: { ...common, X: the(X.type), xsq: front, Y: the(Y.type), Yn: NAME[Y.type], ysq: back, S: the(p.type), cant: gv(X.type, 'לא יכול', 'לא יכולה'), stuck: gv(X.type, 'תקוע', 'תקועה'), pinned: gv(X.type, 'מרותק', 'מרותקת'), attacksX: gv(X.type, 'תוקף אותו', 'תוקף אותה'), stands: gv(X.type, 'עומד', 'עומדת'), remains: gv(X.type, 'נשאר', 'נשארה') } });
        } else if (madeByReply && VALUE[X.type] > VALUE[Y.type] && VALUE[Y.type] >= 3 && reply.some(st => st.from === s && st.to === back && st.captured) && lost.gain >= 2) {
          add({ category: 'skewer', sub: '', stake: lost.gain, why: 'material', slots: { ...common, X: the(X.type), xsq: front, Y: the(Y.type), ysq: back, must: gv(X.type, 'חייב', 'חייבת'), taken: gv(Y.type, 'נלקח', 'נלקחת'), behind: gv(X.type, 'מאחוריו', 'מאחוריה'), open: gv(Y.type, 'פתוח', 'פתוחה') } });
        }
      }
    }
    // Discovered attack: the reply moves a piece off a line, and a slider behind it now hits one of ours.
    for (const [s, p] of sliders) {
      if (s === r0.to) continue;
      const pa = A.get(s); if (!pa || pa.type !== p.type || pa.color !== them) continue; // the slider stood there before the reply (not a castling rook)
      const was = new Set(attacksFrom(A, s));
      const fresh = attacksFrom(R1, s).filter(t => !was.has(t) && R1.get(t)?.color === me && (R1.get(t)!.type === 'k' || VALUE[R1.get(t)!.type] >= 3));
      if (!fresh.length) continue;
      const tsq = fresh.sort((a, b) => VALUE[R1.get(b)!.type] - VALUE[R1.get(a)!.type])[0];
      const blocked = !attacksFrom(A, s).includes(tsq);
      const isKing = R1.get(tsq)!.type === 'k';
      if (blocked && lost.gain >= 2 && (capturesOn(tsq) || (isKing && later.length))) {
        add({ category: 'discovered_attack', sub: isKing ? 'check' : '', stake: lost.gain, why: 'material', slots: { ...common, P: the(piece.type), S: the(p.type), T: the(R1.get(tsq)!.type), tsq, moves: gv(piece.type, 'זז', 'זזה'), standsS: gv(p.type, 'עומד', 'עומדת') } });
        break;
      }
    }
    // Hanging piece: the reply simply takes a piece of ours that nobody (or not enough) defends.
    if (r0.captured) {
      const sq = r0.to; const victim = A.get(sq)!;
      const ep = enPrise(A, sq);
      if (victim && victim.color === me && ep.hit && lost.gain >= 1 && lost.gain <= VALUE[victim.type] + 1) {
        const P = the(victim.type);
        const vs = { ...common, noguard: ep.undefended ? 'בלי הגנה' : 'בלי מספיק הגנה', P, sq, he: gv(victim.type, 'הוא', 'היא'), prot: gv(victim.type, 'מוגן', 'מוגנת'), unprot: ep.undefended ? gv(victim.type, 'לא מוגן', 'לא מוגנת') : gv(victim.type, 'לא מוגן מספיק', 'לא מוגנת מספיק'), it: gv(victim.type, 'אותו', 'אותה'), stands: gv(victim.type, 'עומד', 'עומדת'), was: gv(victim.type, 'היה', 'הייתה'), attacked: gv(victim.type, 'מותקף', 'מותקפת') };
        const playedCapture = !!playedMove.captured && playedMove.to === sq;
        // A capture answered by a recapture of the same value is an even trade: the loss is elsewhere in the line.
        const evenTrade = playedCapture && VALUE[playedMove.captured] >= VALUE[victim.type];
        if (evenTrade) { /* no hanging piece here */ }
        else if (playedCapture && playedMove.captured !== 'p' && exchangeLoses(Chess, input.fenBefore, playedMove)) {
          // Our capture there was answered by a recapture that wins: a bad trade, not a piece left hanging.
          const T = playedMove.captured as string;
          add({ category: 'bad_trade', sub: 'wrong_piece', stake: lost.gain, why: 'material', slots: { ...common, P: the(playedMove.piece), T: the(T), Tn: NAME[T] } });
        } else if (sq === playedMove.to) {
          if (ep.undefended) add({ category: 'hanging_piece', sub: 'moved', stake: lost.gain, why: 'material', slots: vs });
          else if (!ep.cheaper) add({ category: 'hanging_piece', sub: 'moved_outnumbered', stake: lost.gain, why: 'material', slots: vs });
          else add({ category: 'hanging_piece', sub: 'moved_cheap', stake: lost.gain, why: 'material', slots: { ...vs, A: the(A.get(ep.cheaper)!.type), attacks: gv(A.get(ep.cheaper)!.type, 'תוקף', 'תוקפת') } });
        } else {
          const epBefore = enPrise(B0, sq);
          const defendedBefore = B0.get(sq)?.type === victim.type && attackersOf(B0, sq, me).includes(input.played.from);
          if (defendedBefore) add({ category: 'hanging_piece', sub: 'left', stake: lost.gain, why: 'material', slots: { ...vs, M: the(playedMove.piece), from: input.played.from, itM: gv(playedMove.piece, 'אותו', 'אותה'), left: gv(playedMove.piece, 'עזב', 'עזבה') } });
          else if (B0.get(sq)?.type === victim.type && epBefore.hit) add({ category: 'hanging_piece', sub: 'already', stake: lost.gain, why: 'material', slots: vs,
            idea: best.length && (best[0].from === sq ? !enPrise(readBoard(best[0].fenAfter, Chess), best[0].to).hit : (readBoard(best[0].fenAfter, Chess).get(sq)?.color === me && !enPrise(readBoard(best[0].fenAfter, Chess), sq).hit))
              ? { key: 'saves', slots: { P } } : undefined });
          else add({ category: 'hanging_piece', sub: 'already', stake: lost.gain, why: 'material', slots: vs });
        }
      }
    }
  }
  // Our own capture that loses material when the line recaptures (a trade with the wrong piece).
  if (playedMove.captured && playedMove.captured !== 'p' && r0 && r0.captured && r0.to === playedMove.to && lost.gain >= 1 && !findings.some(f => f.category === 'bad_trade')) {
    if (exchangeLoses(Chess, input.fenBefore, playedMove)) add({ category: 'bad_trade', sub: 'wrong_piece', stake: lost.gain, why: 'material', slots: { gain: gainWords(lost.gain, lost.taken).bet.slice(1), gainNoun: gainWords(lost.gain, lost.taken).noun, P: the(playedMove.piece), T: the(playedMove.captured), Tn: NAME[playedMove.captured] } });
  }

  // ---- What the best line had and the move missed ----
  if (best.length && missed.gain >= 1 && best[0].uci !== playedUci && !bestMates) {
    const b0 = best[0]; const Bb = readBoard(b0.fenAfter, Chess); const piece = Bb.get(b0.to)!;
    const gw = missedWords(missed.gain); const stakeM = Math.max(1, Math.min(missed.gain, missedRaw.gain > 0 ? missedRaw.gain : missed.gain));
    const targets = attacksFrom(Bb, b0.to).filter(s => { const t = Bb.get(s); return t && t.color === them && (t.type === 'k' || (VALUE[t.type] >= 3 && (VALUE[t.type] > VALUE[piece.type] || !attackersOf(Bb, s, them).length))); })
      .sort((a, b) => VALUE[Bb.get(b)!.type] - VALUE[Bb.get(a)!.type]);
    const wins = (sq: string) => best.some(st => st.color === me && st.captured && st.to === sq);
    const safe = !enPrise(Bb, b0.to).hit || targets.some(s => Bb.get(s)!.type === 'k');
    if (targets.length >= 2 && safe && targets.slice(1).some(wins) && missed.gain >= 2) {
      const check = targets.some(s => Bb.get(s)!.type === 'k'); const tl = targets.filter(s => Bb.get(s)!.type !== 'k');
      const ti = (s: string) => `${the(Bb.get(s)!.type)} ב-${s}`;
      add({ category: 'missed_fork', sub: check ? 'check' : '', stake: stakeM, why: 'missed_gain', slots: { gainNoun: gw.noun, F: the(piece.type), attacks: gv(piece.type, 'תוקף', 'תוקפת'), gives: gv(piece.type, 'נותן', 'נותנת'), t1: ti(check ? tl[0] : targets[0]), t2: check ? '' : ti(targets[1]), falls: gv(Bb.get(tl[0])!.type, 'נופל', 'נופלת') } });
    } else if (b0.captured && !(playedMove.captured && playedMove.to === b0.to)) {
      const tsq = (b0.uci && B0.get(b0.to)) ? b0.to : b0.to; const T = b0.captured;
      const free = !attackersOf(B0, tsq, them).length || VALUE[T] > VALUE[B0.get(b0.from)!.type];
      if (missed.gain >= 1) add({ category: 'missed_capture', sub: free ? '' : 'line', stake: stakeM, why: 'missed_gain', slots: { T: the(T), tsq, was: gv(T, 'היה', 'הייתה'), open: gv(T, 'פתוח', 'פתוחה'), gainNoun: gw.noun },
        idea: best.length >= 2 ? { key: 'line', slots: { line: best.slice(0, 4).map(s => s.san).join(' ') } } : undefined });
    }
  }

  // ---- Position: the opening, the king, the structure, the endgame ----
  const pieceMoved = playedMove.piece as string;
  const homeRank = me === 'w' ? '1' : '8';
  const ksq = kingSq(B0, me);
  const castled = !['e1', 'e8'].includes(ksq) && ['g1', 'c1', 'g8', 'c8', 'b1', 'h1', 'b8', 'h8'].includes(ksq);
  const playedCastle = /O-O/.test(san);
  const bestCastle = /O-O/.test(bestSan);
  if (opening && queens > 0 && !castled && !playedCastle) {
    const rights = input.fenBefore.split(' ')[2];
    const hasRights = me === 'w' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
    const checks = reply.filter(st => st.color === them && /\+/.test(st.san)).length;
    if (bestCastle) add({ category: 'king_safety', sub: 'castle', stake: 0.6, why: 'position', slots: { ksq }, idea: { key: 'castle', slots: {} } });
    else if (pieceMoved === 'k' && hasRights) add({ category: 'king_safety', sub: 'king_moved', stake: 0.6, why: 'position', slots: {} });
    else if (checks >= 1 && drop >= 10 && pieceMoved === 'p' && Math.abs(FILES.indexOf(playedMove.from[0]) - FILES.indexOf(ksq[0])) <= 1 && Math.abs(Number(playedMove.from[1]) - Number(ksq[1])) === 1
      && reply.some(st => st.color === them && /\+/.test(st.san) && throughSquare(readBoard(st.fenAfter, Chess), st.to, kingSq(readBoard(st.fenAfter, Chess), me), playedMove.from))) add({ category: 'king_safety', sub: 'exposed', stake: 0.6, why: 'position', slots: { ksq: kingSq(A, me), opened: playedMove.from } });
  }
  if (opening && fullmove <= 12) {
    const home = homeMinors(B0, me);
    const homeAfter = homeMinors(A, me);
    if (pieceMoved === 'q' && home.length >= 2) {
      const R1 = r0 ? readBoard(r0.fenAfter, Chess) : null;
      const qsq = playedMove.to;
      const hit = R1 && R1.get(qsq)?.type === 'q' && attackersOf(R1, qsq, them).some(a => VALUE[R1.get(a)!.type] < 9) && !r0!.captured;
      const devIdea = best[0] && 'nb'.includes(B0.get(best[0].from)?.type || '') && best[0].from[1] === homeRank ? { key: 'develop', slots: { P: the(B0.get(best[0].from)!.type), sq: best[0].to } } : undefined;
      if (hit) add({ category: 'queen_early', sub: '', stake: 0.7, why: 'position', slots: { count: home.length }, idea: devIdea });
      else if (devIdea) add({ category: 'queen_early', sub: 'dev', stake: 0.5, why: 'position', slots: { count: home.length, list: listPieces(B0, home) }, idea: devIdea });
    } else if (home.length >= 2 && homeAfter.length === home.length && !playedCastle && !(pieceMoved === 'p' && 'de'.includes(playedMove.from[0])) && best[0] && 'nb'.includes(B0.get(best[0].from)?.type || '') && best[0].from[1] === homeRank && !playedMove.captured) {
      add({ category: 'undeveloped', sub: '', stake: 0.5, why: 'position', slots: { count: home.length, list: listPieces(B0, home) }, idea: { key: 'develop', slots: { P: the(B0.get(best[0].from)!.type), sq: best[0].to } } });
    }
  }
  if (!endgame && fullmove <= 20) {
    const CENTER = ['d4', 'e4', 'd5', 'e5'];
    const pawnThreat = best[0] ? attacksFrom(readBoard(best[0].fenAfter, Chess), best[0].to).some(t => { const q = readBoard(best[0].fenAfter, Chess).get(t); return q && q.color === them && VALUE[q.type] >= 3; }) : false;
    if (best[0] && B0.get(best[0].from)?.type === 'p' && CENTER.includes(best[0].to) && !best[0].captured && !pawnThreat && !(pieceMoved === 'p' && CENTER.includes(playedMove.to)))
      add({ category: 'lost_center', sub: 'missed', stake: 0.4, why: 'position', slots: { csq: best[0].to }, idea: { key: 'center', slots: { csq: best[0].to } } });
    else if (r0 && A.get(r0.from)?.type === 'p' && CENTER.includes(r0.to) && !(best[0] && best[0].to === r0.to)
      && readBoard((reply[reply.length - 1] || r0).fenAfter, Chess).get(r0.to)?.type === 'p' && readBoard((reply[reply.length - 1] || r0).fenAfter, Chess).get(r0.to)?.color === them)
      add({ category: 'lost_center', sub: '', stake: 0.4, why: 'position', slots: { csq: r0.to } });
  }
  // Trading when behind: an even exchange of pieces while down material.
  if (playedMove.captured && playedMove.captured !== 'p' && r0 && r0.captured && r0.to === playedMove.to && VALUE[playedMove.captured] === VALUE[r0.captured]) {
    const deficit = material(B0, them) - material(B0, me);
    if (deficit >= 2 && best[0] && !best[0].captured) add({ category: 'bad_trade', sub: 'behind', stake: 0.5, why: 'position', slots: { deficit: points(deficit) } });
  }
  // Pawn structure: weaknesses the move made (compared with the best move), passed pawns.
  {
    // Compared where both lines end, so a recapture that undoubles the pawns is counted.
    const endPlayed = readBoard((reply[reply.length - 1]?.fenAfter) || fenAfter, Chess);
    const endBest = best.length ? readBoard(best[best.length - 1].fenAfter, Chess) : endPlayed;
    const wPlayed = pawnWeak(endPlayed, me); const wBest = pawnWeak(endBest, me);
    const wNow = pawnWeak(A, me); const wBefore = pawnWeak(B0, me);
    const parts: string[] = [];
    const dFile = wPlayed.doubled > wBest.doubled && wNow.doubled > wBefore.doubled ? (wPlayed.dFiles.filter(f => !wBest.dFiles.includes(f))[0] || wPlayed.dFiles[0]) : '';
    const iFile = wPlayed.isolated > wBest.isolated && wNow.isolated > wBefore.isolated ? (wPlayed.iFiles.filter(f => !wBest.iFiles.includes(f))[0] || wPlayed.iFiles[0]) : '';
    if (dFile && dFile === iFile) parts.push(`רגלים כפולים ומבודדים בטור ${dFile}`);
    else { if (dFile) parts.push(`רגלים כפולים בטור ${dFile}`); if (iFile) parts.push(`רגלי מבודד בטור ${iFile}`); }
    if (parts.length) add({ category: 'pawn_structure', sub: 'weakened', stake: 0.45, why: 'position', slots: { weak: parts.join(' ו') } });
    const pushes = reply.filter(st => st.color === them && readBoard(st.fenBefore, Chess).get(st.from)?.type === 'p' && passed(readBoard(st.fenBefore, Chess), st.from));
    if (r0 && pushes.length && pushes[0] === r0) {
      const prank = Number(r0.to[1]); const far = them === 'w' ? prank >= 6 : prank <= 3;
      if (far || pushes.length >= 2) add({ category: 'pawn_structure', sub: /=/.test(r0.san) ? 'promotes' : 'passer_ignored', stake: endgame ? 1.5 : 0.6, why: 'position', slots: { psq: r0.from } });
    }
    const advanced = (s: string) => me === 'w' ? Number(s[1]) >= 5 : Number(s[1]) <= 4;
    const pushThreat = best[0] ? attacksFrom(readBoard(best[0].fenAfter, Chess), best[0].to).some(t => { const q = readBoard(best[0].fenAfter, Chess).get(t); return q && q.color === them && q.type !== 'p'; }) : false;
    if (best[0] && B0.get(best[0].from)?.type === 'p' && B0.get(best[0].from)?.color === me && passed(B0, best[0].from) && (endgame || advanced(best[0].from)) && !pushThreat && !(pieceMoved === 'p' && passed(B0, playedMove.from)) && !best[0].captured)
      add({ category: 'pawn_structure', sub: 'own_passer', stake: endgame ? 1.4 : 0.5, why: 'position', slots: { psq: best[0].from } });
  }
  if (endgame && best[0]) {
    const b0 = best[0]; const mover0 = B0.get(b0.from)!;
    const onlyPawns = nonPawn(B0, me) === 0 && nonPawn(B0, them) === 0;
    if (mover0.type === 'k' && pieceMoved !== 'k') {
      const centerDist = (s: string) => Math.abs(FILES.indexOf(s[0]) - 3.5) + Math.abs(Number(s[1]) - 4.5);
      if (centerDist(b0.to) < centerDist(b0.from)) add({ category: 'endgame_king', sub: '', stake: 0.8, why: 'position', slots: { ksq: b0.from }, idea: { key: 'king_up', slots: { sq: b0.to } } });
    }
    if (onlyPawns && mover0.type === 'k') {
      const Bb = readBoard(b0.fenAfter, Chess); const a = kingSq(Bb, me), o = kingSq(Bb, them);
      const df = Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(o[0])), dr = Math.abs(Number(a[1]) - Number(o[1]));
      const opp = (df === 0 && dr === 2) || (dr === 0 && df === 2);
      const ap = kingSq(A, me);
      const pdf = Math.abs(FILES.indexOf(ap[0]) - FILES.indexOf(o[0])), pdr = Math.abs(Number(ap[1]) - Number(kingSq(A, them)[1]));
      const playedOpp = pieceMoved === 'k' && ((pdf === 0 && pdr === 2) || (pdr === 0 && pdf === 2));
      if (opp && !playedOpp) add({ category: 'endgame_opposition', sub: '', stake: 1.2, why: 'position', slots: {} });
    }
    if (mover0.type === 'r' && pieceMoved !== 'r' || (mover0.type === 'r' && pieceMoved === 'r' && playedMove.from !== b0.from)) {
      const Bb = readBoard(b0.fenAfter, Chess);
      for (const [s, p] of Bb) {
        if (p.type !== 'p' || s[0] !== b0.to[0] || !passed(Bb, s)) continue;
        const dir = p.color === 'w' ? 1 : -1; const behind = (Number(b0.to[1]) - Number(s[1])) * dir < 0;
        const between = [...Bb.keys()].some(t => t[0] === s[0] && t !== s && t !== b0.to && (Number(t[1]) - Number(s[1])) * (Number(t[1]) - Number(b0.to[1])) < 0);
        if (behind && !between) { add({ category: 'endgame_rook', sub: '', stake: 1, why: 'position', slots: { psq: s }, idea: { key: 'rook_behind', slots: {} } }); break; }
      }
    }
  }

  // Pick: mate first, then the biggest material at stake, then the positional finding.
  const ORDER: CategoryKey[] = ['missed_mate', 'back_rank', 'mate_threat', 'fork', 'hanging_piece', 'bad_trade', 'skewer', 'pin', 'discovered_attack', 'missed_fork', 'missed_capture',
    'endgame_opposition', 'endgame_rook', 'endgame_king', 'pawn_structure', 'king_safety', 'queen_early', 'undeveloped', 'lost_center', 'general'];
  findings.sort((a, b) => (b.stake - a.stake) || (ORDER.indexOf(a.category) - ORDER.indexOf(b.category)));
  // A positional finding is not the story when the reply line wins material: then it is a plain loss of material.
  const pick = findings[0];
  const seed = input.variant ?? hash(input.fenBefore + playedUci);
  const choose = (arr: string[]) => arr[seed % arr.length];
  // The idea behind the better move: a checked category idea, else the first board reason of the best move.
  const REL = /^(לוקח|מוציא|מגן|מאיים|נותן|פותח|דוחף|מפתח|תופס|מצריח|מכתיר|עוצר)\s/;
  const betterFor = (f?: Finding) => {
    if (!bestSan) return '';
    if (f?.idea) return fill(choose(IDEA_INF.includes(f.idea.key) ? BETTER.inf : BETTER.sentence), { best: bestSan, idea: fill(IDEA[f.idea.key], f.idea.slots) });
    const ex = explainBestMove(Chess, input.fenBefore, best.map(s => s.uci));
    const r = ex?.reasons.find(x => !x.key.startsWith('line_') && x.key !== 'quiet' && x.key !== 'mate');
    if (!r) return fill(choose(BETTER.plain), { best: bestSan });
    return fill(choose(REL.test(r.text) ? BETTER.rel : BETTER.sentence), { best: bestSan, idea: r.text });
  };

  if (!pick || (pick.stake < 1 && (lost.gain >= 1 || missed.gain >= 2))) {
    // No detector fired, or only a positional one while a line wins material the detectors could not name.
    const kind = lost.gain >= 1 && replySan ? 'material' : missed.gain >= 1 && bestSan ? 'missed' : 'position';
    const gw = kind === 'material' ? gainWords(lost.gain, lost.taken) : kind === 'missed' ? gainWords(missed.gain, missed.taken) : null;
    const what = fill(choose(FALLBACK[replySan || kind === 'missed' ? kind : 'position'].filter(t => replySan || !t.includes('{reply}')).concat(replySan ? [] : ['ב-{move} המנוע מעדיף מהלך אחר.'])), { ...base });
    const why = fill(choose(kind === 'material' ? WHY.material : kind === 'missed' ? WHY.missed_gain : WHY.position), { gainNoun: gw?.noun || '-', swing });
    const better = betterFor(undefined);
    const text = [what, why, better].filter(Boolean);
    return { category: 'general', sub: kind, label: CATEGORY_LABEL.general, moveLabel, moveNumber, san, bestSan, replySan, stake: Math.max(lost.gain, missed.gain, 0), what, why, better, text, drop, facts: { lost: lost.gain, missed: missed.gain, findings: findings.map(f => f.sub ? f.category + '.' + f.sub : f.category) } };
  }
  const key = pick.sub ? `${pick.category}.${pick.sub}` : pick.category;
  const slots = { ...base, ...pick.slots };
  const what = fill(choose(WHAT[key]), slots);
  // The consequence follows the lines: mate, material the reply line wins, material the best line had, or the position.
  const whyKey = pick.why === 'mate' || pick.why === 'missed_mate' ? pick.why : pick.why === 'missed_gain' ? 'missed_gain' : lost.gain >= 1 ? 'material' : 'position';
  if (whyKey === 'material' && !pick.slots.gainNoun) pick.slots.gainNoun = gainWords(lost.gain, lost.taken).noun;
  const whySlots = { swing, gainNoun: whyKey === 'missed_gain' ? missedWords(missed.gain).noun : (pick.slots.gainNoun || gainWords(Math.max(1, Math.round(pick.stake)), []).noun) };
  const why = fill(choose(WHY[whyKey]), whySlots);
  // A missed chance already names the better move in its first sentence; its idea comes only from a checked fact.
  const namesBest = ['missed_mate', 'missed_capture', 'missed_fork', 'endgame_king', 'endgame_rook', 'endgame_opposition'].includes(pick.category) || (pick.category === 'lost_center' && pick.sub === 'missed') || pick.sub === 'own_passer';
  const better = namesBest ? (pick.idea ? (IDEA_INF.includes(pick.idea.key) ? 'הרעיון: ' : '') + fill(IDEA[pick.idea.key], pick.idea.slots) : '') : betterFor(pick);
  const text = [what, why, better].filter(Boolean);
  return { category: pick.category, sub: pick.sub, label: CATEGORY_LABEL[pick.category], moveLabel, moveNumber, san, bestSan, replySan, stake: pick.stake, what, why, better, text, drop, facts: { lost: lost.gain, missed: missed.gain, findings: findings.map(f => f.sub ? f.category + '.' + f.sub : f.category) } };
}

// The slider on `from` gives check to the king on `king` along a line that passes over `sq` (the square a pawn left).
function throughSquare(b: Board, from: string, king: string, sq: string) {
  const p = b.get(from); if (!p || !DIRS[p.type] || !king) return false;
  const df = Math.sign(FILES.indexOf(king[0]) - FILES.indexOf(from[0])), dr = Math.sign(Number(king[1]) - Number(from[1]));
  let f = FILES.indexOf(from[0]) + df, r = Number(from[1]) + dr;
  while (f >= 0 && f < 8 && r >= 1 && r <= 8) { const t = FILES[f] + r; if (t === king) return false; if (t === sq) return attacksFrom(b, from).includes(king); f += df; r += dr; }
  return false;
}

// Our capture loses material: what we took is worth less than what we give when the opponent recaptures.
function exchangeLoses(Chess: ChessCtor, fen: string, mv: any) {
  const after = new Chess(fen); after.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined });
  const recaptures = after.moves({ verbose: true }).filter((m: any) => m.to === mv.to);
  if (!recaptures.length) return false;
  return VALUE[mv.promotion || mv.piece] > VALUE[mv.captured];
}

export const MISTAKE_CLASSES = ['inaccuracy', 'mistake', 'miss', 'blunder'];

export type SummaryItem = { ply: number; moveLabel: string; category: CategoryKey; label: string; drop: number; text: string };
export type GameSummary = { top: SummaryItem[]; frequent: { category: CategoryKey; label: string; count: number } | null; total: number; lines: string[] };

// The game summary: the three biggest mistakes (by the drop in winning chance) with their category and move,
// and the category that came up most often in this game (ties go to the one that cost more in total).
export function summarizeGame(items: { ply: number; diagnosis: Diagnosis }[]): GameSummary {
  const all = items.filter(x => x.diagnosis);
  if (!all.length) return { top: [], frequent: null, total: 0, lines: [SUMMARY.none] };
  const top = [...all].sort((a, b) => b.diagnosis.drop - a.diagnosis.drop || a.ply - b.ply).slice(0, 3)
    .map(x => ({ ply: x.ply, moveLabel: x.diagnosis.moveLabel, category: x.diagnosis.category, label: x.diagnosis.label, drop: x.diagnosis.drop, text: x.diagnosis.what }));
  const counts = new Map<CategoryKey, { count: number; drop: number }>();
  for (const x of all) { const c = counts.get(x.diagnosis.category) || { count: 0, drop: 0 }; c.count++; c.drop += x.diagnosis.drop; counts.set(x.diagnosis.category, c); }
  // The plain fallback is not a kind of mistake, so it is not named as the most frequent one.
  const ranked = [...counts].filter(([k]) => k !== 'general').sort((a, b) => b[1].count - a[1].count || b[1].drop - a[1].drop);
  const [cat, c] = ranked[0] || ['general' as CategoryKey, { count: 0, drop: 0 }];
  const frequent = { category: cat, label: CATEGORY_LABEL[cat], count: c.count };
  const lines = [SUMMARY.top, ...top.map((t, i) => `${i + 1}. ${t.moveLabel}: ${t.label}`), c.count > 1 ? fill(SUMMARY.frequent, { label: frequent.label, count: c.count }) : SUMMARY.frequentOnce];
  return { top, frequent, total: all.length, lines };
}
