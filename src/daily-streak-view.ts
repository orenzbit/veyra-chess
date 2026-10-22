import {
  flushDailyStreakQueue, getDailyStreakState, pendingDailyStreakCount, setDailyStreakTimezone,
} from './daily-streak-client.js';

const h = React.createElement;
const useState = React.useState as <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
const useEffect = React.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

export function DailyStreakView({ userId }: { userId?: string }) {
  const [state, setState] = useState<any>(null);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!userId) { setLoading(false); setState(null); setError(''); return; }
    const refresh = async () => {
      setLoading(true);
      setError('');
      try {
        let timezoneId = 'Asia/Jerusalem';
        try { timezoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || timezoneId; } catch {}
        await setDailyStreakTimezone(timezoneId);
        await flushDailyStreakQueue(userId);
        const next = await getDailyStreakState();
        if (cancelled) return;
        if (!next) {
          setState(null);
          setError('הרצף היומי עדיין לא זמין. ייתכן שנדרשת הגירת מסד נתונים או התחברות מחדש.');
        } else {
          setState(next);
          setError('');
        }
        setPending(pendingDailyStreakCount(userId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void refresh();
    const onOnline = () => { void refresh(); };
    window.addEventListener('online', onOnline);
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    return () => { cancelled = true; window.removeEventListener('online', onOnline); clearInterval(timer); };
  }, [userId, refreshKey]);

  if (!userId) {
    return h('div', { className: 'result-card daily-streak-login' },
      h('h2', null, 'הרצף היומי נשמר בחשבון שלך'),
      h('p', { className: 'muted' }, 'התחבר כדי לסנכרן ימי פעילות בין מכשירים ולשמור על ההיסטוריה.'),
    );
  }
  if (loading && !state) return h('div', { className: 'result-card', role: 'status' }, h('h2', null, 'טוען רצף יומי…'));
  if (!state) {
    return h('div', { className: 'result-card' },
      h('h2', null, 'לא הצלחתי לטעון את הרצף היומי'),
      h('p', { className: 'muted' }, error || 'בדוק את החיבור ונסה שוב.'),
      h('button', { className: 'primary', onClick: () => setRefreshKey((n) => n + 1) }, 'נסה שוב'),
      pending > 0 && h('p', { className: 'muted' }, 'ממתינים לסנכרון: ' + pending),
    );
  }
  const headline = state.todayQualified
    ? 'כל הכבוד, הפעילות של היום נשמרה.'
    : state.canMaintainToday
      ? 'הרצף שלך נשמר עד אתמול. השלם פעילות היום כדי להמשיך.'
      : 'היום עדיין פתוח. השלם פעילות מזכה כדי להתחיל או להמשיך רצף.';
  const statusLabel = (day: any) => day.qualified ? 'יום מזכה' : day.isToday ? 'היום פתוח' : 'ללא פעילות מזכה';
  const dayCells = (state.calendar || []).map((day: any) => h('div', {
    key: day.date,
    className: 'daily-streak-day ' + (day.qualified ? 'is-qualified' : day.isToday ? 'is-today' : 'is-missed'),
    title: day.date + ': ' + statusLabel(day),
    'aria-label': day.date + ': ' + statusLabel(day),
    role: 'img',
  }, h('span', { className: 'daily-streak-day-number' }, day.date.slice(-2)),
  h('span', { className: 'daily-streak-day-mark', 'aria-hidden': 'true' }, day.qualified ? '✓' : day.isToday ? '○' : '·')));
  const milestones = (state.milestones || []).map((m: any) => h('div', {
    key: m.days, className: 'daily-streak-milestone ' + (m.earned ? 'is-earned' : 'is-locked'),
    'aria-label': m.days + ' ימים' + (m.earned ? ', הושג' : ', טרם הושג'),
  }, h('strong', null, String(m.days)), h('span', null, 'ימים'), h('small', null, m.earned ? 'הושג' : 'יעד')));
  return h('section', { className: 'daily-streak-panel', 'aria-labelledby': 'daily-streak-title' },
    h('div', { className: 'daily-streak-heading' },
      h('div', null, h('p', { className: 'eyebrow' }, 'VEYRA CHESS'), h('h1', { id: 'daily-streak-title' }, 'רצף יומי'),
        h('p', { className: 'muted' }, headline)),
      h('button', { className: 'daily-streak-refresh', onClick: () => setRefreshKey((n) => n + 1), disabled: loading, 'aria-label': 'רענן רצף יומי' }, loading ? 'טוען…' : 'רענן')
    ),
    h('div', { className: 'daily-streak-stats' },
      h('div', { className: 'daily-streak-stat primary-stat' }, h('span', null, 'הרצף הנוכחי'), h('strong', null, String(state.currentStreak))),
      h('div', { className: 'daily-streak-stat' }, h('span', null, 'שיא אישי'), h('strong', null, String(state.bestStreak))),
      h('div', { className: 'daily-streak-stat' }, h('span', null, 'היום'), h('strong', null, state.todayQualified ? 'הושלם' : 'פתוח'))
    ),
    h('div', { className: 'daily-streak-calendar-wrap' },
      h('div', { className: 'daily-streak-section-heading' }, h('h2', null, '42 הימים האחרונים'), h('span', { className: 'muted' }, state.timezoneId)),
      h('div', { className: 'daily-streak-legend', 'aria-label': 'מקרא' },
        h('span', null, h('i', { className: 'legend-dot is-qualified' }), 'פעילות מזכה'),
        h('span', null, h('i', { className: 'legend-dot is-today' }), 'היום'),
        h('span', null, h('i', { className: 'legend-dot is-missed' }), 'ללא פעילות')),
      h('div', { className: 'daily-streak-grid', role: 'group', 'aria-label': 'לוח פעילות יומי' }, ...dayCells)
    ),
    h('div', { className: 'daily-streak-section-heading' }, h('h2', null, 'אבני דרך')),
    h('div', { className: 'daily-streak-milestones' }, ...milestones),
    state.pendingTimezoneId && h('p', { className: 'daily-streak-note' }, 'אזור הזמן יתעדכן ל-' + state.pendingTimezoneId + ' בתאריך ' + state.timezoneEffectiveOn + '.'),
    pending > 0 && h('p', { className: 'daily-streak-note', role: 'status' }, 'יש ' + pending + ' אירועי פעילות שממתינים לאימות וסנכרון. הם ייחשבו לפי זמן קבלת השרת, לא לפי שעון המכשיר.'),
    error && h('p', { className: 'daily-streak-error', role: 'alert' }, error)
  );
}
