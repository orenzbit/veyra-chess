// The coach's "why?" panel on game review (COACH_EXPLAIN_ENABLED): the Hebrew reasons for the engine's best
// move and its next moves, stepped one at a time with ◀ / ▶. The board itself is drawn by main.ts from
// coachBoardView(), which returns the position and the arrows for the current step.
import type { CoachExplanation } from './coach-explain.js';
import { arrowColor, type ArrowWho, type BoardArrow } from './board-arrows.ts';

const h = (...args: any[]) => (React.createElement as any)(...args); // React is the page's global; read at render time

export type CoachView = { fen: string; arrows: (BoardArrow & { color: string })[] };

// The arrows use the shared board style (board-arrows.ts): green for the side whose move is explained,
// orange for the other side, red dashed for a mistake that is shown next to the better move.
// Step 0 is the position before the move; step k shows the position after k moves of the line.
// The next move to play is a full arrow; the one just played stays as a faded arrow.
// opts.mistakeUci: on the "better line" of a mistake, the move he really played is shown in red at step 0.
// opts.firstIsMistake: on "his line", the first move of the line is that mistake, so it is drawn red.
export function coachBoardView(ex: CoachExplanation, step: number, opts: { mistakeUci?: string | null; firstIsMistake?: boolean } = {}): CoachView {
  const k = Math.max(0, Math.min(ex.steps.length, step));
  const fen = k === 0 ? ex.fen : ex.steps[k - 1].fenAfter;
  const who = (c: 'w' | 'b'): ArrowWho => (c === ex.mover ? 'me' : 'opp');
  const arrows: CoachView['arrows'] = [];
  const push = (a: BoardArrow) => arrows.push({ ...a, color: arrowColor(a) });
  if (k > 0) { const s = ex.steps[k - 1]; push({ from: s.from, to: s.to, who: who(s.color), faded: true, mistake: (k === 1 && !!opts.firstIsMistake) || undefined }); }
  if (k === 0 && opts.mistakeUci && opts.mistakeUci.slice(0, 4) !== (ex.steps[0]?.uci || '').slice(0, 4)) push({ from: opts.mistakeUci.slice(0, 2), to: opts.mistakeUci.slice(2, 4), who: 'me', mistake: true });
  if (k < ex.steps.length) { const s = ex.steps[k]; push({ from: s.from, to: s.to, who: who(s.color), mistake: (k === 0 && !!opts.firstIsMistake) || undefined }); }
  return { fen, arrows };
}

function moveLabel(ex: CoachExplanation, i: number) {
  const s = ex.steps[i]; const n = Number(ex.fen.split(' ')[5]) || 1;
  const blackFirst = ex.mover === 'b'; const ply = i + (blackFirst ? 1 : 0);
  const num = n + Math.floor(ply / 2);
  return s.color === 'w' ? `${num}. ${s.san}` : (i === 0 ? `${num}… ${s.san}` : s.san);
}

export function CoachExplainPanel({ ex, step, onStep, onClose, loading, error, mistake, title, captions, lineLabel }: { ex: CoachExplanation | null; step: number; onStep: (n: number) => void; onClose: () => void; loading: boolean; error: string; mistake?: any; title?: any; captions?: { text: string; who: string; keys: string[] }[]; lineLabel?: string }) {
  if (loading) return h('section', { className: 'coach-explain', dir: 'rtl', 'data-coach-explain': 'loading' }, h('p', { className: 'muted' }, 'המנוע מחשב את השורה…'));
  if (error || !ex) return h('section', { className: 'coach-explain', dir: 'rtl', 'data-coach-explain': 'error' }, h('p', null, error || 'אין הסבר לעמדה הזו.'), h('button', { onClick: onClose }, 'סגור'));
  const total = ex.steps.length;
  return h('section', { className: 'coach-explain', dir: 'rtl', 'data-coach-explain': 'ready' },
    h('div', { className: 'coach-explain-head' },
      h('h3', null, title || ['למה ', h('bdi', { dir: 'ltr', key: 'b' }, ex.bestSan), '?']),
      h('button', { className: 'coach-explain-close', onClick: onClose, 'aria-label': 'סגור' }, '✕')),
    mistake || null,
    ex.reasons.length > 0 && h('ul', { className: 'coach-explain-reasons' }, ex.reasons.map(r => h('li', { key: r.key, 'data-reason': r.key }, r.text))),
    h('div', { className: 'coach-explain-line' },
      h('small', { className: 'muted' }, `${lineLabel || 'השורה של המנוע'} (${total} מהלכים):`),
      h('ol', { className: 'coach-line-moves', dir: 'ltr' }, ex.steps.map((s, i) =>
        h('li', { key: i, className: 'coach-line-move ' + s.color + (s.color === ex.mover ? ' who-me' : ' who-opp') + (i === step - 1 ? ' played' : '') + (i === step ? ' next' : '') },
          h('button', { onClick: () => onStep(i + 1), title: captions?.[i]?.text || undefined }, moveLabel(ex, i)))))),
    // The look-ahead caption: what the move just shown on the board does or threatens.
    captions && captions.length > 0 && h('p', { className: 'coach-step-caption', 'data-coach-caption': step > 0 ? String(step) : '0', 'data-who': step > 0 ? captions[step - 1]?.who : '' },
      step === 0 ? `לחץ "הבא" כדי לראות את ההמשך, ${total} מהלכים קדימה.` : [h('bdi', { dir: 'ltr', key: 'm', className: 'coach-step-caption-move' }, moveLabel(ex, step - 1)), ' ', captions[step - 1]?.text || '']),
    h('div', { className: 'coach-explain-steps' },
      // In RTL the "forward" button sits on the left, so ▶ (back to the start side) is on the right.
      h('button', { className: 'coach-step-back', disabled: step <= 0, onClick: () => onStep(step - 1), 'aria-label': 'מהלך קודם' }, '▶ הקודם'),
      h('span', { className: 'coach-step-count' }, step === 0 ? 'לפני המהלך' : `מהלך ${step} מתוך ${total}`),
      h('button', { className: 'coach-step-next', disabled: step >= total, onClick: () => onStep(step + 1), 'aria-label': 'המהלך הבא' }, 'הבא ◀')));
}
