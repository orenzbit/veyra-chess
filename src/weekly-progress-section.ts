import { getLang } from './i18n.js';
import { buildWeeklyProgress, type WeeklyRow, type WeeklyTrend } from './weekly-progress.js';

const h = React.createElement;
const useState = React.useState as <T>(value: T) => [T, (next: T | ((previous: T) => T)) => void];
const useEffect = React.useEffect as (effect: () => void | (() => void), deps: unknown[]) => void;

type Metric = 'accuracy' | 'acpl';

export function weeklyTrendArrow(metric: Metric, trend: WeeklyTrend): string {
  if (trend === 'stable') return '—';
  if (trend === 'none') return '';
  const up = metric === 'accuracy' ? trend === 'better' : trend === 'worse';
  return up ? '▲' : '▼';
}

function trendLabel(trend: WeeklyTrend, en: boolean): string {
  if (trend === 'better') return en ? 'improved' : 'שיפור';
  if (trend === 'worse') return en ? 'declined' : 'הרעה';
  return en ? 'stable' : 'יציב';
}

function cell(metric: Metric, row: WeeklyRow, en: boolean) {
  const value = row[metric];
  const text = value === null ? '—' : metric === 'accuracy' ? value.toFixed(1) + '%' : value.toFixed(1);
  const trend = metric === 'accuracy' ? row.accuracyTrend : row.acplTrend;
  const arrow = weeklyTrendArrow(metric, trend);
  return h('td', { className: 'wp-num' },
    h('span', { className: 'wp-value' }, text),
    arrow && h('span', { className: 'wp-trend wp-' + trend, role: 'img', 'aria-label': trendLabel(trend, en), title: trendLabel(trend, en) }, arrow));
}

export function WeeklyProgressSection({ report }: { report: unknown }) {
  const [language, setLanguage] = useState(getLang());
  useEffect(() => {
    const change = () => setLanguage(getLang());
    window.addEventListener('tabia-language-change', change);
    return () => window.removeEventListener('tabia-language-change', change);
  }, []);
  const en = language === 'en';
  const text = (he: string, english: string) => en ? english : he;
  const progress = buildWeeklyProgress(report);
  return h('section', { className: 'dna-time-card weekly-progress', 'aria-labelledby': 'weekly-progress-title' },
    h('h2', { id: 'weekly-progress-title' }, text('התקדמות שבועית', 'Weekly progress')),
    !progress.hasEnoughData
      ? h('p', { className: 'dna-muted' }, text('צריך לפחות שבועיים של משחקים מנותחים', 'Need at least two weeks of analyzed games'))
      : h(React.Fragment, null,
        h('div', { className: 'wp-scroll' },
          h('table', { className: 'wp-table' },
            h('thead', null, h('tr', null,
              h('th', { scope: 'col' }, text('שבוע', 'Week')),
              h('th', { scope: 'col', className: 'wp-num' }, text('משחקים', 'Games')),
              h('th', { scope: 'col', className: 'wp-num' }, text('דיוק ממוצע', 'Avg accuracy')),
              h('th', { scope: 'col', className: 'wp-num' }, 'ACPL'))),
            h('tbody', null, progress.rows.map(row =>
              h('tr', { key: row.weekStart, className: row.games ? '' : 'wp-empty-week' },
                h('th', { scope: 'row', className: 'wp-week', title: row.weekStart + ' – ' + row.weekEnd, dir: 'ltr' }, row.label),
                h('td', { className: 'wp-num' }, String(row.games)),
                cell('accuracy', row, en),
                cell('acpl', row, en)))))),
        !progress.hasAcpl && h('p', { className: 'dna-sample-note' }, text('ACPL יופיע למשחקים שינותחו מעכשיו', 'ACPL will appear for games analyzed from now on')),
        h('p', { className: 'dna-muted wp-note' }, text(
          'ירוק = שיפור (דיוק עולה, ACPL יורד), אדום = הרעה, — = יציב (עד ±1.0 נקודות דיוק או ±5 cp). ההשוואה היא מול השבוע הקודם שיש בו נתונים.',
          'Green = better (accuracy up, ACPL down), red = worse, — = stable (within ±1.0 accuracy points or ±5 cp). Compared with the previous week that has data.')),
        progress.bulletExcluded && h('p', { className: 'dna-muted wp-note' }, text(
          'משחקי Bullet לא נכללים בחישוב. שבועות לפי ISO (מתחילים ביום שני).',
          'Bullet games are not included. Weeks are ISO weeks (Monday start).'))));
}
