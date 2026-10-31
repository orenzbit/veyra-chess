import { getLang } from './i18n.js';
import { headToHead, loadTournamentResults, standingsOrder } from './tournament-results.js';
import type { TournamentResults } from './tournament-results.js';

const h = React.createElement;
const useState = React.useState as <T>(value: T) => [T, (next: T | ((previous: T) => T)) => void];
const useEffect = React.useEffect as (effect: () => void | (() => void), deps: unknown[]) => void;

export type ResultsStatus = 'loading' | 'ready' | 'empty';
export interface BotResultsViewProps {
  lang: 'he' | 'en';
  status: ResultsStatus;
  results: TournamentResults | null;
  bots: any[];
  selectedId: string;
  onSelect: (botId: string) => void;
}

// Only the roster display name is ever shown; bot ids are internal and are never rendered.
const displayName = (bot: any): string => String(bot?.nickname || bot?.name || '');
const pointsText = (points: number) => Number.isInteger(points) ? String(points) : points.toFixed(1);

function dateText(iso: string | null, lang: 'he' | 'en'): string {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(time) ? new Date(time).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB') : '';
}

/** Pure view (no hooks) so Node checks can render every state. */
export function botResultsView({ lang, status, results, bots, selectedId, onSelect }: BotResultsViewProps) {
  const he = lang === 'he';
  const text = (hebrew: string, english: string) => he ? hebrew : english;
  const title = text('טבלת בוטים מול בוטים', 'Bot vs bot results');
  const rosterById = new Map<string, any>((Array.isArray(bots) ? bots : []).filter((bot) => bot && bot.id).map((bot) => [bot.id, bot]));
  const ranked = results ? standingsOrder(results.bots).filter((record) => rosterById.has(record.id)) : [];
  const heading = h('div', { className: 'legends-section-heading' }, h('h2', null, title));
  const wrap = (...children: unknown[]) => h('section', { className: 'legends-bot-results panel', dir: he ? 'rtl' : 'ltr', lang, 'aria-label': title }, heading, ...children);

  if (status === 'loading') return wrap(h('p', { className: 'muted', role: 'status' }, text('טוען תוצאות…', 'Loading results…')));
  if (!results || !ranked.length) {
    return wrap(h('p', { className: 'bot-results-empty', role: 'status' }, text('עדיין אין תוצאות טורניר', 'No tournament results yet')));
  }

  const selected = ranked.find((record) => record.id === selectedId) || ranked[0];
  const rankOf = new Map(ranked.map((record, index) => [record.id, index]));
  const versus = headToHead(results, selected.id)
    .filter((row) => rankOf.has(row.opponentId))
    .sort((x, y) => (rankOf.get(x.opponentId) as number) - (rankOf.get(y.opponentId) as number));
  const date = dateText(results.generatedAt, lang);
  const scroll = (label: string, table: unknown) => h('div', { className: 'bot-results-scroll', role: 'region', tabIndex: 0, 'aria-label': label }, table);
  const head = (labels: string[]) => h('thead', null, h('tr', null, labels.map((label, index) => h('th', { scope: 'col', key: index }, label))));

  const standings = scroll(text('טבלת דירוג', 'Standings table'),
    h('table', { className: 'bot-results-table' },
      head([text('מקום', 'Rank'), text('בוט', 'Bot'), text('ניצחונות', 'Wins'), text('תיקו', 'Draws'), text('הפסדים', 'Losses'), text('נקודות', 'Points')]),
      h('tbody', null, ranked.map((record, index) => h('tr', { key: record.id, className: record.id === selected.id ? 'is-selected' : '' },
        h('td', null, String(index + 1)),
        h('th', { scope: 'row' }, h('button', {
          type: 'button', className: 'bot-results-name', 'aria-pressed': record.id === selected.id,
          onClick: () => onSelect(record.id),
        }, displayName(rosterById.get(record.id)))),
        h('td', null, String(record.wins)), h('td', null, String(record.draws)), h('td', null, String(record.losses)),
        h('td', { className: 'bot-results-points' }, pointsText(record.points)))))));

  const selectedName = displayName(rosterById.get(selected.id));
  const headToHeadBody = versus.length
    ? scroll(text('תוצאות ראש בראש', 'Head-to-head table'),
      h('table', { className: 'bot-results-table' },
        head([text('יריב', 'Opponent'), text('ניצחונות', 'Wins'), text('תיקו', 'Draws'), text('הפסדים', 'Losses'), text('משחקים', 'Games')]),
        h('tbody', null, versus.map((row) => h('tr', { key: row.opponentId },
          h('th', { scope: 'row' }, displayName(rosterById.get(row.opponentId))),
          h('td', null, String(row.wins)), h('td', null, String(row.draws)), h('td', null, String(row.losses)), h('td', null, String(row.games)))))))
    : h('p', { className: 'muted', role: 'status' }, text('אין נתוני ראש בראש עבור הבוט הזה.', 'No head-to-head data for this bot.'));

  return wrap(
    results.demo && h('p', { className: 'bot-results-demo', role: 'note' }, text(
      'נתוני הדגמה בלבד לבדיקה מקומית — אלה אינן תוצאות טורניר אמיתיות.',
      'Demo data for local review only — these are not real tournament results.')),
    h('p', { className: 'muted bot-results-meta' },
      text(results.games + ' משחקים', results.games + ' games') + (date ? ' · ' + date : '')),
    standings,
    h('div', { className: 'bot-results-versus' },
      h('label', { className: 'bot-results-picker' }, text('בחר בוט לראש בראש', 'Pick a bot for head-to-head'),
        h('select', { value: selected.id, onChange: (event: any) => onSelect(event.target.value) },
          ranked.map((record) => h('option', { key: record.id, value: record.id }, displayName(rosterById.get(record.id)))))),
      h('h3', null, text('ראש בראש: ', 'Head-to-head: ') + selectedName),
      headToHeadBody));
}

export function BotResultsSection({ bots }: { bots: any[] }) {
  const [language, setLanguage] = useState(getLang());
  const [state, setState] = useState({ status: 'loading', results: null } as { status: ResultsStatus; results: TournamentResults | null });
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    const update = () => setLanguage(getLang());
    window.addEventListener('tabia-language-change', update);
    return () => window.removeEventListener('tabia-language-change', update);
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadTournamentResults().then((results) => { if (!cancelled) setState({ status: results ? 'ready' : 'empty', results }); });
    return () => { cancelled = true; };
  }, []);
  return botResultsView({ lang: language, status: state.status, results: state.results, bots, selectedId, onSelect: setSelectedId });
}
