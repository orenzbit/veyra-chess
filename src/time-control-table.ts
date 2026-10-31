import { getLang } from './i18n.js';
import { BASE_MINUTE_BUCKET_LABELS, normalizeBaseMinuteTable } from './time-control.js';
import type { BaseMinuteRow } from './time-control.js';

const h = React.createElement;
const useState = React.useState as <T>(value: T) => [T, (next: T | ((previous: T) => T)) => void];
const useEffect = React.useEffect as (effect: () => void | (() => void), deps: unknown[]) => void;

const percentText = (value: number | null) => value === null ? '—' : value.toFixed(1) + '%';

/**
 * "Performance by exact time control" table, rendered under the Bullet/Blitz/Rapid cards.
 * `table` is the optional `baseMinuteBuckets` field of a saved DNA report; reports
 * saved before this field existed show a "regenerate" note instead.
 */
export function BaseMinuteTableSection({ table }: { table: unknown }) {
  const [language, setLanguage] = useState(getLang());
  useEffect(() => {
    const update = () => setLanguage(getLang());
    window.addEventListener('tabia-language-change', update);
    return () => window.removeEventListener('tabia-language-change', update);
  }, []);
  const he = language === 'he';
  const text = (hebrew: string, english: string) => he ? hebrew : english;
  const data = normalizeBaseMinuteTable(table);
  const heading = h('div', { className: 'dna-time-card-header' },
    h('h2', null, text('ביצועים לפי זמן בסיס', 'Performance by base time')),
    data && data.totalGames > 0 && h('span', { className: 'dna-count' }, data.totalGames + text(' משחקים', ' games')));

  let body;
  if (!data) {
    body = h('p', { className: 'dna-muted' }, text(
      'הדוח השמור הזה נוצר לפני שהוספנו את החלוקה לפי זמן בסיס. צרו דוח DNA חדש כדי לראות אותה.',
      'This saved report was created before the base-time split existed. Generate a new DNA report to see it.'));
  } else if (data.totalGames === 0) {
    body = h('p', { className: 'dna-muted' }, text(
      'אין עדיין משחקים בדוח, ולכן אין מה לפצל לפי זמן בסיס.',
      'There are no games in the report yet, so there is nothing to split by base time.'));
  } else {
    const unknownGames = data.rows.reduce((sum, row) => sum + row.unknownTimeControl, 0);
    const headers = [
      text('קצב', 'Time control'), text('משחקים', 'Games'), text('ניצחון', 'Win'), text('תיקו', 'Draw'),
      text('הפסד', 'Loss'), text('דיוק ממוצע', 'Avg accuracy'), text('מהלכים', 'Moves'),
    ];
    const cell = (row: BaseMinuteRow, value: string, className?: string) => h('td', { className }, row.games ? value : '—');
    body = h(React.Fragment, null,
      h('div', {
        className: 'dna-base-minute-scroll', role: 'region', tabIndex: 0,
        'aria-label': text('טבלת ביצועים לפי זמן בסיס', 'Performance by base time table'),
      },
        h('table', { className: 'dna-base-minute-table' },
          h('thead', null, h('tr', null, headers.map((label, index) => h('th', { scope: 'col', key: index }, label)))),
          h('tbody', null, data.rows.map(row => h('tr', { key: row.bucket, className: row.games ? '' : 'is-empty' },
            h('th', { scope: 'row' }, BASE_MINUTE_BUCKET_LABELS[row.bucket][language]),
            h('td', null, String(row.games)),
            cell(row, percentText(row.winPct)), cell(row, percentText(row.drawPct)), cell(row, percentText(row.lossPct)),
            cell(row, percentText(row.averageAccuracy)),
            cell(row, String(row.moves)))))) ),
      h('p', { className: 'dna-muted dna-base-minute-note' }, text(
        'אחוזי ניצחון, תיקו והפסד מחושבים לפי משחקים עם תוצאה ידועה; דיוק ממוצע רק לפי משחקים עם דיוק. "אחר" כולל קצבים איטיים יותר מ־12.5 דקות ובסיס זמן חסר או לא מזוהה' + (unknownGames ? ' (' + unknownGames + ' משחקים)' : '') + '.',
        'Win, draw and loss percentages use games with a known result; average accuracy uses only games with accuracy. "Other" holds time controls slower than 12.5 minutes plus missing or unrecognized ones' + (unknownGames ? ' (' + unknownGames + ' games)' : '')         + '.')));
  }
  return h('section', { className: 'dna-time-card dna-base-minute-card', 'aria-label': text('ביצועים לפי זמן בסיס', 'Performance by base time') }, heading, body);
}
