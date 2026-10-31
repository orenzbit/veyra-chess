// Learn mode of the opening trainer: the board (owned by OpeningsPage) shows the line one move at a time and this panel
// explains the current step, lists the next moves and shows how the line differs from the opening's main line.
// Learn mode is read-only: it never marks a line as learned and never talks to the opening streak. Only the quiz does.
import { divergenceFromMain, mainLineOf, moveLabel, sansOf, upcomingMoves, type LearnLine, type LearnOpening } from './opening-divergence.js';
import { explanationFor, loadOpeningExplanations, type OpeningExplanationMap } from './opening-explanations.js';

const h = React.createElement;
const useState = React.useState as <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
const useEffect = React.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

// One fetch per page load; a missing file is cached as {} so it is not requested again on every step.
let explanationsPromise: Promise<OpeningExplanationMap> | null = null;
function explanations(): Promise<OpeningExplanationMap> {
  if (!explanationsPromise) explanationsPromise = loadOpeningExplanations((url) => fetch(url));
  return explanationsPromise;
}

export function OpeningLearn({ op, line, ply, setPly, en }: { op: LearnOpening & { name?: string }; line: LearnLine; ply: number; setPly: (n: number) => void; en: boolean }) {
  const [texts, setTexts] = useState<OpeningExplanationMap>({});
  useEffect(() => {
    let live = true;
    explanations().then((map) => { if (live) setTexts(map); });
    return () => { live = false; };
  }, []);

  const sans = sansOf(line);
  const total = sans.length;
  const comment = ply > 0 && line.moves[ply - 1] ? line.moves[ply - 1][1] : '';
  const idea = (line as LearnLine & { idea?: string }).idea;
  const next = upcomingMoves(sans, ply, 3);
  const main = mainLineOf(op);
  const diff = divergenceFromMain(op, line);
  const why = diff ? explanationFor(texts, op.id, line.id, en ? 'en' : 'he') : null;
  const mover = (p: number) => (p % 2 === 0 ? (en ? 'White' : 'לבן') : (en ? 'Black' : 'שחור'));

  const step = ply === 0
    ? h('p', null, en ? 'Press Next to play the first move.' : 'לחץ ״הבא״ כדי לשחק את המהלך הראשון.')
    : h('div', null,
      h('p', { className: 'open-learn-move' }, h('b', null, moveLabel(ply - 1, sans[ply - 1])), h('span', { className: 'muted' }, ' · ' + mover(ply - 1))),
      comment ? h('p', null, comment) : null);

  return h('section', { className: 'open-learn', 'data-open-learn': 'on', 'aria-label': en ? 'Learn this line' : 'למד את הקו' },
    h('h4', null, en ? 'Learn this line' : 'למד את הקו'),
    h('div', { className: 'open-learn-step', 'aria-live': 'polite' }, step,
      (ply === 0 || ply >= total) && idea ? h('p', { className: 'muted' }, idea) : null,
      ply >= total && total > 0 ? h('p', { className: 'muted' }, en ? 'End of the line.' : 'סוף הקו.') : null),
    h('div', { className: 'row open-learn-nav' },
      h('button', { disabled: ply <= 0, onClick: () => setPly(ply - 1) }, en ? '◀ Previous' : '◀ הקודם'),
      h('span', { className: 'muted' }, `${ply}/${total}`),
      h('button', { className: 'primary', disabled: ply >= total, onClick: () => setPly(ply + 1) }, en ? 'Next ▶' : 'הבא ▶')),
    next.length > 0 && h('div', { className: 'open-learn-next' },
      h('b', null, en ? 'Coming next' : 'הצעדים הבאים'),
      h('ol', null, next.map((m) => h('li', { key: m.ply }, m.label)))),
    diff && h('div', { className: 'open-learn-diff', 'data-open-diff': String(diff.ply) },
      h('b', null, en ? 'Difference from the main line' : 'ההבדל מהקו הראשי'),
      main && h('p', { className: 'muted' }, (en ? 'Main line: ' : 'הקו הראשי: ') + main.name),
      h('p', null, en
        ? `Departs at move ${diff.moveNumber} (${diff.color === 'w' ? 'White' : 'Black'}).`
        : `סוטה במהלך ${diff.moveNumber} (${diff.color === 'w' ? 'לבן' : 'שחור'}).`),
      h('ul', null,
        h('li', null, (en ? 'Main line: ' : 'הקו הראשי: ') + (diff.mainMove ? moveLabel(diff.ply, diff.mainMove) : (en ? 'the line has ended' : 'הקו הסתיים'))),
        h('li', null, (en ? 'This line: ' : 'הקו הזה: ') + (diff.lineMove ? moveLabel(diff.ply, diff.lineMove) : (en ? 'the line ends here' : 'הקו מסתיים כאן')))),
      why ? h('p', { className: 'open-learn-why' }, why) : null,
      h('button', { onClick: () => setPly(Math.min(diff.ply, total)) }, en ? 'Show the departure point' : 'הצג את נקודת הסטייה')));
}
