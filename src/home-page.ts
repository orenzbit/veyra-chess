import { getLang } from './i18n.js';

const h = React.createElement;
const useState = React.useState as <T>(value: T) => [T, (next: T | ((previous: T) => T)) => void];
const useEffect = React.useEffect as (effect: () => void | (() => void), deps: unknown[]) => void;
const useRef = React.useRef as <T>(value: T) => { current: T };

export type HomeDestination = 'archive' | 'review' | 'dna' | 'bots' | 'legends' | 'puzzles' | 'openings' | 'daily-streak';
type HomeBoard = { setPosition: (fen: string, animated?: boolean) => void | Promise<unknown>; destroy: () => void };
export type HomeBoardFactory = (element: HTMLDivElement, fen: string) => HomeBoard;
const POSITIONS = {
  played: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R',
  alternative: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R',
};

function SampleBoard({ position, createBoard, label }: { position: string; createBoard: HomeBoardFactory; label: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const board = useRef<HomeBoard | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    try { board.current = createBoard(host.current, position); }
    catch (error) { console.error('Homepage board could not load', error); setFailed(true); }
    return () => { board.current?.destroy(); board.current = null; };
  }, [createBoard]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => board.current?.setPosition(position, false)).catch(error => {
      if (active) { console.error('Homepage position could not update', error); setFailed(true); }
    });
    return () => { active = false; };
  }, [position]);
  return h('div', { className: 'ch-board', ref: host, role: 'img', 'aria-label': label },
    failed && h('p', { role: 'alert' }, getLang() === 'he' ? 'לא ניתן להציג את לוח הדוגמה.' : 'The sample board could not be displayed.'));
}

export function HomePage({ signedIn, onSignIn, onNavigate, createBoard, Brand, LangButton }: {
  signedIn: boolean; onSignIn: () => void; onNavigate: (page: HomeDestination) => void;
  createBoard: HomeBoardFactory; Brand: typeof React.Component; LangButton: typeof React.Component;
}) {
  const [language, setLanguage] = useState(getLang());
  const [choice, setChoice] = useState<'played' | 'alternative'>('played');
  const [reduced, setReduced] = useState(false);
  const heroBoard = useRef<HTMLDivElement | null>(null);
  const text = (he: string, en: string) => language === 'he' ? he : en;
  const open = (page: HomeDestination) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (signedIn) onNavigate(page); else onSignIn();
  };
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  useEffect(() => {
    const update = () => setLanguage(getLang());
    window.addEventListener('tabia-language-change', update);
    return () => window.removeEventListener('tabia-language-change', update);
  }, []);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const draw = () => {
      frame = 0;
      if (heroBoard.current) heroBoard.current.style.rotate = `${reduced || preference.matches ? 0 : Math.min(1, Math.max(0, scrollY / 650)) * 9}deg`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
    draw();
    window.addEventListener('scroll', schedule, { passive: true });
    preference.addEventListener('change', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); preference.removeEventListener('change', schedule); };
  }, [reduced]);
  const link = (page: HomeDestination, he: string, en: string, className = 'ch-button ch-ghost') =>
    h('button', { className, onClick: () => open(page), 'data-home-destination': page }, text(he, en));
  return h('div', { className: 'cinematic-home', dir: language === 'he' ? 'rtl' : 'ltr', 'data-reduced': String(reduced) },
    h('a', { className: 'ch-skip', href: '#home-content' }, text('דלג לתוכן', 'Skip to content')),
    h('aside', { className: 'ch-sidebar', 'aria-label': text('ניווט ראשי', 'Main navigation') },
      h('a', { className: 'ch-mark', href: '#home-content', 'aria-label': 'Veyra Home' }, 'v.'),
      h('nav', null,
        h('a', { className: 'ch-side-link', href: '#home-content', 'aria-current': 'page' }, text('בית', 'Home')),
        link('archive', 'ארכיון', 'Archive', 'ch-side-link'),
        link('review', 'סקירה', 'Review', 'ch-side-link'),
        link('dna', 'Chess DNA', 'Chess DNA', 'ch-side-link')),
      h('span', { className: 'ch-side-foot' }, 'YOUR NEXT MOVE')),
    h('div', { className: 'ch-shell' },
      h('header', { className: 'ch-topbar' },
        h(Brand, { section: 'Veyra Chess' }),
        h('div', { className: 'ch-top-actions' },
          h('button', { className: 'ch-motion', 'aria-pressed': reduced, onClick: () => setReduced(value => !value) }, text('הפחתת תנועה', 'Reduce motion')),
          h(LangButton),
          signedIn ? link('archive', 'המשחקים שלי', 'My games', 'ch-button ch-accent') :
            h('button', { className: 'ch-button ch-accent', onClick: onSignIn, 'data-home-auth': true }, text('כניסה / הרשמה', 'Sign in / Sign up')))),
      h('main', { id: 'home-content', tabIndex: -1 },
        h('section', { className: 'ch-hero' },
          h('div', { className: 'ch-eyebrow' }, 'YOUR GAME. YOUR NEXT MOVE.'),
          h('h1', null, text('לא רק לדעת שטעית.', 'More than a mistake.'), h('br'), h('span', null, text('למצוא את הצעד הבא.', 'Find your next move.'))),
          h('p', { className: 'ch-lead' }, text('המשחקים שלך. האפשרויות שלא ניסית. והתמונה שמתחילה להתבהר. מרחב אחד לניתוח, חקירה ואימון.', "Your games. The moves you haven't explored. A clearer picture of your chess. One place to review, explore and train.")),
          h('div', { className: 'ch-hero-buttons' },
            h('a', { className: 'ch-button ch-accent', href: '#home-review-demo' }, text('לראות את הרעיון בפעולה', 'Explore the concept'), ' ↗'),
            link('dna', 'לגלות את Chess DNA', 'Discover Chess DNA')),
          h('div', { className: 'ch-hero-art', 'aria-hidden': true },
            h('div', { className: 'ch-hero-board', ref: heroBoard }, h(SampleBoard, { position: POSITIONS.played, createBoard, label: 'Italian Game' })),
            h('span', { className: 'ch-art-note' }, text('אותו לוח. נקודת מבט חדשה.', 'The same board. A new perspective.'))),
          h('a', { className: 'ch-scroll-cue', href: '#home-why' }, text('גוללים כדי לראות מעבר לציון', 'Scroll beyond the score'), ' ↓')),
        h('section', { className: 'ch-section', id: 'home-why' },
          h('div', { className: 'ch-eyebrow' }, 'BEYOND THE SCORE'),
          h('h2', null, text('המשחק נגמר.', 'The game ends.'), h('br'), text('החקירה רק מתחילה.', 'The exploration begins.')),
          h('p', { className: 'ch-intro' }, text('ציון יכול לסכם משחק. כאן יש לך מרחב לבדוק אותו — בקצב שלך, עם השאלות שלך.', 'A score can summarise a game. Here you have room to explore it — at your pace, with your own questions.')),
          h('div', { className: 'ch-principles' },
            h('article', null, h('span', { className: 'ch-index' }, '01 / BRING YOUR GAME'), h('h3', null, text('המשחקים שלך, במקום אחד', 'Bring your own games')), h('p', null, text('ייבוא מ־Chess.com, מ־Lichess או מ־PGN. נקודת ההתחלה היא השחמט שכבר שיחקת.', 'Import from Chess.com, Lichess or PGN. Start with the chess you already play.'))),
            h('article', null, h('span', { className: 'ch-index' }, '02 / ASK WHAT IF'), h('h3', null, text('לא לעצור ב״מהלך שגוי״', "Don't stop at “mistake”")), h('p', null, text('עבור בין המסעים ופתח את הסברי המאמן למהלך ולאיום. חקירת הסתעפויות מתקדמת היא כיוון לפיתוח, לא יכולת שהדוגמה הזו מבטיחה.', 'Step through moves and open the coach explanations for a move or threat. Advanced branching exploration is a future direction, not a capability promised by this sample.'))),
            h('article', null, h('span', { className: 'ch-index' }, '03 / SEE YOUR PATTERNS'), h('h3', null, text('לראות מעבר למשחק אחד', 'Look beyond one game')), h('p', null, text('Chess DNA מרכז מדדים ממשחקים שונים. פתח את הדוח האישי שלך כדי לחקור את הנתונים שנשמרו בחשבון.', 'Chess DNA brings together metrics from multiple games. Open your personal report to explore the data saved in your account.'))))),
        h('section', { className: 'ch-section', id: 'home-review-demo' },
          h('div', { className: 'ch-eyebrow' }, 'INTERACTIVE SAMPLE'),
          h('h2', null, text('אותה עמדה.', 'Same position.'), h('br'), text('שאלה אחרת.', 'A different question.')),
          h('p', { className: 'ch-intro' }, text('הלוח וכלי השחמט נשארים מוכרים. סביבם יש מקום נקי להסתכל, להשוות ולהבין.', 'Keep the familiar board and pieces. A focused space around them to look, compare and understand.')),
          h('div', { className: 'ch-review-demo' },
            h('div', { className: 'ch-board-frame' }, h('div', { className: 'ch-board-meta' }, text('עמדת פתיחה לדוגמה', 'Sample opening position')), h(SampleBoard, { position: POSITIONS[choice], createBoard, label: text('לוח הדגמה — ', 'Sample board — ') + (choice === 'played' ? 'Bc4' : 'd4') })),
            h('div', null, h('div', { className: 'ch-eyebrow' }, text('אתה בוחר מה לבדוק', 'YOU CHOOSE WHAT TO EXPLORE')),
              h('div', { className: 'ch-move-options', role: 'group', 'aria-label': text('מסע לדוגמה', 'Sample move') },
                h('button', { 'data-home-move': 'played', 'aria-pressed': choice === 'played', onClick: () => setChoice('played') }, text('המהלך ששוחק', 'Played move'), ' · Bc4'),
                h('button', { 'data-home-move': 'alternative', 'aria-pressed': choice === 'alternative', onClick: () => setChoice('alternative') }, text('אפשרות אחרת', 'An alternative'), ' · d4')),
              h('div', { className: 'ch-move-copy', 'aria-live': 'polite' },
                h('h3', null, choice === 'played' ? text('מוציאים את הרץ למשחק.', 'Bring the bishop into play.') : text('בודקים את המרכז.', 'Explore the centre.')),
                h('p', null, choice === 'played' ? text('המסע Bc4 מפתח את הרץ לאלכסון שמכוון ל־f7. בחר באפשרות האחרת כדי לראות שינוי בעמדה.', 'Bc4 develops the bishop onto a diagonal towards f7. Select the alternative to see the position change.') : text('המסע d4 מציב רגלי במרכז ותוקף את e5. זוהי אפשרות חוקית לבדיקה, לא המלצת מנוע.', 'd4 puts a pawn in the centre and attacks e5. This is a legal option to explore, not an engine recommendation.'))),
              h('p', { className: 'ch-note' }, text('עמדה קבועה להמחשת הממשק. אין כאן ניתוח מנוע, דירוג איכות או טענה שחלופה אחת עדיפה.', 'A fixed position to demonstrate the interface. No engine analysis, quality rating or claim that one move is better.')),
              link('review', 'לפתוח את הסקירה', 'Open game review')))),
        h('section', { className: 'ch-section ch-destination' },
          h('div', null, h('div', { className: 'ch-eyebrow' }, 'CHESS DNA'), h('h2', null, text('לא עוד טבלה.', 'Not another table.'), h('br'), text('הסיפור של המשחק שלך.', 'The story of your chess.')),
            h('p', { className: 'ch-intro' }, text('פתח את הדוח הקיים כדי לראות מדדים מהמשחקים שלך. אין כאן נתונים אישיים מומצאים או הבטחה לשיפור.', 'Open the existing report to see metrics from your games. No fabricated personal data or promises of improvement.')),
            link('dna', 'פתיחת Chess DNA', 'Open Chess DNA', 'ch-button ch-accent'),
            h('div', { className: 'ch-tool-list' }, link('bots', 'בוטים', 'Bots'), link('legends', 'אגדות', 'Legends'), link('puzzles', 'פאזלים', 'Puzzles'), link('openings', 'פתיחות', 'Openings'), link('daily-streak', 'רצף יומי', 'Daily streak'))),
          h('img', { className: 'ch-coach', src: '/coach-avatar.webp', alt: text('מאמן Veyra — האיור הקיים', 'Veyra coach — existing artwork'), loading: 'lazy' }))),
      h('footer', { className: 'ch-footer' },
        h('p', null, text('בטא פרטית · מגיל 18 · הרשמה דורשת אישור מפעיל ואימות אימייל. אווטרים חדשים ותגובות המאמן עדיין בפיתוח.', 'Private beta · Ages 18+ · Signup requires operator approval and email verification. New avatars and coach reactions are still future work.')),
        h('nav', { 'aria-label': text('מדיניות וקרדיטים', 'Policies and credits') },
          h('a', { href: '/legal/terms.html' }, text('תנאי שימוש', 'Terms')), h('a', { href: '/legal/privacy.html' }, text('פרטיות', 'Privacy')),
          h('a', { href: '/legal/cookies.html' }, 'Cookies'), h('a', { href: '/legal/accessibility.html' }, text('נגישות', 'Accessibility')), h('a', { href: '/credits.html' }, text('קרדיטים', 'Credits'))))));
}
