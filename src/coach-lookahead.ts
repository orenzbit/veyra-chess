// The coach's look-ahead (COACH_EXPLAIN_ENABLED): the engine's line several moves ahead (up to LOOKAHEAD_PLIES
// half-moves), stepped on the board with ◀ ▶, and a short Hebrew caption for every move of it: what the move does
// (takes, checks, promotes, castles) and what it threatens or defends right after it is played.
// Every caption is read off the board after the move; nothing is guessed. The engine itself is the in-site
// engine worker ({ type: 'pv' } requests), never anything else.
import { lineSteps, attacksFrom, attackersOf, type CoachStep, type CoachExplanation } from './coach-explain.ts';
import { coachWordsShared as S } from './coach-words.ts';

type Color = 'w' | 'b';
type ChessCtor = new (fen?: string) => any;
type Ask = (req: { type: 'pv'; fen: string; plies: number }) => Promise<{ pv: string[] }>;

/** How far ahead the coach shows the line, in half-moves (plies). */
export const LOOKAHEAD_PLIES = 8;
/** The most a single engine request is asked for: the worker's own search completes reliably up to here. */
const CHUNK = 5;

// The line from `fen` continued to `target` plies: each continuation is the engine's own best line from the
// position where the line so far stops. A line that ends the game (mate, stalemate) is not continued.
export async function extendLine(Chess: ChessCtor, fen: string, pv: string[], ask: Ask, target = LOOKAHEAD_PLIES) {
  const out = [...pv];
  for (let round = 0; round < 4 && out.length < target; round++) {
    const steps = lineSteps(Chess, fen, out, out.length);
    if (steps.length !== out.length) { out.length = steps.length; break; }
    const at = steps.length ? steps[steps.length - 1].fenAfter : fen;
    if (new Chess(at).moves().length === 0) break;
    const want = Math.min(CHUNK, target - out.length);
    const r = await ask({ type: 'pv', fen: at, plies: want });
    const more = (r?.pv || []).slice(0, want);
    if (!more.length || lineSteps(Chess, at, more, more.length).length !== more.length) break;
    out.push(...more);
  }
  return out.slice(0, target);
}

const NAME = S.NAME; const VALUE = S.VALUE;
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const PROMO: Record<string, string> = { q: 'מלכה', r: 'צריח', b: 'רץ', n: 'פרש' };
const HOME: Record<Color, string[]> = { w: ['b1', 'g1', 'c1', 'f1'], b: ['b8', 'g8', 'c8', 'f8'] };

// Pieces of `victim` that `attackerSq` attacks and that are really in danger: undefended, or worth more than the attacker.
function threatened(b: Map<string, any>, attackerSq: string) {
  const a = b.get(attackerSq); if (!a) return [];
  return attacksFrom(b, attackerSq).filter(t => {
    const q = b.get(t); if (!q || q.color === a.color || q.type === 'k' || q.type === 'p') return false;
    const e = S.enPrise(b, t);
    return e.undefended || VALUE[q.type] > VALUE[a.type];
  }).sort((x, y) => VALUE[b.get(y).type] - VALUE[b.get(x).type]);
}

export type Caption = { san: string; who: 'me' | 'opp'; keys: string[]; text: string };

// The caption for one step of a line. `me` is the player whose review this is: "אתה" for his moves, "היריב" for the other side's.
export function captionStep(Chess: ChessCtor, step: CoachStep, prev: CoachStep | null, me: Color): Caption {
  const who: 'me' | 'opp' = step.color === me ? 'me' : 'opp';
  const subj = who === 'me' ? 'אתה' : 'היריב';
  const yours = (c: Color) => (c === me ? ' שלך' : ' של היריב');
  const B0 = S.readBoard(step.fenBefore, Chess); const B1 = S.readBoard(step.fenAfter, Chess);
  const moved = B1.get(step.to); const piece = B0.get(step.from);
  const after = new Chess(step.fenAfter);
  const keys: string[] = []; const parts: string[] = [];
  const mv = new Chess(step.fenBefore).move({ from: step.from, to: step.to, promotion: step.uci[4] || undefined });
  const flags: string = mv?.flags || '';
  // 1. What the move does.
  if (flags.includes('k') || flags.includes('q')) { keys.push('castle'); parts.push(`${subj} מצריח ${flags.includes('k') ? 'לצד המלך' : 'לצד המלכה'}`); }
  else if (step.uci[4]) {
    keys.push('promote');
    parts.push(step.captured ? `${subj} לוקח ב-${step.to} ומכתיר את הרגלי ל${PROMO[step.uci[4]]}` : `${subj} מכתיר את הרגלי ב-${step.to} ל${PROMO[step.uci[4]]}`);
  } else if (step.captured) {
    const back = prev && prev.captured && prev.to === step.to;
    keys.push(back ? 'recapture' : 'capture');
    const sq = flags.includes('e') ? step.to[0] + step.from[1] : step.to;
    parts.push(back ? `${subj} לוקח בחזרה ב-${step.to} עם ה${NAME[piece.type]}` : `${subj} לוקח עם ה${NAME[piece.type]} את ה${NAME[step.captured]} ב-${sq}`);
  } else {
    // A piece that stood attacked and undefended, and moves to a square where it is not.
    const wasHit = S.enPrise(B0, step.from).hit && !S.enPrise(B1, step.to).hit;
    if (wasHit && piece.type !== 'p' && piece.type !== 'k') { keys.push('escape'); parts.push(`${subj} מוציא את ה${NAME[piece.type]} מסכנה ל-${step.to}`); }
    else if (piece.type === 'p') { keys.push('push'); parts.push(`${subj} דוחף את הרגלי ל-${step.to}`); }
    else if (HOME[step.color].includes(step.from) && (piece.type === 'n' || piece.type === 'b')) { keys.push('develop'); parts.push(`${subj} מפתח את ה${NAME[piece.type]} ל-${step.to}`); }
    else { keys.push('move'); parts.push(`${subj} מזיז את ה${NAME[piece.type]} ל-${step.to}`); }
  }
  // 2. What it does right after: mate, check, a threat, a defence.
  if (after.isCheckmate()) { keys.push('mate'); parts.push('ונותן מט'); }
  else if (after.isStalemate && after.isStalemate()) { keys.push('stalemate'); parts.push('וזה פט: תיקו'); }
  else {
    if (after.inCheck()) { keys.push('check'); parts.push('ונותן שח'); }
    const mates = S.mateIn1Threats(Chess, step.fenAfter, step.color);
    const hits = moved ? threatened(B1, step.to) : [];
    if (mates.length && !after.inCheck()) { keys.push('threat_mate'); parts.push(`ומאיים במט (${mates[0]})`); }
    else if (hits.length) {
      const t = hits[0]; keys.push('threat');
      parts.push(`${after.inCheck() ? ', וגם מאיים' : 'ומאיים'} על ה${NAME[B1.get(t).type]}${yours(B1.get(t).color)} ב-${t}`);
    } else if (moved && !after.inCheck() && !keys.includes('castle')) {
      // A friendly piece the opponent attacks that had no defender before this move, and has one now.
      const guarded = attacksFrom(B1, step.to).filter(t => {
        const q = B1.get(t); if (!q || q.color !== step.color || q.type === 'k' || t === step.to) return false;
        return attackersOf(B1, t, other(step.color)).length > 0 && attackersOf(B0, t, step.color).filter(d => d !== step.from).length === 0;
      });
      if (guarded.length) { keys.push('defends'); parts.push(`ומגן על ה${NAME[B1.get(guarded[0]).type]} ב-${guarded[0]}`); }
    }
  }
  const text = parts.join(' ').replace(/ ,/g, ',') + '.';
  return { san: step.san, who, keys, text };
}

export type LookaheadLine = CoachExplanation & { captions: Caption[] };

// A line ready for the board: its steps and a caption for each. `reasons` stays empty: a line shown for what
// follows a mistake is not "why this move is best".
export function lookaheadLine(Chess: ChessCtor, fen: string, uci: string[], me: Color, max = LOOKAHEAD_PLIES): LookaheadLine | null {
  const steps = lineSteps(Chess, fen, uci, max);
  if (!steps.length) return null;
  const captions = steps.map((s, i) => captionStep(Chess, s, i ? steps[i - 1] : null, me));
  return { fen, bestSan: steps[0].san, mover: steps[0].color, reasons: [], steps, captions };
}
