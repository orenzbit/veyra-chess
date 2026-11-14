// The statistics page's weekly report card (WEEKLY_REPORT_ENABLED): rating up or down, and what changed in the
// openings and endgames, for the last 7 days against the 7 before. The numbers come from weekly-report.ts.
import type { Block, WeeklyReport } from './weekly-report.js';

const h = React.createElement;
const TIME_CLASS: Record<string, { he: string; en: string }> = { bullet: { he: 'בולט', en: 'Bullet' }, blitz: { he: 'בליץ', en: 'Blitz' }, rapid: { he: 'רפיד', en: 'Rapid' }, daily: { he: 'יומי', en: 'Daily' } };
const games = (n: number, en: boolean) => (en ? (n === 1 ? '1 game' : `${n} games`) : n === 1 ? 'משחק אחד' : `${n} משחקים`);
const pts = (n: number, en: boolean) => (en ? (n === 1 ? '1 point' : `${n} points`) : n === 1 ? 'נקודה אחת' : `${n} נקודות`);
const shortDate = (d: string) => `${Number(d.slice(8, 10))}.${Number(d.slice(5, 7))}`;

export function WeeklyReportCard({ report, archiveLoaded, lang }: { report: WeeklyReport; archiveLoaded: boolean; lang: string }) {
  const en = lang === 'en'; const t = (he: string, enText: string) => (en ? enText : he);
  const trend = (b: Block) => b.trend === 'better' ? h('span', { className: 'weekly-trend better' }, t('השתפר ↑', 'Improved ↑'))
    : b.trend === 'worse' ? h('span', { className: 'weekly-trend worse' }, t('ירד ↓', 'Dropped ↓'))
    : b.trend === 'same' ? h('span', { className: 'weekly-trend same' }, t('בלי שינוי', 'No change'))
    : h('span', { className: 'weekly-trend new' }, t('חדש השבוע', 'New this week'));
  const line = (b: Block) => {
    const now = [b.score !== null ? t(`ניקוד ${b.score}%`, `score ${b.score}%`) : '', b.accuracy !== null ? t(`דיוק ${b.accuracy}%`, `accuracy ${b.accuracy}%`) : ''].filter(Boolean).join(' · ');
    const prev = b.prevGames ? [b.prevScore !== null ? t(`ניקוד ${b.prevScore}%`, `score ${b.prevScore}%`) : '', b.prevAccuracy !== null ? t(`דיוק ${b.prevAccuracy}%`, `accuracy ${b.prevAccuracy}%`) : ''].filter(Boolean).join(' · ') : '';
    return h('span', null, games(b.games, en) + (now ? ` · ${now}` : '') + (prev ? t(` (שבוע קודם: ${games(b.prevGames, en)}, ${prev})`, ` (last week: ${games(b.prevGames, en)}, ${prev})`) : ''));
  };
  return h('section', { className: 'dna-time-card weekly-report', 'data-weekly-report': true, dir: en ? 'ltr' : 'rtl' },
    h('h2', null, t('הדוח השבועי שלך', 'Your weekly report')),
    h('p', { className: 'dna-muted' }, t('7 הימים האחרונים ', 'The last 7 days '), h('bdi', { dir: 'ltr' }, `(${shortDate(report.start)}–${shortDate(report.end)})`), t(' מול 7 הימים שלפניהם.', ' against the 7 before.')),
    h('div', { className: 'weekly-grid' },
      h('div', { className: 'weekly-box', 'data-weekly-rating': true }, h('h3', null, t('דירוג', 'Rating')),
        !archiveLoaded ? h('p', { className: 'dna-muted' }, t('טען את המשחקים בארכיון כדי לראות את שינוי הדירוג.', 'Load your games in the Archive to see the rating change.'))
        : report.ratings.length === 0 ? h('p', { className: 'dna-muted' }, t('לא שיחקת משחק מדורג השבוע.', 'No rated game this week.'))
        : report.ratings.map(r => h('p', { key: r.timeClass, className: 'weekly-rating ' + (r.change > 0 ? 'up' : r.change < 0 ? 'down' : 'flat') },
          h('b', null, (TIME_CLASS[r.timeClass] || { he: r.timeClass, en: r.timeClass })[en ? 'en' : 'he'] + ': '),
          r.change > 0 ? t(`עלית ${pts(r.change, en)}`, `up ${pts(r.change, en)}`) : r.change < 0 ? t(`ירדת ${pts(-r.change, en)}`, `down ${pts(-r.change, en)}`) : t('בלי שינוי', 'no change'),
          ' ', h('bdi', { dir: 'ltr' }, `(${r.before} → ${r.after})`), ` · ${games(r.games, en)}`))),
      h('div', { className: 'weekly-box', 'data-weekly-openings': true }, h('h3', null, t('פתיחות', 'Openings')),
        report.openings.length === 0 ? h('p', { className: 'dna-muted' }, t('אין השבוע משחקים מנותחים בדוח ה-DNA.', 'No analysed games from this week in your DNA report.'))
        : report.openings.map(o => h('p', { key: o.name, className: 'weekly-opening' }, h('b', { dir: 'ltr' }, o.name), ' ', trend(o), h('br'), line(o)))),
      h('div', { className: 'weekly-box', 'data-weekly-endgames': true }, h('h3', null, t('סיומים', 'Endgames')),
        h('p', { className: 'dna-muted' }, t('משחקים שהגיעו לסיום (40 מהלכים שלך ומעלה).', 'Games that reached an endgame (40+ of your moves).')),
        report.endgames.games === 0 ? h('p', { className: 'dna-muted' }, t('השבוע לא היו משחקים ארוכים.', 'No long games this week.'))
        : h('p', null, trend(report.endgames), h('br'), line(report.endgames)))));
}
