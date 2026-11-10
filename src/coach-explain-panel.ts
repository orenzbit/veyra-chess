// The coach's "why?" panel on game review (COACH_EXPLAIN_ENABLED): the Hebrew reasons for the engine's best
// move and its next moves, stepped one at a time with ◀ / ▶. The board itself is drawn by main.ts from
// coachBoardView(), which returns the position and the arrows for the current step.
import type { CoachExplanation } from './coach-explain.js';

const h = (...args: any[]) => (React.createElement as any)(...args); // React is the page's global; read at render time

export type CoachView = { fen: string; arrows: { from: string; to: string; color: string; faded?: boolean }[] };

const COLOR = { w: 'var(--coach-arrow-white, #2f9e44)', b: 'var(--coach-arrow-black, #e8590c)' };

// Step 0 is the position before the best move; step k shows the position after k moves of the line.
// The next move to play is a full arrow; the one just played stays as a faded arrow.
export function coachBoardView(ex: CoachExplanation, step: number): CoachView {
  const k = Math.max(0, Math.min(ex.steps.length, step));
  const fen = k === 0 ? ex.fen : ex.steps[k - 1].fenAfter;
  const arrows: CoachView['arrows'] = [];
  if (k > 0) { const s = ex.steps[k - 1]; arrows.push({ from: s.from, to: s.to, color: COLOR[s.color], faded: true }); }
  if (k < ex.steps.length) { const s = ex.steps[k]; arrows.push({ from: s.from, to: s.to, color: COLOR[s.color] }); }
  return { fen, arrows };
}

function moveLabel(ex: CoachExplanation, i: number) {
  const s = ex.steps[i]; const n = Number(ex.fen.split(' ')[5]) || 1;
  const blackFirst = ex.mover === 'b'; const ply = i + (blackFirst ? 1 : 0);
  const num = n + Math.floor(ply / 2);
  return s.color === 'w' ? `${num}. ${s.san}` : (i === 0 ? `${num}… ${s.san}` : s.san);
}

export function CoachExplainPanel({ ex, step, onStep, onClose, loading, error }: { ex: CoachExplanation | null; step: number; onStep: (n: number) => void; onClose: () => void; loading: boolean; error: string }) {
  if (loading) return h('section', { className: 'coach-explain', dir: 'rtl', 'data-coach-explain': 'loading' }, h('p', { className: 'muted' }, 'המנוע מחשב את השורה…'));
  if (error || !ex) return h('section', { className: 'coach-explain', dir: 'rtl', 'data-coach-explain': 'error' }, h('p', null, error || 'אין הסבר לעמדה הזו.'), h('button', { onClick: onClose }, 'סגור'));
  const total = ex.steps.length;
  return h('section', { className: 'coach-explain', dir: 'rtl', 'data-coach-explain': 'ready' },
    h('div', { className: 'coach-explain-head' },
      h('h3', null, 'למה ', h('bdi', { dir: 'ltr' }, ex.bestSan), '?'),
      h('button', { className: 'coach-explain-close', onClick: onClose, 'aria-label': 'סגור' }, '✕')),
    h('ul', { className: 'coach-explain-reasons' }, ex.reasons.map(r => h('li', { key: r.key, 'data-reason': r.key }, r.text))),
    h('div', { className: 'coach-explain-line' },
      h('small', { className: 'muted' }, `השורה של המנוע (${total} מהלכים):`),
      h('ol', { className: 'coach-line-moves', dir: 'ltr' }, ex.steps.map((s, i) =>
        h('li', { key: i, className: 'coach-line-move ' + s.color + (i === step - 1 ? ' played' : '') + (i === step ? ' next' : '') },
          h('button', { onClick: () => onStep(i + 1) }, moveLabel(ex, i)))))),
    h('div', { className: 'coach-explain-steps' },
      // In RTL the "forward" button sits on the left, so ▶ (back to the start side) is on the right.
      h('button', { className: 'coach-step-back', disabled: step <= 0, onClick: () => onStep(step - 1), 'aria-label': 'מהלך קודם' }, '▶ הקודם'),
      h('span', { className: 'coach-step-count' }, step === 0 ? 'לפני המהלך' : `מהלך ${step} מתוך ${total}`),
      h('button', { className: 'coach-step-next', disabled: step >= total, onClick: () => onStep(step + 1), 'aria-label': 'המהלך הבא' }, 'הבא ◀')));
}
