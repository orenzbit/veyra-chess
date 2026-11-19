import { whiteEvaluation, reviewScore, evaluationSegments } from './review-evaluation.js';
import { moveClassLabel, moveClassBadgeProps } from './move-class-style.js';

const h = React.createElement;
const { useEffect, useRef, useState } = React;

/** One chart instance for a completed analysis. Percentages are always White's. */
export function ReviewGraph({ moves, history, selected, onPick, decisive, played, onPlayed, playerSide = "white" }) {
  const [revealing, setRevealing] = useState(!played);
  const [active, setActive] = useState(null as number | null);
  const initial = useRef(selected);
  useEffect(() => { onPlayed(); }, []);
  useEffect(() => { if (selected !== initial.current) setRevealing(false); }, [selected]);
  const count = history.length;
  const isBlack = playerSide === 'black';
  const rawChance = history.map((_, i) => whiteEvaluation(moves[i]?.whiteChanceAfter));
  const chance = rawChance.map(v => v === null ? null : (isBlack ? 100 - v : v));
  const x = (i: number) => count <= 1 ? 50 : 2 + 96 * i / (count - 1);
  const y = (value: number) => 4 + 92 * (100 - value) / 100;
  const segments = evaluationSegments(chance);
  const label = (i: number) => {
    const move = history[i];
    const turn = Number(String(move.before || '').split(' ')[5]) || Math.floor(i / 2) + 1;
    const side = move.color === 'b' ? '...' : '.';
    const value = chance[i];
    const mate = /#$/.test(move.san || '');
    const rawScore = moves[i]?.afterScore; const whiteChanceVal = whiteEvaluation(moves[i]?.whiteChanceAfter); const score = reviewScore(rawScore, mate, whiteChanceVal);
    const classification = moves[i]?.classification ? ` · ${moveClassLabel(moves[i].classification, 'he')}` : '';
    return `${turn}${side} ${move.san}${classification} · ${value === null ? 'אין הערכה' : `\u200E${value.toFixed(1)}% · \u200E${score}`}`;
  };
  const pick = (i: number) => { setRevealing(false); onPick(i); };
  return h('section', { className: 'review-graph', 'aria-label': 'גרף הערכת המשחק', 'data-review-graph': '1' },
    h('div', { className: 'review-graph-title' }, 'הערכת המשחק', h('span', null, isBlack ? 'סיכויי השחור' : 'סיכויי הלבן')),
    h('div', { className: 'review-graph-plot', dir: 'ltr' },
      h('span', { className: 'review-graph-white', 'aria-hidden': 'true' }, isBlack ? 'שחור' : 'לבן'),
      h('span', { className: 'review-graph-black', 'aria-hidden': 'true' }, isBlack ? 'לבן' : 'שחור'),
      h('div', { className: 'review-graph-drawing' + (revealing ? ' revealing' : ''), onAnimationEnd: () => setRevealing(false) },
        h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
          segments.map((s, i) => h('g', { key: i }, h('path', { className:'graph-dark', d:s.top }), h('path', { className:'graph-light', d:s.bottom }), h('path', { className:'graph-line', d:s.line, vectorEffect:'non-scaling-stroke' })))),
        chance.map((value, i) => value === null || !decisive.has(i) ? null : h('span', { key: i, className: 'review-graph-turn', style: { left: `${x(i)}%`, top: `${y(value)}%` }, 'aria-hidden': 'true' }, h('span', moveClassBadgeProps(moves[i]?.classification, { size: 15, decorative: true }))))),
      h('div', { className: 'review-graph-mid' }),
      selected >= 0 && selected < count && h('div', { className: 'review-graph-cursor', style: { left: `${x(selected)}%` }, 'aria-hidden': 'true' }),
      history.map((_, i) => h('button', { key: i, type: 'button', className: 'review-graph-point' + (i === selected ? ' selected' : '') + (chance[i] === null ? ' missing' : ''),
        style: { left: `${x(i)}%`, width: `${count <= 1 ? 100 : 96 / (count - 1)}%`, '--point-y': `${chance[i] === null ? 50 : y(chance[i])}%` }, 'aria-label': label(i), 'aria-pressed': i === selected,
        title: label(i), onMouseEnter: () => setActive(i), onMouseLeave: () => setActive(null), onFocus: () => setActive(i), onBlur: () => setActive(null),
        onClick: () => pick(i), onKeyDown: (event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); const next = Math.max(0, Math.min(count - 1, i + (event.key === 'ArrowRight' ? 1 : -1))); pick(next); event.currentTarget.parentElement?.querySelectorAll('.review-graph-point')[next]?.focus(); } }
      })),
      active !== null && h('div', { className: 'review-graph-tooltip', role: 'status' }, label(active))),
    h('div', { className: 'review-graph-axis', dir: 'ltr' }, h('span', null, history.length ? label(0).split(' ')[0] : ''), h('span', null, history.length ? label(history.length - 1).split(' ')[0] : '')));
}
