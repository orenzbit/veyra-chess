// Small statistics-page controls for keeping bullet out of headline averages.
import { getLang } from './i18n.js';

const h = React.createElement;

function text(he: string, en: string): string {
  return getLang() === 'en' ? en : he;
}

export function BulletToggle({ includeBullet, onChange }: { includeBullet: boolean; onChange: (next: boolean) => void }) {
  return h('label', { className: 'stats-bullet-toggle' },
    h('input', { type: 'checkbox', checked: includeBullet, onChange: (event: { target: { checked: boolean } }) => onChange(!!event.target.checked) }),
    h('span', null, text('כלול בולט', 'Include bullet')),
    h('small', null, includeBullet
      ? text('הממוצעים כוללים משחקי בולט.', 'Averages include bullet games.')
      : text('הממוצעים מבוססים על בליץ, ראפיד ואיטיים יותר.', 'Averages use blitz, rapid and slower games.')));
}

export function BulletExcludedNote() {
  return h('p', { className: 'dna-sample-note stats-bullet-excluded' },
    text('בולט — לא נכלל בממוצעים', 'Bullet — not included in averages'));
}

export function BulletOnlyEmptyState({ onInclude }: { onInclude: () => void }) {
  return h('div', { className: 'stats-bullet-only' },
    h('p', { className: 'dna-muted' }, text(
      'כל המשחקים השמורים שלך הם בולט, והם לא נכללים בממוצעים כברירת מחדל. אפשר להציג אותם בנפרד למטה, או לכלול אותם בממוצעים.',
      'All your saved games are bullet, which is excluded from averages by default. You can see them separately below, or include them in the averages.')),
    h('button', { className: 'archive-fetch-button', onClick: onInclude }, text('כלול בולט', 'Include bullet')));
}
