// The coach's words for what the player did WELL (COACH_EXPLAIN_ENABLED): for a strong move in game review, say
// WHAT he did and WHERE (the move, the square and the piece) and WHY it was good (what the opponent loses or cannot
// do), with the engine's line after the move as the evidence. The category comes from detectors that read the
// board and that line; a tactic is only named when the line shows it paying off (the material it wins, or the
// mate). A strong move that no detector explains gets no sentence: the coach does not praise in general terms.
import { attacksFrom, attackersOf, lineSteps, type CoachStep } from './coach-explain.ts';
import { coachWordsShared as S } from './coach-words.ts';
import { GOOD_LABEL, GOOD_SUB_LABEL, GOOD_WHAT, GOOD_WHY, GOOD_BANDS, REVIEW_SUMMARY, type GoodKey } from './coach-good-he.ts';
import type { GameSummary } from './coach-words.ts';

export { GOOD_LABEL, type GoodKey };

type Color = 'w' | 'b';
type Board = Map<string, { type: string; color: Color }>;
type ChessCtor = new (fen?: string) => any;

export type GoodInput = {
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
  afterScore?: number | null;
  /** The mover's best winning chance among the other moves (the review's "great" check), when known. */
  moverSecondBestChance?: number | null;
  /** The material the review counts as sacrificed by this move (its "brilliant" check), when known. */
  sacrificed?: number | null;
  /** The engine's line (UCI) from the position after the move: the opponent's best reply first. */
  replyLine: string[];
  /** The opponent's move just before this one, when known: a recapture is not counted as material won. */
  previous?: { to: string; captured?: string | null } | null;
  variant?: number;
};

export type GoodDiagnosis = {
  kind: 'good';
  category: GoodKey; sub: string; label: string;
  moveLabel: string; moveNumber: number; san: string;
  /** How much the move matters, for ranking the best moves of a game. */
  stake: number;
  /** "!!" for a brilliant move, "!" for the only move, "✓" for every other good move. */
  mark: '!!' | '!' | '✓';
  /** Marked in the move list. A minor piece simply moved out of an attack is explained on "why?" but not marked:
   *  it is the expected move, and a mark on every one of them would bury the moves that stand out. */
  notable: boolean;
  what: string; why: string; text: string[];
  /** The evidence: the engine line the sentence quotes, in SAN. */
  evidence: string[];
  facts: Record<string, any>;
};

export const GOOD_CLASSES = ['brilliant', 'great', 'best', 'excellent'];

const VALUE = S.VALUE; const NAME = S.NAME; const MATE = 90000;
const FILES = 'abcdefgh';
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const fem = (t: string) => t === 'q';
const gv = (t: string, m: string, f: string) => (fem(t) ? f : m);
const the = (t: string) => 'ה' + NAME[t];
const PROMO: Record<string, string> = { q: 'מלכה', r: 'צריח', b: 'רץ', n: 'פרש' };
const NEW_PROMO: Record<string, string> = { q: 'מלכה חדשה', r: 'צריח חדש', b: 'רץ חדש', n: 'פרש חדש' };
const CENTER = ['d4', 'd5', 'e4', 'e5'];
const dist = (a: string, b: string) => Math.max(Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(b[0])), Math.abs(Number(a[1]) - Number(b[1])));
const centerDist = (s: string) => Math.min(...CENTER.map(c => dist(s, c)));
function goodBand(chance: number) { return GOOD_BANDS.find(b => chance >= b.min)!.text; }
function squares(n: number) { return n === 1 ? 'משבצת אחת' : n === 2 ? 'שתי משבצות' : `${n} משבצות`; }
function pieceAt(b: Board, s: string) { const p = b.get(s)!; return `${the(p.type)} ב-${s}`; }
// "the queen on d8", with "the king" said without its square (it needs no square to be found).
function targetWords(b: Board, s: string) { const p = b.get(s)!; return p.type === 'k' ? 'המלך' : pieceAt(b, s); }
// A piece really in danger from an attacker: undefended, or attacked by something cheaper.
function inDanger(b: Board, s: string) { const e = S.enPrise(b, s); return e.undefended || !!e.cheaper; }

type Finding = { category: GoodKey; sub: string; stake: number; slots: Record<string, any>; why: string; whySlots?: Record<string, any>; upTo: number };

export function diagnoseGood(Chess: ChessCtor, input: GoodInput): GoodDiagnosis | null {
  if (input.classification && !GOOD_CLASSES.includes(input.classification)) return null;
  const before = new Chess(input.fenBefore); const me: Color = before.turn(); const them = other(me);
  const playedUci = input.played.from + input.played.to + (input.played.promotion || '');
  const steps = lineSteps(Chess, input.fenBefore, [playedUci, ...input.replyLine], 1 + input.replyLine.length);
  if (!steps.length || steps[0].uci !== playedUci) return null;
  const first = steps[0]; const san = first.san;
  const { n: moveNumber, label: moveLabel } = S.moveLabelOf(input.fenBefore, san, input.ply);
  const B0: Board = S.readBoard(input.fenBefore, Chess); const B1: Board = S.readBoard(first.fenAfter, Chess);
  const moverPiece = B0.get(first.from)!; const mt = moverPiece.type;
  const afterPos = new Chess(first.fenAfter);
  const { gain: lineGain, taken } = S.lineGain(Chess, input.fenBefore, steps, me);
  // A recapture only takes back what the opponent just took: what it wins is counted net of that.
  const recapture = !!(first.captured && input.previous?.captured && input.previous.to === first.to);
  const gain = recapture ? lineGain - VALUE[input.previous!.captured!] : lineGain;
  const mine = input.afterScore == null ? null : (me === 'w' ? input.afterScore : -input.afterScore);
  const mateForMe = mine !== null && mine >= MATE;
  const lineMate = S.endsInMate(Chess, steps) && steps[steps.length - 1].color === me;
  const chance = input.moverChanceAfter;
  const pSlots = { p: the(mt), sq: first.to, from: first.from, san };
  // The first step at which the side `me` captures on one of `sqs` (a piece that moved first is followed by type).
  const myCaptureOn = (sqs: string[]) => steps.findIndex((s, i) => i > 0 && s.color === me && s.captured && sqs.includes(s.to));
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);
  const queens = [...B0.values()].filter(p => p.type === 'q').length;
  const endgame = (queens === 0 && S.nonPawn(B0, me) <= 13 && S.nonPawn(B0, them) <= 13) || S.nonPawn(B0, me) + S.nonPawn(B0, them) <= 14;
  const inCheckBefore = before.inCheck();

  // ---- Mate ----
  if (afterPos.isCheckmate()) add({ category: 'mate_found', sub: 'mate', stake: 100, why: 'checkmate', upTo: 1, slots: { ...pSlots, closes: gv(mt, 'סוגר', 'סוגרת'), ends: gv(mt, 'גומר', 'גומרת') } });
  else if (mateForMe && lineMate) add({ category: 'mate_found', sub: 'line', stake: 90, why: 'mate', upTo: steps.length, slots: { ...pSlots, n: Math.ceil(steps.length / 2) } });
  // A mate the engine scores but its line does not reach is not claimed: the coach only names a mate it can show.

  // ---- Brilliant: a sound sacrifice, as the review itself classified it ----
  if (input.classification === 'brilliant') {
    // What he gave: the moved piece when the opponent takes it at once, otherwise the first piece of his the line takes.
    const takenNext = steps[1] && steps[1].captured && steps[1].to === first.to;
    const lost = steps.find((s, i) => i > 0 && s.color === them && s.captured);
    const sacNoun = takenNext ? 'את ' + the(mt) : lost ? `את ${the(lost.captured!)} ב-${lost.to}` : '';
    if (sacNoun) {
      const why = lineMate ? 'sacrifice_mate' : gain > 0 ? 'sacrifice_more' : gain === 0 ? 'sacrifice_back' : 'sacrifice_eval';
      add({ category: 'best_move', sub: 'brilliant', stake: 60, why, upTo: steps.length, slots: { ...pSlots, sacNoun }, whySlots: { band: goodBand(chance) } });
    }
  }

  // ---- Tactics: fork, pin, skewer, won material. Each only when the line wins material (2+) or mates ----
  const pays = gain >= 2 || lineMate;
  const gw = S.gainWords(Math.max(gain, 1), taken);
  if (pays) {
    // Fork: the moved piece attacks two pieces at once, each worth more than it, undefended, or the king.
    const targets = attacksFrom(B1, first.to).filter(t => {
      const q = B1.get(t); if (!q || q.color !== them) return false;
      return q.type === 'k' || (VALUE[q.type] >= 3 && (VALUE[q.type] > VALUE[mt] || inDanger(B1, t)));
    }).sort((a, b) => VALUE[B1.get(b)!.type] - VALUE[B1.get(a)!.type]);
    if (targets.length >= 2) {
      const idx = myCaptureOn(targets.filter(t => B1.get(t)!.type !== 'k'));
      if (idx > 0 || lineMate) {
        const check = targets.some(t => B1.get(t)!.type === 'k');
        const nonKing = targets.filter(t => B1.get(t)!.type !== 'k');
        const t2 = pieceAt(B1, nonKing[0]);
        add({ category: 'fork', sub: check ? 'check' : '', stake: 20 + gain, why: lineMate ? 'mate' : 'material', upTo: lineMate ? steps.length : idx + 1,
          slots: { ...pSlots, t1: targetWords(B1, targets[0]), t2: check ? t2 : pieceAt(B1, targets[1]), it: gv(mt, 'הוא', 'היא'), attacks: gv(mt, 'תוקף', 'תוקפת'), andAttacks: gv(mt, 'ותוקף', 'ותוקפת'), came: gv(mt, 'הגיע', 'הגיעה'), gives: gv(mt, 'נותן', 'נותנת'), t2Hit: gv(B1.get(nonKing[0])!.type, 'מותקף', 'מותקפת') } });
      }
    }
    // Pin and skewer: the moved piece is a slider looking through one enemy piece at another.
    if ('brq'.includes(mt)) {
      for (const { front, back } of S.xrays(B1, first.to)) {
        const f = B1.get(front)!, bk = B1.get(back)!;
        if (f.color !== them || bk.color !== them) continue;
        // The front piece must be attacked along this line (it is: xrays walks the slider's own directions).
        // A pinned pawn is left out: on a file it can still step forward along the same line.
        if (f.type !== 'k' && f.type !== 'p' && (bk.type === 'k' || VALUE[bk.type] > VALUE[f.type])) {
          const idx = myCaptureOn([front]);
          if (idx > 0 || (lineMate && bk.type === 'k')) {
            const pt = f.type;
            add({ category: 'pin', sub: bk.type === 'k' ? 'absolute' : '', stake: 18 + gain, why: lineMate ? 'mate' : 'material', upTo: idx > 0 ? idx + 1 : steps.length,
              slots: { ...pSlots, pinned: the(pt), psq: front, behind: bk.type === 'k' ? 'המלך' : pieceAt(B1, back), pins: gv(mt, 'מרתק', 'מרתקת'), pBehind: gv(pt, 'מאחוריו', 'מאחוריה'), pIt: gv(pt, 'הוא', 'היא'), pCan: gv(pt, 'יכול', 'יכולה'), pStuck: gv(pt, 'תקוע', 'תקועה'), pHis: gv(pt, 'שלו', 'שלה'), pStands: gv(pt, 'עומד', 'עומדת') } });
          }
        } else if ((f.type === 'k' || f.type === 'q') && bk.type !== 'k' && VALUE[f.type] > VALUE[bk.type] && VALUE[bk.type] >= 3) {
          // Skewer: the front piece steps aside in the line and the piece behind it is taken on its square.
          const idx = myCaptureOn([back]);
          const frontMoved = steps.some((s, i) => i > 0 && i < idx && s.color === them && s.from === front);
          if (idx > 0 && frontMoved) {
            add({ category: 'skewer', sub: '', stake: 19 + gain, why: 'material', upTo: idx + 1,
              slots: { ...pSlots, front: targetWords(B1, front), back: pieceAt(B1, back), attacks: gv(mt, 'תוקף', 'תוקפת'), fBehind: gv(f.type, 'מאחוריו', 'מאחוריה'), fIt: gv(f.type, 'הוא', 'היא'), fMoves: gv(f.type, 'יזוז', 'תזוז'), bFalls: gv(bk.type, 'ייפול', 'תיפול') } });
          }
        }
      }
    }
  }
  if (gain >= 2) {
    // Won material: a capture the line never wins back (or only part of it), or a capture the move prepares.
    // The opponent takes back on the square of his capture somewhere in the line: the piece he took is not what he won.
    const takenBack = first.captured ? steps.some((s, i) => i > 0 && s.color === them && s.captured && s.to === first.to) : false;
    const laterCaps = steps.map((s, i) => ({ s, i })).filter(x => x.i > 1 && x.s.color === me && x.s.captured && VALUE[x.s.captured!] >= 2);
    if (first.captured && VALUE[first.captured] >= 2 && !takenBack) {
      const T = first.captured; const tsq = first.to;
      add({ category: 'won_material', sub: 'free', stake: 10 + gain, why: 'material', upTo: Math.min(steps.length, 4),
        slots: { ...pSlots, T: the(T), tsq, tName: NAME[T], was: gv(T, 'היה', 'הייתה'), itObj: gv(T, 'אותו', 'אותה'), takes: gv(mt, 'לוקח', 'לוקחת') } });
    } else if (first.captured && VALUE[first.captured] >= 2 && !laterCaps.length) {
      const T = first.captured; const tsq = first.to;
      add({ category: 'won_material', sub: 'capture', stake: 10 + gain, why: 'material', upTo: Math.min(steps.length, 4),
        slots: { ...pSlots, T: the(T), tsq, takes: gv(mt, 'לוקח', 'לוקחת') } });
    } else {
      const caps = steps.map((s, i) => ({ s, i })).filter(x => x.i > 0 && x.s.color === me && x.s.captured && VALUE[x.s.captured!] >= 2);
      const top = caps.sort((a, b) => VALUE[b.s.captured!] - VALUE[a.s.captured!] || a.i - b.i)[0];
      if (top && steps[1]) {
        add({ category: 'won_material', sub: top.i === 2 ? 'line' : 'later', stake: 9 + gain, why: 'material', upTo: top.i + 1,
          slots: { ...pSlots, take: top.s.san, T: the(top.s.captured!), tsq: top.s.to, reply: steps[1].san } });
      }
    }
  }

  // ---- A threat stopped: a piece of his that was in danger, or a mate in one ----
  if (!inCheckBefore) {
    const mateThreat = S.mateIn1Threats(Chess, input.fenBefore, them);
    if (mateThreat.length && !S.mateIn1Threats(Chess, first.fenAfter, them).length && !afterPos.isCheckmate() && gain >= 0)
      add({ category: 'defended', sub: 'mate', stake: 25, why: 'defended_mate', upTo: Math.min(steps.length, 4), slots: { ...pSlots, threat: mateThreat[0] } });
    else if (gain >= 0) {
      const danger = [...B0].filter(([s, p]) => p.color === me && p.type !== 'k' && VALUE[p.type] >= 3 && inDanger(B0, s))
        .sort((a, b) => VALUE[b[1].type] - VALUE[a[1].type]);
      if (danger.length === 1 || (danger.length > 1 && danger[0][0] === first.from)) {
        const [s, p] = danger[0]; const now = s === first.from ? first.to : s;
        const stillDanger = B1.get(now)?.color === me && inDanger(B1, now);
        // The opponent's line after the move must not take it either.
        const lost = steps.some((st, i) => i > 0 && st.color === them && st.captured && (st.to === now));
        if (!stillDanger && !lost) {
          const it = gv(p.type, 'אותו', 'אותה'), on = gv(p.type, 'עליו', 'עליה');
          const saved = s === first.from ? `הוצאת ${it} ל-${first.to}`
            : first.captured && attackersOf(B0, s, them).includes(first.to) ? `לקחת את הכלי שאיים ${on}`
            : attackersOf(B1, now, me).length > attackersOf(B0, now, me).length ? `הגנת ${on}` : `חסמת את ההתקפה ${on}`;
          add({ category: 'defended', sub: 'piece', stake: 3 + VALUE[p.type] / 2, why: 'defended', upTo: Math.min(steps.length, 4),
            slots: { ...pSlots, T: the(p.type), tsq: s, wasHit: gv(p.type, 'מותקף', 'מותקפת'), saved } });
        }
      }
    }
  }

  // ---- A good trade: an even exchange while ahead in material ----
  const ahead0 = S.material(B0, me) - S.material(B0, them);
  if (first.captured && first.captured !== 'p' && mt !== 'k' && !recapture && ahead0 >= 2 && gain >= 0 && gain < 2) {
    // The opponent takes back on the same square: an exchange, and he stays ahead.
    const back = steps[1] && steps[1].captured && steps[1].to === first.to ? 1 : -1;
    if (back > 0) {
      const aw = { noun: ahead0 === 1 ? 'נקודת חומר אחת' : `${ahead0} נקודות חומר` };
      add({ category: 'good_trade', sub: first.captured === 'q' && mt === 'q' ? 'queens' : '', stake: 4, why: 'trade', upTo: Math.min(steps.length, back + 2),
        slots: { ...pSlots, aheadNoun: aw.noun, T: the(first.captured), tsq: first.to, takes: gv(mt, 'לוקח', 'לוקחת') }, whySlots: { aheadNoun: aw.noun, band: goodBand(chance) } });
    }
  }

  // ---- Pawns: a promotion, a passed pawn pushed on, a pawn break (never praised in a line that drops material) ----
  if (mt === 'p' && gain > -2) {
    const rank = Number(first.to[1]); const rel = me === 'w' ? rank : 9 - rank;
    if (first.uci[4]) add({ category: 'pawn_push', sub: 'promote', stake: 15, why: 'promote', upTo: 1, slots: { ...pSlots, promo: PROMO[first.uci[4]] }, whySlots: { promo: PROMO[first.uci[4]], newPromo: NEW_PROMO[first.uci[4]], band: goodBand(chance) } });
    else if (S.passed(B1, first.to) && rel >= 5 && !first.captured) {
      // Follow the pawn along the line: does it promote there?
      let at = first.to; let promoteAt = -1;
      steps.forEach((s, i) => { if (i > 0 && s.color === me && s.from === at) { at = s.to; if (s.uci[4]) promoteAt = i; } });
      if (promoteAt > 0) add({ category: 'pawn_push', sub: 'to_queen', stake: 8, why: 'to_queen', upTo: promoteAt + 1, slots: { ...pSlots } });
      else add({ category: 'pawn_push', sub: 'passer', stake: 6, why: 'position', upTo: Math.min(steps.length, 5), slots: { ...pSlots, left: squares(8 - rel), remain: 8 - rel === 1 ? 'נשארה' : 'נשארו' }, whySlots: { band: goodBand(chance) } });
    } else if (!first.captured && !endgame) {
      const f = FILES.indexOf(first.to[0]); const dir = me === 'w' ? 1 : -1;
      const hit = [f - 1, f + 1].filter(x => x >= 0 && x < 8).map(x => FILES[x] + (rank + dir)).find(t => B1.get(t)?.type === 'p' && B1.get(t)!.color === them);
      if (hit) add({ category: 'pawn_push', sub: 'break', stake: 3, why: 'position', upTo: Math.min(steps.length, 5), slots: { ...pSlots, tsq: hit }, whySlots: { band: goodBand(chance) } });
    }
  }

  // ---- Endgame technique: the king forward, the rook behind the passed pawn, the opposition ----
  if (endgame && !first.captured && gain > -2) {
    // Castling is not "bringing the king forward".
    if (mt === 'k' && !inCheckBefore && !first.uci.match(/^e[18][cg][18]$/)) {
      const pawns = [...B1].filter(([, p]) => p.type === 'p').map(([s]) => s);
      const nearPawn = (s: string) => pawns.length ? Math.min(...pawns.map(x => dist(s, x))) : 99;
      const toCenter = centerDist(first.to) < centerDist(first.from);
      const toPawns = nearPawn(first.to) < nearPawn(first.from);
      const noPieces = S.nonPawn(B0, me) === 0 && S.nonPawn(B0, them) === 0;
      const ok = S.kingSq(B1, them);
      const sameLine = ok && (ok[0] === first.to[0] || ok[1] === first.to[1]) && dist(ok, first.to) === 2;
      if (noPieces && sameLine) add({ category: 'endgame_technique', sub: 'opposition', stake: 5, why: 'position', upTo: Math.min(steps.length, 5), slots: { ...pSlots, osq: ok }, whySlots: { band: goodBand(chance) } });
      else if (toCenter || toPawns) add({ category: 'endgame_technique', sub: 'king', stake: 4, why: 'position', upTo: Math.min(steps.length, 5), slots: { ...pSlots, toward: toCenter ? 'למרכז' : 'לרגלים' }, whySlots: { band: goodBand(chance) } });
    }
    if (mt === 'r') {
      // Behind a passed pawn on the same file, with nothing between the rook and the pawn.
      const file = first.to[0]; const r = Number(first.to[1]);
      for (const [s, p] of B1) {
        if (p.type !== 'p' || s[0] !== file || !S.passed(B1, s)) continue;
        const pr = Number(s[1]); const ahead = p.color === 'w' ? 1 : -1;
        const behind = (r - pr) * ahead < 0;
        const clear = [...Array(Math.abs(pr - r) - 1)].every((_, k) => !B1.has(file + (Math.min(pr, r) + k + 1)));
        const wasBehind = first.from[0] === file && (Number(first.from[1]) - pr) * ahead < 0;
        if (behind && clear && !wasBehind) { add({ category: 'endgame_technique', sub: 'rook_behind', stake: 4.5, why: 'position', upTo: Math.min(steps.length, 5), slots: { ...pSlots, psq: s }, whySlots: { band: goodBand(chance) } }); break; }
      }
    }
  }

  // ---- The only move: the review's own "great" check, with the margin it measured ----
  if (input.classification === 'great' && typeof input.moverSecondBestChance === 'number') {
    const pct = Math.round(input.moverChanceBest - input.moverSecondBestChance);
    if (pct >= 10) add({ category: 'best_move', sub: 'only', stake: 5 + pct / 5, why: 'only', upTo: Math.min(steps.length, 5), slots: { ...pSlots }, whySlots: { pct } });
  }

  if (!findings.length) return null;
  findings.sort((a, b) => b.stake - a.stake);
  const pick = findings[0];
  const seed = input.variant ?? S.hash(input.fenBefore + playedUci + ':good');
  const choose = (arr: string[]) => arr[seed % arr.length];
  const key = pick.sub ? `${pick.category}.${pick.sub}` : pick.category;
  // A sentence that quotes material counts it over the whole line, so it quotes the whole line too.
  const upTo = pick.why === 'material' || pick.why.startsWith('sacrifice') ? steps.length : pick.upTo;
  const evidence = steps.slice(0, Math.max(2, Math.min(upTo, 8))).map(s => s.san);
  const lineText = evidence.join(' ');
  const what = S.fill(choose(GOOD_WHAT[key] || GOOD_WHAT[pick.category]), { move: moveLabel, ...pick.slots });
  const why = S.fill(choose(GOOD_WHY[pick.why]), { line: lineText, gainNoun: gw.noun, band: goodBand(chance), ...(pick.whySlots || {}) });
  const label = GOOD_SUB_LABEL[key] || GOOD_LABEL[pick.category];
  const mark = pick.category === 'best_move' && pick.sub === 'brilliant' ? '!!' : input.classification === 'great' ? '!' : '✓';
  const notable = !(pick.category === 'defended' && pick.sub === 'piece' && pick.stake < 5 && String(pick.slots.saved).startsWith('הוצאת'));
  return { kind: 'good', category: pick.category, sub: pick.sub, label, moveLabel, moveNumber, san, stake: pick.stake, mark, notable, what, why, text: [what, why], evidence,
    facts: { gain, taken, mateForMe, lineMate, findings: findings.map(f => f.category + (f.sub ? '.' + f.sub : '')) } };
}

// A cheap board-only test of whether a move is worth asking the engine about for the good-move words.
export function goodCandidate(Chess: ChessCtor, fenBefore: string, played: { from: string; to: string; promotion?: string | null }, classification?: string) {
  if (!classification || !GOOD_CLASSES.includes(classification)) return false;
  if (classification === 'brilliant' || classification === 'great') return true;
  const c = new Chess(fenBefore); let mv: any = null; try { mv = c.move({ from: played.from, to: played.to, promotion: played.promotion || undefined }); } catch { mv = null; }
  if (!mv) return false;
  if (mv.captured || c.inCheck() || mv.promotion || mv.piece === 'p') return true;
  const me: Color = new Chess(fenBefore).turn();
  const B0: Board = S.readBoard(fenBefore, Chess);
  if ([...B0].some(([s, p]) => p.color === me && p.type !== 'k' && VALUE[p.type] >= 3 && inDanger(B0, s))) return true;
  if (S.mateIn1Threats(Chess, fenBefore, other(me)).length) return true;
  const B1: Board = S.readBoard(c.fen(), Chess);
  if (attacksFrom(B1, mv.to).filter(t => B1.get(t)?.color === other(me) && VALUE[B1.get(t)!.type] >= 3).length >= 2) return true;
  if ('brq'.includes(mv.piece) && S.xrays(B1, mv.to).some(x => B1.get(x.front)?.color === other(me) && B1.get(x.back)?.color === other(me))) return true;
  const queens = [...B0.values()].filter(p => p.type === 'q').length;
  const endgame = (queens === 0 && S.nonPawn(B0, me) <= 13 && S.nonPawn(B0, other(me)) <= 13) || S.nonPawn(B0, me) + S.nonPawn(B0, other(me)) <= 14;
  return endgame && (mv.piece === 'k' || mv.piece === 'r');
}

export type ReviewItem = { ply: number; moveLabel: string; label: string; category: string; text: string; kind: 'good' | 'mistake' };
export type ReviewSummary = { best: ReviewItem[]; worst: ReviewItem[]; frequent: GameSummary['frequent']; lines: string[] };

// The review summary: the three best moves (by how much they mattered) and the three biggest mistakes, each with its move.
export function summarizeReview(goods: { ply: number; diagnosis: GoodDiagnosis }[], mistakes: GameSummary): ReviewSummary {
  const best = [...goods].filter(x => x.diagnosis).sort((a, b) => b.diagnosis.stake - a.diagnosis.stake || a.ply - b.ply).slice(0, 3)
    .map(x => ({ ply: x.ply, moveLabel: x.diagnosis.moveLabel, label: x.diagnosis.label, category: x.diagnosis.category, text: x.diagnosis.what, kind: 'good' as const }));
  const worst = mistakes.top.map(t => ({ ply: t.ply, moveLabel: t.moveLabel, label: t.label, category: t.category, text: t.text, kind: 'mistake' as const }));
  const lines = [
    best.length ? REVIEW_SUMMARY.bestTitle : REVIEW_SUMMARY.noGood, ...best.map((t, i) => `${i + 1}. ${t.moveLabel}: ${t.label}`),
    worst.length ? REVIEW_SUMMARY.worstTitle : REVIEW_SUMMARY.noBad, ...worst.map((t, i) => `${i + 1}. ${t.moveLabel}: ${t.label}`),
  ];
  if (worst.length) lines.push(mistakes.lines[mistakes.lines.length - 1]);
  return { best, worst, frequent: mistakes.frequent, lines };
}
