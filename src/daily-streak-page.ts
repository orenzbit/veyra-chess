import { getLang } from './i18n.js';
import { dailyQueueKey, dailyTimezone, getDailyStreakState, pendingQueueCount, setDailyStreakTimezone, type DailyStreakResult } from './daily-streak-client.js';
import { openingStreakQueueKey } from './opening-streak.js';

const h = React.createElement;
const useState = React.useState as <T>(value: T) => [T, (next: T | ((previous: T) => T)) => void];
const useEffect = React.useEffect as (effect: () => void | (() => void), deps: unknown[]) => void;
const useRef = React.useRef as <T>(value: T) => { current: T };
const MILESTONES = [7, 14, 30, 50, 100, 365];

export function DailyStreakPage({ userId, onBack, onPuzzles, onOpenings, Brand, LangButton }: {
  userId: string; onBack: () => void; onPuzzles: () => void; onOpenings: () => void;
  Brand: typeof React.Component; LangButton: typeof React.Component;
}) {
  const [language, setLanguage] = useState(getLang());
  const [result, setResult] = useState<DailyStreakResult | { kind: 'loading' }>({ kind: 'loading' });
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState({ puzzles: 0, openings: 0, error: false });
  const [timezoneStatus, setTimezoneStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const timezoneRequest = useRef<AbortController | null>(null);
  const text = (he: string, en: string) => language === 'he' ? he : en;
  const refresh = () => setRevision(value => value + 1);
  useEffect(() => {
    const changeLanguage = () => setLanguage(getLang());
    window.addEventListener('tabia-language-change', changeLanguage);
    return () => window.removeEventListener('tabia-language-change', changeLanguage);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setResult({ kind: userId ? 'loading' : 'signed-out' });
    setPending({ puzzles: 0, openings: 0, error: false });
    if (userId) {
      try {
        setPending({
          puzzles: pendingQueueCount(localStorage, dailyQueueKey(userId)),
          openings: pendingQueueCount(localStorage, openingStreakQueueKey(userId)), error: false,
        });
      } catch {
        setPending({ puzzles: 0, openings: 0, error: true });
      }
      void getDailyStreakState(userId, controller.signal).then(next => {
        if (!controller.signal.aborted) setResult(next);
      }, () => {
        if (!controller.signal.aborted) setResult({ kind: 'error' });
      });
    }
    return () => controller.abort();
  }, [userId, revision]);
  useEffect(() => {
    const retry = () => setRevision(value => value + 1);
    const visible = () => { if (!document.hidden) retry(); };
    window.addEventListener('online', retry);
    window.addEventListener('storage', retry);
    document.addEventListener('visibilitychange', visible);
    return () => {
      timezoneRequest.current?.abort();
      window.removeEventListener('online', retry);
      window.removeEventListener('storage', retry);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [userId]);

  async function changeTimezone() {
    timezoneRequest.current?.abort();
    const controller = new AbortController();
    timezoneRequest.current = controller;
    setTimezoneStatus('saving');
    try {
      const next = await setDailyStreakTimezone(userId, controller.signal);
      if (controller.signal.aborted) return;
      if (next.kind !== 'ready') { setTimezoneStatus('error'); return; }
      setTimezoneStatus('idle');
      refresh();
    } catch {
      if (!controller.signal.aborted) setTimezoneStatus('error');
    }
  }
  const state = result.kind === 'ready' ? result.state : null;
  const todayQualified = !!state?.calendar.find(day => day.date === state.today)?.qualified;
  const activeDays = state?.calendar.filter(day => day.qualified).length || 0;
  const nextMilestone = state ? MILESTONES.find(days => days > state.longestStreak) : undefined;
  const dateLabel = state ? new Date(state.today + 'T12:00:00Z').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }) : '';
  const panel = (className: string, ...children: unknown[]) => h('section', { className: 'rhythm-panel ' + className }, ...children);
  const dayStatus = todayQualified ? text('היום הושלם · ממשיכים מחר', 'Today complete · keep going tomorrow')
    : state?.currentStreak ? text('עד אתמול · היום עוד אפשר להתאמן', 'Through yesterday · today is still open')
    : text('היום פתוח · אפשר להתחיל מחדש', 'Today is open · start a new streak');
  const metric = (value: string | number, label: string, testId: string) => h('div', null,
    h('strong', { 'data-rhythm': testId }, String(value)), h('span', null, label));

  return h('div', { className: 'app-shell daily-rhythm', dir: language === 'he' ? 'rtl' : 'ltr', 'data-rhythm-state': result.kind },
    h('header', { className: 'topbar' }, h(Brand, { section: text('רצף יומי', 'Daily streak') }),
      h('div', { className: 'top-actions' }, h(LangButton), h('button', { onClick: onBack }, text('חזרה לארכיון', 'Back to archive')))),
    h('main', { className: 'rhythm-content', 'aria-busy': result.kind === 'loading' || timezoneStatus === 'saving' },
      h('section', { className: 'rhythm-heading' },
        h('div', null, h('span', { className: 'rhythm-eyebrow' }, 'YOUR DAILY RHYTHM'),
          h('h1', null, text('עוד יום. עוד צעד קדימה.', 'Another day. A little stronger.')),
          h('p', null, text('לא צריך לנצח בכל משחק. צריך להמשיך ללמוד. הרצף מתקדם רק לאחר אימות פעילות בשרת.',
            'You do not have to win every game. Keep learning. Your streak advances only after the server verifies an activity.'))),
        state && h('div', { className: 'rhythm-date' }, dateLabel, h('br'), h('bdi', null, state.timezoneId))),
      h('nav', { className: 'rhythm-nav', 'aria-label': text('מסכי אימון', 'Training pages') },
        h('button', { 'aria-current': 'page', type: 'button' }, text('הרצף היומי', 'Daily streak')),
        h('button', { onClick: onPuzzles }, text('רצף הפאזלים', 'Puzzle streak')),
        h('button', { onClick: onOpenings }, text('לימוד פתיחות', 'Opening study')),
        h('button', { className: 'rhythm-refresh', onClick: refresh, disabled: result.kind === 'loading' || timezoneStatus === 'saving' },
          text('רענון', 'Refresh'))),
      !state ? panel('rhythm-unavailable',
        h('h2', { role: result.kind === 'error' ? 'alert' : 'status' }, result.kind === 'loading' ? text('טוען את הרצף היומי...', 'Loading your daily streak...')
          : result.kind === 'disabled' ? text('הרצף היומי עדיין לא הופעל בשרת.', 'Daily streak is not enabled on the server yet.')
          : result.kind === 'signed-out' ? text('צריך להתחבר מחדש כדי לטעון את הרצף.', 'Sign in again to load your streak.')
          : text('לא ניתן לטעון את הרצף כרגע.', 'Could not load your streak right now.')),
        h('p', null, text('ההיסטוריה, השיאים והתקדמות הלימוד לא נמחקו. אפשר להמשיך לפאזלים ולפתיחות.',
          'Your history, bests and learning progress have not been deleted. You can continue to puzzles and opening study.')),
        result.kind !== 'loading' && h('button', { onClick: refresh }, text('נסה שוב', 'Try again')))
        : h('div', { className: 'rhythm-layout' },
          h('div', { className: 'rhythm-stack' },
            panel('rhythm-summary',
              h('div', { className: 'rhythm-hero' },
                h('div', null, h('span', { className: 'rhythm-label' }, text('הרצף היומי שלך', 'Your current streak')),
                  h('div', { className: 'rhythm-big' }, h('bdi', { 'data-rhythm': 'current' }, state.currentStreak),
                    h('small', null, text('ימים', 'days'))),
                  h('span', { className: 'rhythm-status' }, dayStatus)),
                h('div', { className: 'rhythm-seal', 'aria-hidden': 'true' },
                  h('svg', { viewBox: '0 0 64 80', fill: 'none' },
                    h('path', { d: 'M37 5C43 23 25 26 34 39C42 37 46 31 45 26C62 46 55 69 34 74C11 73 4 55 13 40C17 32 25 24 24 16C31 21 29 28 30 30C37 24 34 15 37 5Z', fill: 'currentColor' }),
                    h('path', { d: 'M32 43C36 53 24 55 29 66C36 70 42 61 39 55C47 66 40 73 33 73C20 69 20 57 32 43Z', fill: '#17100a' })))),
              h('div', { className: 'rhythm-stats' },
                metric(state.longestStreak, text('השיא האישי · לא מתאפס', 'Personal best · never reset'), 'best'),
                metric(activeDays + ' / ' + state.calendar.length, text('ימים פעילים בחלון המוצג', 'Active days in this window'), 'active'),
                metric(state.milestonesReached.length ? state.milestonesReached.join(' · ') : '—',
                  text('אבני דרך שכבר הושגו', 'Milestones already earned'), 'earned'))),
            panel('rhythm-calendar-panel',
              h('div', { className: 'rhythm-card-heading' }, h('h2', null, text('לוח הפעילות שלך', 'Your activity calendar')),
                h('span', { className: 'rhythm-label' }, text('35 הימים האחרונים', 'Last 35 days'))),
              h('div', { className: 'rhythm-calendar', role: 'list', 'aria-label': text('לוח פעילות של 35 ימים', '35-day activity calendar') },
                ...state.calendar.map(day => {
                  const label = day.qualified ? text('פעילות מאומתת', 'Verified activity')
                    : day.isToday ? text('היום עדיין פתוח', 'Today is still open') : text('ללא פעילות מאומתת', 'No verified activity');
                  return h('div', { key: day.date, role: 'listitem', className: 'rhythm-day' + (day.qualified ? ' is-qualified' : '') + (day.isToday ? ' is-today' : ''),
                    title: day.date + ' · ' + label, 'aria-label': day.date + ' · ' + label },
                  h('span', null, Number(day.date.slice(-2))), h('small', null, day.qualified ? '✓' : day.isToday ? text('היום', 'TODAY') : ''));
                })),
              h('div', { className: 'rhythm-legend' }, h('span', null, text('יום מאומת', 'Verified day')),
                h('span', null, text('ללא פעילות מאומתת', 'No verified activity')), h('span', null, text('היום פתוח', 'Today open'))))),
          h('aside', { className: 'rhythm-stack' },
            panel('rhythm-actions',
              h('div', { className: 'rhythm-card-heading' }, h('h2', null, text('הצעד של היום', "Today's next step")),
                h('span', { className: 'rhythm-tag' }, text('פעילות אחת מספיקה', 'One activity is enough'))),
              h('div', { className: 'rhythm-task' }, h('span', { 'aria-hidden': true }, '◇'),
                h('div', null, h('h3', null, text('פתרון פאזל', 'Solve a puzzle')), h('p', null,
                  text('פתרון שאושר בשרת מזכה ביום פעילות. רצף הפתרונות והשיא שלו נשארים נפרדים.',
                    'A server-accepted solution qualifies the day. Your puzzle-solving streak and its high score stay separate.')))),
              h('div', { className: 'rhythm-task' }, h('span', { 'aria-hidden': true }, '↗'),
                h('div', null, h('h3', null, text('השלמת לימוד פתיחה', 'Complete an opening')), h('p', null,
                  text('למד את כל קווי הליבה. השרת בודק את המהלכים מול הרפרטואר לפני שהיום נספר.',
                    'Learn every required line. The server checks the transcript against the repertoire before the day counts.')))),
              h('button', { className: 'rhythm-primary', onClick: onOpenings }, text('להמשיך ללימוד פתיחות', 'Continue opening study')),
              h('button', { className: 'rhythm-secondary', onClick: onPuzzles }, text('לפתור פאזל', 'Solve a puzzle')),
              h('p', { className: 'rhythm-footnote' }, text('יום נספר פעם אחת בלבד, גם אם השלמת כמה פעילויות.',
                'Each date counts once, even if you complete several activities.'))),
            panel('rhythm-milestones',
              h('div', { className: 'rhythm-goal' }, h('h2', null, nextMilestone ? text('היעד הבא: ', 'Next milestone: ') + nextMilestone + text(' ימים', ' days')
                : text('כל אבני הדרך הושגו', 'All milestones earned')),
              nextMilestone && h('bdi', { 'data-rhythm': 'goal' }, state.currentStreak + ' / ' + nextMilestone)),
              nextMilestone && h('progress', { max: nextMilestone, value: state.currentStreak, 'aria-label': text('התקדמות ברצף הנוכחי', 'Current streak progress') }),
              h('div', { className: 'rhythm-badges' }, ...MILESTONES.map(days =>
                h('div', { key: days, className: 'rhythm-badge' + (state.milestonesReached.includes(days) ? ' is-earned' : '') },
                  h('b', null, days), h('small', null, state.milestonesReached.includes(days) ? text('הושג', 'Earned') : text('בהמשך', 'Ahead'))))),
              h('p', { className: 'rhythm-footnote' }, text('יום חסר לא מוחק את השיא או הישגים שכבר הושגו.',
                'A missed day does not erase your personal best or earned milestones.'))))),
      panel('rhythm-sync',
        h('h2', null, text('סנכרון ואזור זמן', 'Sync and timezone')),
        pending.error ? h('p', { role: 'alert' }, text('לא ניתן לקרוא את התור המקומי. לא שינינו או מחקנו את הנתונים.',
          'Could not read the local queue. No stored data was changed or deleted.'))
          : h('p', { 'data-rhythm': 'pending' }, text('בהמתנה במכשיר זה: ', 'Queued on this device: ') +
            pending.puzzles + text(' פאזלים · ', ' puzzles · ') + pending.openings + text(' פתיחות', ' openings')),
        (pending.puzzles > 0 || pending.openings > 0) && h('p', null, text(
          'פעילות ממתינה עדיין לא נספרת. פתח את מסך הפאזלים או הפתיחות כדי לנסות לשלוח אותה שוב. יום הקבלה בשרת הוא היום שייספר.',
          'Pending activity does not count yet. Open the puzzle or opening trainer to retry sending it. The server receipt date is the date that will count.')),
        state?.pendingTimezoneId && h('p', { role: 'status' }, text('שינוי אזור הזמן ממתין ליום המקומי הבא ולמניעת חזרה לאחור בתאריך: ',
          'Timezone change waits for the next local date and prevents moving behind your last qualified date: ') + state.pendingTimezoneId),
        state && !state.pendingTimezoneId && state.timezoneId !== dailyTimezone() &&
          h('button', { onClick: changeTimezone, disabled: timezoneStatus === 'saving' }, text('החל אזור זמן של המכשיר מהיום הבא', 'Use device timezone from the next local day')),
        timezoneStatus === 'error' && h('p', { role: 'alert' }, text('שינוי אזור הזמן נכשל. הנתונים המוצגים לא שונו; אפשר לנסות שוב.',
          'Timezone change failed. The displayed data was not changed; you can try again.'))),
      h('footer', { className: 'rhythm-footer' }, text('מבוסס על פעילות מאומתת בחשבון שלך. ללא שינוי ברצף הפאזלים, בשיאים או בהגדרות השמע.',
        'Based on verified activity in your account. Your puzzle streak, high scores and audio settings are unchanged.'))));
}
