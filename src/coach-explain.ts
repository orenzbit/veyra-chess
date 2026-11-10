// The coach's "why?" (COACH_EXPLAIN_ENABLED): a short Hebrew explanation of why the engine's best move is best,
// and the next moves of the engine's line (its principal variation) as steps for the board.
// Every sentence is a template filled from facts computed here on the board (captures, checks, attacked and
// defended pieces, lines opened, material along the line) or reported by the engine (its line, its mate score).
// Nothing is guessed: a template only fires when its fact is true on the board.

type Piece = { type: string; color: 'w' | 'b' };
type Board = Map<string, Piece>;
type ChessLike = {
  board: () => ({ square: string; type: string; color: 'w' | 'b' } | null)[][];
  move: (m: { from: string; to: string; promotion?: string }) => any;
  moves: (o?: any) => any[];
  fen: () => string;
  turn: () => 'w' | 'b';
  isCheckmate: () => boolean;
  inCheck: () => boolean;
};
type ChessCtor = new (fen?: string) => ChessLike;

export type CoachReason = { key: string; text: string };
export type CoachStep = { uci: string; san: string; from: string; to: string; color: 'w' | 'b'; captured: string | null; fenBefore: string; fenAfter: string };
export type CoachExplanation = { fen: string; bestSan: string; mover: 'w' | 'b'; reasons: CoachReason[]; steps: CoachStep[] };

export const COACH_MAX_STEPS = 5;
export const COACH_MIN_STEPS = 3;
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME: Record<string, string> = { p: 'רגלי', n: 'פרש', b: 'רץ', r: 'צריח', q: 'מלכה', k: 'מלך' };
const SIDE = { w: 'לבן', b: 'שחור' };
const FILES = 'abcdefgh';

function sq(f: number, r: number) { return FILES[f] + (r + 1); }
function fr(s: string): [number, number] { return [FILES.indexOf(s[0]), Number(s[1]) - 1]; }
function the(p: Piece | string) { return 'ה' + NAME[typeof p === 'string' ? p : p.type]; }
// Hebrew verbs agree with the piece: the queen is feminine, every other piece masculine.
function g(p: Piece | string, masc: string, fem: string) { return (typeof p === 'string' ? p : p.type) === 'q' ? fem : masc; }

function readBoard(c: ChessLike): Board {
  const b: Board = new Map();
  for (const row of c.board()) for (const cell of row) if (cell) b.set(cell.square, { type: cell.type, color: cell.color });
  return b;
}

// Squares the piece on `from` attacks (not moves to): pawns attack diagonally, sliders stop at the first piece.
export function attacksFrom(b: Board, from: string): string[] {
  const p = b.get(from); if (!p) return [];
  const [f, r] = fr(from); const out: string[] = [];
  const add = (df: number, dr: number) => { const nf = f + df, nr = r + dr; if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.push(sq(nf, nr)); };
  const ray = (df: number, dr: number) => { let nf = f + df, nr = r + dr; while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) { const s = sq(nf, nr); out.push(s); if (b.has(s)) break; nf += df; nr += dr; } };
  if (p.type === 'p') { const d = p.color === 'w' ? 1 : -1; add(-1, d); add(1, d); }
  else if (p.type === 'n') for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) add(df, dr);
  else if (p.type === 'k') for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) { if (df || dr) add(df, dr); }
  else {
    if (p.type === 'b' || p.type === 'q') for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ray(df, dr);
    if (p.type === 'r' || p.type === 'q') for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ray(df, dr);
  }
  return out;
}

export function attackersOf(b: Board, target: string, color: 'w' | 'b'): string[] {
  const out: string[] = [];
  for (const [s, p] of b) if (p.color === color && attacksFrom(b, s).includes(target)) out.push(s);
  return out;
}

// A piece is in danger when the other side attacks it and either nobody defends it or a cheaper piece attacks it.
function inDanger(b: Board, s: string): boolean {
  const p = b.get(s); if (!p || p.type === 'k') return false;
  const enemy = p.color === 'w' ? 'b' : 'w';
  const attackers = attackersOf(b, s, enemy); if (!attackers.length) return false;
  if (!attackersOf(b, s, p.color).length) return true;
  return attackers.some(a => VALUE[b.get(a)!.type] < VALUE[p.type]);
}


function uciMove(uci: string) { return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined }; }

function points(n: number) { return n === 1 ? 'נקודה אחת' : `${n} נקודות`; }

// The other side's mate-in-one threats in this position, as if it were their turn (a null move). Empty when
// the side to move is in check (the null move would be illegal) or nothing mates.
function mateThreats(Chess: ChessCtor, fen: string): string[] {
  const parts = fen.split(' ');
  const probe = new Chess(fen); if (probe.inCheck()) return [];
  parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
  let c: ChessLike; try { c = new Chess(parts.join(' ')); } catch { return []; }
  const out: string[] = [];
  for (const m of c.moves({ verbose: true })) {
    const t = new Chess(c.fen()); const mv = t.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
    if (mv && t.isCheckmate()) out.push(mv.san);
  }
  return out;
}

// The engine line from `fen` as board steps; stops at the first move that is not legal (it never should be).
export function lineSteps(Chess: ChessCtor, fen: string, pvUci: string[], max = COACH_MAX_STEPS): CoachStep[] {
  const c = new Chess(fen); const steps: CoachStep[] = [];
  for (const uci of pvUci.slice(0, max)) {
    const before = c.fen(); const color = c.turn();
    let mv: any = null; try { mv = c.move(uciMove(uci)); } catch { mv = null; }
    if (!mv) break;
    steps.push({ uci, san: mv.san, from: mv.from, to: mv.to, color, captured: mv.captured || null, fenBefore: before, fenAfter: c.fen() });
  }
  return steps;
}

// The engine's line from `fen`, at least COACH_MIN_STEPS moves when the game goes on that long. A line the engine
// cut short (it can stop at a transposition) is continued with the engine's best line from where it stopped.
// `ask` sends one request to the engine worker ({ type: 'pv', fen, plies }) and resolves to { pv, score, depth }.
export async function engineLine(Chess: ChessCtor, fen: string, ask: (req: { type: 'pv'; fen: string; plies: number }) => Promise<{ pv: string[] }>) {
  const pv: string[] = [];
  for (let round = 0; round < COACH_MAX_STEPS && pv.length < COACH_MIN_STEPS; round++) {
    const steps = lineSteps(Chess, fen, pv, pv.length);
    const at = steps.length ? steps[steps.length - 1].fenAfter : fen;
    if (steps.length !== pv.length || new Chess(at).moves().length === 0) break;
    const r = await ask({ type: 'pv', fen: at, plies: COACH_MAX_STEPS - pv.length });
    const more = (r?.pv || []).slice(0, COACH_MAX_STEPS - pv.length);
    if (!more.length || lineSteps(Chess, at, more, more.length).length !== more.length) break;
    pv.push(...more);
  }
  return pv;
}

export function explainBestMove(Chess: ChessCtor, fen: string, pvUci: string[]): CoachExplanation | null {
  const steps = lineSteps(Chess, fen, pvUci);
  if (!steps.length) return null;
  const best = steps[0]; const me = best.color; const them = me === 'w' ? 'b' : 'w';
  const c0 = new Chess(fen); const before = readBoard(c0);
  const mover = before.get(best.from)!;
  const c1 = new Chess(fen); const mv = c1.move(uciMove(best.uci)); const after = readBoard(c1);
  const moved = after.get(best.to)!;
  const reasons: CoachReason[] = [];
  const say = (key: string, text: string) => { if (!reasons.some(r => r.key === key)) reasons.push({ key, text }); };

  if (c1.isCheckmate()) say('mate', `${best.san} הוא מט: למלך ה${me === 'w' ? 'שחור' : 'לבן'} אין לאן לברוח.`);

  // 1. Material: what it takes, and whether it can be taken back.
  const captured = mv.captured as string | undefined;
  if (captured) {
    const recapture = c1.moves({ verbose: true }).some((m: any) => m.to === best.to);
    const capturedSq = (mv.flags || '').includes('e') ? best.to[0] + best.from[1] : best.to;
    if (!recapture) say('capture_free', `לוקח את ${the(captured)} ב-${capturedSq} בחינם: ל${SIDE[them]} אין איך לקחת בחזרה.`);
    else if (VALUE[captured] > VALUE[mover.type]) say('capture_up', `לוקח את ${the(captured)} ב-${capturedSq} עם ${the(mover)}: גם אם ${SIDE[them]} ייקח בחזרה, ${SIDE[me]} מרוויח בחילוף.`);
    else say('capture', `לוקח את ${the(captured)} ב-${capturedSq}.`);
  }
  if (mv.promotion) say('promotion', `מכתיר את הרגלי ל${NAME[mv.promotion]}.`);
  if ((mv.flags || '').includes('k') || (mv.flags || '').includes('q')) say('castle', 'מצריח: המלך עובר למקום בטוח והצריח נכנס למשחק.');

  // 2. Defence: stops a mate threat, or rescues a piece that was in danger.
  if (!c1.isCheckmate()) {
    const threatsBefore = mateThreats(Chess, fen);
    if (threatsBefore.length && !mateThreats(Chess, c1.fen()).length) say('stops_mate', `עוצר איום מט: ${SIDE[them]} איים לשחק ${threatsBefore[0]} ולתת מט.`);
  }
  for (const [s, p] of before) {
    if (p.color !== me || !inDanger(before, s)) continue;
    const now = s === best.from ? best.to : s;
    if (after.get(now)?.color !== me || inDanger(after, now)) continue;
    if (s === best.from) say('escape', `מוציא את ${the(p)} מסכנה: ב-${s} ${g(p, 'הוא היה מותקף', 'היא הייתה מותקפת')}.`);
    else say('defend', `מגן על ${the(p)} ב-${s}, ${g(p, 'שהיה מותקף', 'שהייתה מותקפת')}.`);
  }

  // 3. Attack: check, fork, threats from the moved piece, and lines it opens for other pieces.
  const targets = attacksFrom(after, best.to).filter(s => {
    const t = after.get(s); if (!t || t.color !== them) return false;
    return t.type === 'k' || VALUE[t.type] > VALUE[moved.type] || !attackersOf(after, s, them).length;
  });
  const check = c1.inCheck() && !c1.isCheckmate();
  const pieces = targets.filter(s => after.get(s)!.type !== 'k' && VALUE[after.get(s)!.type] >= 3)
    .sort((a, b) => VALUE[after.get(b)!.type] - VALUE[after.get(a)!.type]);
  const pawns = targets.filter(s => after.get(s)!.type === 'p');
  const safe = !inDanger(after, best.to); // a piece that can simply be taken threatens nothing
  const on = (s: string) => `${the(after.get(s)!)} ב-${s}`;
  if (safe && check && pieces.length) say('fork', `מזלג: ${the(moved)} ${g(moved, 'נותן', 'נותנת')} שח ובאותו זמן ${g(moved, 'תוקף', 'תוקפת')} את ${on(pieces[0])}.`);
  else if (safe && pieces.length >= 2) say('fork', `מזלג: ${the(moved)} ${g(moved, 'תוקף', 'תוקפת')} בבת אחת את ${on(pieces[0])} ואת ${on(pieces[1])}.`);
  else if (safe && (pieces.length || pawns.length)) say('threat', `מאיים לקחת את ${on(pieces[0] || pawns[0])}.`);
  for (const [s, p] of after) {
    if (p.color !== me || s === best.to || !'bqr'.includes(p.type)) continue;
    if (before.get(s)?.type !== p.type || before.get(s)?.color !== me) continue; // a castling rook is not a line opened
    const was = new Set(attacksFrom(before, s));
    const fresh = attacksFrom(after, s).find(t => !was.has(t) && after.get(t)?.color === them && (after.get(t)!.type === 'k' || VALUE[after.get(t)!.type] >= 3));
    if (!fresh) continue;
    if (after.get(fresh)!.type === 'k') say('discovered_check', `שח בגילוי: המהלך פותח את הקו של ${the(p)} ב-${s} אל המלך.`);
    else say('opens_line', `פותח קו: עכשיו ${the(p)} ב-${s} ${g(p, 'תוקף', 'תוקפת')} את ${the(after.get(fresh)!)} ב-${fresh}.`);
    break;
  }
  if (check && !reasons.some(r => r.key === 'fork' || r.key === 'discovered_check')) say('check', `נותן שח: ${SIDE[them]} חייב קודם כול להציל את המלך.`);

  // 4. Quiet moves: a pawn one step from promotion, development, the centre.
  if (mover.type === 'p' && !mv.promotion && best.to[1] === (me === 'w' ? '7' : '2')) say('push', `דוחף את הרגלי ל-${best.to}: עוד צעד אחד והוא מוכתר.`);
  if (!reasons.length) {
    const homeRank = me === 'w' ? '1' : '8';
    if ((mover.type === 'n' || mover.type === 'b') && best.from[1] === homeRank) say('develop', `מפתח את ${the(mover)} מהשורה האחורית למשחק.`);
    if (['d4', 'e4', 'd5', 'e5'].includes(best.to)) say('center', `תופס את המרכז ב-${best.to}.`);
  }

  // 5. Where the engine's line leads: mate, or the material balance after the steps shown.
  const last = steps[steps.length - 1];
  // Material won or given along the line: captures only (a promotion is not counted as material won).
  const gain = steps.reduce((sum, st) => sum + (st.captured ? (st.color === me ? 1 : -1) * VALUE[st.captured] : 0), 0);
  const endPos = new Chess(last.fenAfter); const endMate = endPos.isCheckmate();
  // The material count is only stated when the line ends after an exchange is over, not between a capture and its recapture.
  const lastWasCapture = readBoard(new Chess(last.fenBefore)).has(last.to);
  const settled = !(lastWasCapture && endPos.moves({ verbose: true }).some((m: any) => m.to === last.to));
  if (endMate && steps.length > 1) say('line_mate', `השורה של המנוע נגמרת במט אחרי ${steps.length} מהלכים.`);
  else if (settled && steps.length > 1 && gain > 0 && !reasons.some(r => r.key === 'capture_free')) say('line_gain', `אחרי ${steps.length} המהלכים של השורה, ${SIDE[me]} מרוויח ${points(gain)} חומר.`);
  else if (settled && steps.length > 1 && gain < 0) say('line_sacrifice', `בשורה הזו ${SIDE[me]} נותן ${points(-gain)} חומר, ובכל זאת המנוע בוחר בה: לפי החישוב שלו, כל מהלך אחר גרוע יותר.`);
  if (!reasons.length) say('quiet', 'מהלך שקט: הוא לא לוקח ולא מאיים מיד, אבל מכל המהלכים האפשריים המנוע מעריך אותו כטוב ביותר.');

  // At most three reasons from the board, then where the line leads.
  const line = reasons.filter(r => r.key.startsWith('line_'));
  const board = reasons.filter(r => !r.key.startsWith('line_')).slice(0, 3);
  return { fen, bestSan: best.san, mover: me, reasons: [...board, ...line].slice(0, 4), steps };
}
