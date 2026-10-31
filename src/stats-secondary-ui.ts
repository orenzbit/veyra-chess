import { buildOpeningStats, OPENING_DEFAULT_ROWS, OPENING_MIN_GAMES, type OpeningStatsRow } from './stats-openings.js';
import { buildAcplStats, formatAcpl } from './stats-acpl.js';

// Secondary statistics for the Statistics page: win rate per opening and average ACPL.
// Both read the saved DNA report that the page already loaded; nothing is fetched or re-analyzed here.
const h = React.createElement;

type Lang = 'he' | 'en';
const text = (lang: Lang, he: string, en: string) => (lang === 'en' ? en : he);

const percent = (value: number | null) => (value === null ? '—' : Math.round(value) + '%');

export function OpeningWinRateTable({ report, lang }: { report: any; lang: Lang }) {
  const [showAll, setShowAll] = React.useState(false);
  const rows: OpeningStatsRow[] = buildOpeningStats(report);
  const visible = showAll ? rows : rows.slice(0, OPENING_DEFAULT_ROWS);
  const title = text(lang, 'אחוזי ניצחון לפי פתיחה', 'Win rate by opening');
  return h('section', { className: 'dna-time-card stats-openings', dir: lang === 'en' ? 'ltr' : 'rtl', 'aria-labelledby': 'stats-openings-title' },
    h('div', { className: 'dna-time-card-header' },
      h('h2', { id: 'stats-openings-title' }, title),
      h('span', { className: 'dna-count' }, rows.length ? text(lang, rows.length + ' פתיחות', rows.length + ' openings') : '')),
    rows.length === 0
      ? h('p', { className: 'dna-muted' }, text(lang,
        'עדיין אין פתיחה עם לפחות ' + OPENING_MIN_GAMES + ' משחקים בדוח השמור.',
        'No opening has at least ' + OPENING_MIN_GAMES + ' games in the saved report yet.'))
      : h(React.Fragment, null,
        h('div', { className: 'stats-table-scroll' },
          h('table', { className: 'stats-table' },
            h('thead', null, h('tr', null,
              h('th', { scope: 'col' }, text(lang, 'פתיחה', 'Opening')),
              h('th', { scope: 'col', className: 'num' }, text(lang, 'משחקים', 'Games')),
              h('th', { scope: 'col', className: 'num', title: text(lang, 'ניצחונות', 'Wins') }, text(lang, 'נ׳', 'W')),
              h('th', { scope: 'col', className: 'num', title: text(lang, 'תיקו', 'Draws') }, text(lang, 'ת׳', 'D')),
              h('th', { scope: 'col', className: 'num', title: text(lang, 'הפסדים', 'Losses') }, text(lang, 'ה׳', 'L')),
              h('th', { scope: 'col', className: 'num', title: text(lang, 'דיוק ממוצע', 'Average accuracy') }, text(lang, 'דיוק', 'Acc.')))),
            h('tbody', null, visible.map((row, index) => h('tr', { key: row.isUnknown ? 'unknown' : row.name + index },
              h('th', { scope: 'row', className: 'stats-opening-name', dir: 'auto' }, row.isUnknown ? text(lang, 'לא ידוע', 'Unknown') : row.name),
              h('td', { className: 'num' }, String(row.games)),
              h('td', { className: 'num' }, percent(row.winPct)),
              h('td', { className: 'num' }, percent(row.drawPct)),
              h('td', { className: 'num' }, percent(row.lossPct)),
              h('td', { className: 'num' }, row.averageAccuracy === null ? '—' : row.averageAccuracy.toFixed(1) + '%')))))),
        rows.length > OPENING_DEFAULT_ROWS && h('button', {
          type: 'button', className: 'archive-fetch-button stats-toggle', 'aria-expanded': showAll, onClick: () => setShowAll(!showAll)
        }, showAll
          ? text(lang, 'הצג רק את 10 המובילות', 'Show top ' + OPENING_DEFAULT_ROWS + ' only')
          : text(lang, 'הצג הכול (' + rows.length + ')', 'Show all (' + rows.length + ')')),
        h('p', { className: 'dna-muted' }, text(lang,
          'ניצחון/תיקו/הפסד מנקודת מבטך, על בסיס המשחקים בדוח DNA השמור. מוצגות רק פתיחות עם ' + OPENING_MIN_GAMES + ' משחקים לפחות, לפי שם הפתיחה בארכיון המשחק.',
          'Win/draw/loss from your side, based on the games in the saved DNA report. Only openings with at least ' + OPENING_MIN_GAMES + ' games are shown, using the opening name from the game archive.'))));
}

export function AcplCard({ report, lang }: { report: any; lang: Lang }) {
  const stats = buildAcplStats(report);
  return h('section', { className: 'dna-time-card stats-acpl', dir: lang === 'en' ? 'ltr' : 'rtl' },
    h('div', { className: 'dna-time-card-header' }, h('h2', null, text(lang, 'ACPL ממוצע', 'Average ACPL'))),
    h('div', { className: 'dna-stat-grid' },
      h('div', { className: 'dna-stat' },
        h('span', null, text(lang, 'אובדן סנטי־פיון ממוצע למהלך שלך', 'Average centipawn loss per move of yours')),
        h('strong', { className: 'stats-acpl-value' }, formatAcpl(stats.average))),
      h('div', { className: 'dna-stat' },
        h('span', null, text(lang, 'משחקים שנכללו בחישוב', 'Games included')),
        h('strong', null, text(lang, stats.games + ' מתוך ' + stats.totalGames, stats.games + ' of ' + stats.totalGames)))),
    stats.games < stats.totalGames && h('p', { className: 'dna-sample-note' },
      text(lang, 'ACPL זמין למשחקים שנותחו מעכשיו', 'ACPL is available for games analyzed from now on')),
    h('p', { className: 'dna-muted' }, text(lang,
      'ACPL נמדד רק על המהלכים שלך. הפסד מוגבל ל־1000 לכל מהלך, ומהלכי ספר פתיחות ומהלכים מאולצים אינם נספרים.',
      'ACPL counts only your own moves. Loss is capped at 1000 per move; book and forced moves are not counted.')));
}
