// The coach's words on game review (COACH_EXPLAIN_ENABLED): what went wrong on a mistake, inside the "why?" panel,
// and the game summary (the three biggest mistakes and the category that came up most often).
import type { Diagnosis, GameSummary } from './coach-words.ts';

const h = (...args: any[]) => (React.createElement as any)(...args); // React is the page's global; read at render time

// Moves, squares and numbers keep their left-to-right order inside the Hebrew sentence.
const LATIN = /([A-Za-z0-9][A-Za-z0-9+#=\-.…]*[A-Za-z0-9+#]|[A-Za-z0-9])/g;
export function hebrewWithMoves(text: string) {
  const out: any[] = []; let last = 0; let m: RegExpExecArray | null; let i = 0;
  LATIN.lastIndex = 0;
  while ((m = LATIN.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(h('bdi', { key: 'b' + (i++), dir: 'ltr' }, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function CoachMistake({ diag, line, onLine, hasReply }: { diag: Diagnosis; line: 'best' | 'reply'; onLine: (l: 'best' | 'reply') => void; hasReply: boolean }) {
  return h('div', { className: 'coach-mistake', 'data-coach-category': diag.category, 'data-coach-sub': diag.sub || '' },
    h('div', { className: 'coach-mistake-head' },
      h('span', { className: 'coach-category-chip' }, diag.label),
      h('small', { className: 'muted' }, h('bdi', { dir: 'ltr' }, diag.moveLabel))),
    h('p', { className: 'coach-mistake-what' }, hebrewWithMoves(diag.what)),
    diag.why && h('p', { className: 'coach-mistake-why' }, hebrewWithMoves(diag.why)),
    diag.better && h('p', { className: 'coach-mistake-better' }, hebrewWithMoves(diag.better)),
    h('div', { className: 'coach-line-switch', role: 'group', 'aria-label': 'איזו שורה להראות על הלוח' },
      h('button', { className: line === 'best' ? 'active' : '', 'aria-pressed': line === 'best', onClick: () => onLine('best') }, 'מה היה עדיף: ', h('bdi', { dir: 'ltr' }, diag.bestSan || '—')),
      hasReply && h('button', { className: line === 'reply' ? 'active' : '', 'aria-pressed': line === 'reply', onClick: () => onLine('reply') }, 'התשובה של היריב: ', h('bdi', { dir: 'ltr' }, diag.replySan || '—'))));
}

export type SummaryState = { loading: boolean; done: number; total: number; error: string; summary: GameSummary | null };

export function CoachSummary({ state, onPick, onClose }: { state: SummaryState; onPick: (ply: number) => void; onClose: () => void }) {
  const head = h('div', { className: 'coach-explain-head' }, h('h3', null, 'סיכום המאמן'), h('button', { className: 'coach-explain-close', onClick: onClose, 'aria-label': 'סגור' }, '✕'));
  if (state.loading) return h('section', { className: 'coach-explain coach-summary', dir: 'rtl', 'data-coach-summary': 'loading' }, head,
    h('p', { className: 'muted' }, state.total ? `המאמן עובר על הטעויות שלך: ${state.done} מתוך ${state.total}…` : 'המאמן עובר על המשחק…'));
  if (state.error || !state.summary) return h('section', { className: 'coach-explain coach-summary', dir: 'rtl', 'data-coach-summary': 'error' }, head, h('p', null, state.error || 'אין סיכום למשחק הזה.'));
  const s = state.summary;
  return h('section', { className: 'coach-explain coach-summary', dir: 'rtl', 'data-coach-summary': 'ready' }, head,
    s.top.length ? h('p', { className: 'coach-summary-lead' }, s.lines[0]) : h('p', null, s.lines[0]),
    s.top.length > 0 && h('ol', { className: 'coach-summary-top' }, s.top.map(t =>
      h('li', { key: t.ply },
        h('button', { onClick: () => onPick(t.ply), 'data-ply': t.ply },
          h('bdi', { dir: 'ltr', className: 'coach-summary-move' }, t.moveLabel), ' ',
          h('span', { className: 'coach-category-chip' }, t.label)),
        h('div', { className: 'coach-summary-text' }, hebrewWithMoves(t.text))))),
    s.top.length > 0 && h('p', { className: 'coach-summary-frequent', 'data-frequent': s.frequent?.category || '' }, s.lines[s.lines.length - 1]));
}
