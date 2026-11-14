// The review screen's "decisive moments" panel (DECISIVE_MOMENTS_ENABLED): the moves that swung the game most,
// each a button that puts that move on the board. The moments come from decisive-moments.ts.
import { moveClassLabel } from './move-class-style.js';
import type { DecisiveMoment } from './decisive-moments.js';

const h = React.createElement;

export function DecisiveMomentsPanel({ moments, selected, onPick, lang }: { moments: DecisiveMoment[]; selected: number; onPick: (index: number) => void; lang: string }) {
  const en = lang === 'en'; const t = (he: string, enText: string) => (en ? enText : he);
  const heCount = ['', '', 'שני', 'שלושת'][moments.length] || String(moments.length);
  const title = moments.length === 1 ? t('הרגע המכריע', 'The decisive moment') : t(`${heCount} הרגעים המכריעים`, `The ${moments.length} decisive moments`);
  return h('section', { className: 'panel decisive-moments', 'data-decisive-moments': moments.length, dir: en ? 'ltr' : 'rtl' },
    h('div', { className: 'panel-title' }, h('h2', null, moments.length ? title : t('רגעים מכריעים', 'Decisive moments'))),
    moments.length === 0 ? h('p', { className: 'muted' }, t('לא היה רגע מכריע אחד: אף מהלך לא שינה את סיכויי הניצחון ב-15% או יותר.', 'No single decisive moment: no move changed the winning chances by 15% or more.'))
      : h('ol', { className: 'decisive-list' }, moments.map(m => {
        const side = m.mover === 'white' ? t('לבן', 'White') : t('שחור', 'Black');
        const change = m.swing < 0
          ? t(`הסיכוי של ${side} לנצח ירד מ-${m.moverBefore}% ל-${m.moverAfter}%`, `${side}’s winning chance fell from ${m.moverBefore}% to ${m.moverAfter}%`)
          : t(`הסיכוי של ${side} לנצח עלה מ-${m.moverBefore}% ל-${m.moverAfter}%`, `${side}’s winning chance rose from ${m.moverBefore}% to ${m.moverAfter}%`);
        return h('li', { key: m.index, className: 'decisive-item ' + (m.swing < 0 ? 'down' : 'up') + (m.index === selected ? ' selected' : ''), 'data-decisive-index': m.index },
          h('small', { className: 'muted' }, t(`מהלך ${m.moveNumber} · ${side}`, `Move ${m.moveNumber} · ${side}`)),
          h('b', { className: 'decisive-move', dir: 'ltr' }, (m.mover === 'white' ? `${m.moveNumber}. ` : `${m.moveNumber}… `) + m.san),
          h('span', { className: 'decisive-class' }, moveClassLabel(m.classification || 'good', en ? 'en' : 'he')),
          h('span', null, change),
          m.swing < 0 && m.bestSan && h('span', { className: 'muted' }, t('עדיף היה: ', 'Better was: '), h('bdi', { dir: 'ltr' }, m.bestSan)),
          h('button', { className: m.index === selected ? 'primary' : '', onClick: () => onPick(m.index) }, t('הצג על הלוח', 'Show on the board')));
      })));
}
