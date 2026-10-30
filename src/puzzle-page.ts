// Puzzle streak page. Reuses the app's board (cm-chessboard), rules layer
// (window.ChessLib) and the shipped puzzle modules in ./puzzle/.
import { hintFor } from './puzzle/engine.js';
import { judge } from './puzzle/board-view.js';
import type { PuzzleRecord } from './puzzle/repo.js';
import { createPuzzleApi } from './puzzle/api.js';
import { PuzzleData } from './puzzle/data.js';
import { PersonalView } from './puzzle/personal-view.js';
import { RushView } from './puzzle/rush-view.js';

const Chess = (window as any).ChessLib.Chess;
const Chessboard = (window as any).ChessBoardLib.Chessboard;
const COLOR = (window as any).ChessBoardLib.COLOR;
const BORDER_TYPE = (window as any).ChessBoardLib.BORDER_TYPE;
const h = React.createElement;
// React is a global (CDN UMD), typed as any; give the hooks explicit types.
const useState = React.useState as <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
const useRef = React.useRef as <T>(v: T) => { current: T };
const useEffect = React.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

const SEED_URL = '/data/puzzle-seed.json';
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BEST_KEY = 'veyra_puzzle_best_streak_v1';
const STREAK_MILESTONE = 3;
const NEXT_DELAY_MS = 1000;

const PROMO_PIECES = [
  { letter: 'q', name: 'מלכה', white: '♕', black: '♛' },
  { letter: 'r', name: 'צריח', white: '♖', black: '♜' },
  { letter: 'b', name: 'רץ', white: '♗', black: '♝' },
  { letter: 'n', name: 'פרש', white: '♘', black: '♞' },
];

const MOTIF_LABEL: Record<string, string> = {
  missed_mate: 'מט שהוחמץ',
  hanging_piece: 'כלי תלוי',
  endgame: 'סיום',
  general: 'כללי',
  king_safety: 'ביטחון המלך',
  opening: 'פתיחה',
  time_pressure: 'לחץ זמן',
};

function readBest(): number {
  try { const n = Number(localStorage.getItem(BEST_KEY)); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; } catch { return 0; }
}
function writeBest(n: number) {
  try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* storage unavailable: best streak is per-session */ }
}
function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function sideName(fen: string): string { return fen.split(' ')[1] === 'w' ? 'לבן' : 'שחור'; }
function sanFor(fen: string, uci: string): string {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return mv && mv.san ? mv.san : uci;
  } catch { return uci; }
}
function hintText(rec: PuzzleRecord, level: number): string {
  const raw = hintFor(rec, level);
  if (raw.startsWith('from:')) return 'כלי במשבצת ' + raw.slice(5);
  if (raw.startsWith('target:')) return 'היעד: ' + raw.slice(7);
  if (raw.startsWith('promote:')) return 'הכלי מתקדם להכתרה: ' + raw.slice(8);
  if (raw.startsWith('move:')) return 'המהלך: ' + sanFor(rec.fen, raw.slice(5));
  return raw;
}


function dailyTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}
function dailyEventId(): string {
  try { if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID(); } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
function dailyQueueKey(userId: string): string { return 'veyra_daily_streak_outbox_v1:' + userId; }

function StreakView({ userId = '' }: { userId?: string }) {
  const [puzzles, setPuzzles] = useState<PuzzleRecord[]>([]);
  const [dailyState, setDailyState] = useState<any>(null);
  const [dailyStatus, setDailyStatus] = useState<'loading' | 'ready' | 'signed-out' | 'disabled' | 'error'>('loading');
  const [dailyPending, setDailyPending] = useState(0);
  const [dailyNotice, setDailyNotice] = useState('');
  const [dailyOwnerId, setDailyOwnerId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [current, setCurrent] = useState<PuzzleRecord | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(readBest());
  const [solved, setSolved] = useState(0);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'miss' | 'milestone'; text: string } | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [locked, setLocked] = useState(false);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardObj = useRef<any>(null);
  const currentRef = useRef<PuzzleRecord | null>(null);
  const lockedRef = useRef(false);
  const queueRef = useRef<PuzzleRecord[]>([]);
  const streakRef = useRef(0);
  const bestRef = useRef(best);
  const timerRef = useRef<any>(null);

  function setLockBoth(v: boolean) { lockedRef.current = v; setLocked(v); }

  async function submitDailyActivity(item: { eventId: string; puzzleId: string; move: string }): Promise<'ok' | 'pending' | 'disabled' | 'rejected'> {
    try {
      const res = await fetch('/api/daily-streak?action=record', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...item, timezoneId: dailyTimezone() }),
      });
      let data: any = {};
      try { data = await res.json(); } catch {}
      if (res.ok && data?.ok) {
        const milestones = [7, 14, 30, 50, 100, 365];
        if (milestones.includes(data.currentStreak) && Number(dailyOwnerId === userId ? dailyState?.currentStreak || 0 : 0) < data.currentStreak) setDailyNotice('כל הכבוד! הגעת לרצף של ' + data.currentStreak + ' ימים.');
        setDailyState(data);
        setDailyOwnerId(userId);
        setDailyStatus('ready');
        return 'ok';
      }
      if (res.status === 404 && data?.error === 'DISABLED') {
        setDailyStatus('disabled');
        return 'disabled';
      }
      if (res.status === 422) return 'rejected';
      return 'pending';
    } catch { return 'pending'; }
  }

  function readDailyQueue(): Array<{ eventId: string; puzzleId: string; move: string }> {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(dailyQueueKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x: any) => x && typeof x.eventId === 'string' && typeof x.puzzleId === 'string' && typeof x.move === 'string').slice(-100) : [];
    } catch { return []; }
  }

  function writeDailyQueue(items: Array<{ eventId: string; puzzleId: string; move: string }>) {
    if (!userId) return;
    const bounded = items.slice(-100);
    try { if (bounded.length) localStorage.setItem(dailyQueueKey(userId), JSON.stringify(bounded)); else localStorage.removeItem(dailyQueueKey(userId)); } catch {}
    setDailyPending(bounded.length);
  }

  async function flushDailyQueue() {
    if (!userId) return;
    const queue = readDailyQueue();
    if (!queue.length) { setDailyPending(0); return; }
    const remaining = queue.slice();
    for (const item of queue) {
      const result = await submitDailyActivity(item);
      if (result === 'pending') break;
      remaining.shift();
      if (result === 'disabled') { writeDailyQueue([]); return; }
    }
    writeDailyQueue(remaining);
  }

  async function recordDailyActivity(puzzleId: string, move: string) {
    if (!userId || visibleDailyStatus === 'disabled' || dailyStatus === 'signed-out') return;
    const item = { eventId: dailyEventId(), puzzleId, move };
    const result = await submitDailyActivity(item);
    if (result === 'pending') writeDailyQueue([...readDailyQueue(), item]);
  }

  useEffect(() => {
    if (!userId) { setDailyOwnerId(''); setDailyStatus('signed-out'); setDailyState(null); setDailyPending(0); return; }
    let cancelled = false;
    setDailyOwnerId(''); setDailyStatus('loading'); setDailyState(null); setDailyPending(0);
    const load = async () => {
      try {
        const url = '/api/daily-streak?action=state&timezoneId=' + encodeURIComponent(dailyTimezone());
        const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
        let data: any = {};
        try { data = await res.json(); } catch {}
        if (cancelled) return;
        if (res.status === 404 && data?.error === 'DISABLED') { setDailyOwnerId(userId); setDailyStatus('disabled'); return; }
        if (!res.ok || !data?.ok) { setDailyOwnerId(userId); setDailyStatus('error'); return; }
        setDailyState(data); setDailyOwnerId(userId); setDailyStatus('ready');
        setDailyPending(readDailyQueue().length);
        void flushDailyQueue();
      } catch { if (!cancelled) { setDailyOwnerId(userId); setDailyStatus('error'); } }
    };
    void load();
    const online = () => { void flushDailyQueue(); };
    window.addEventListener('online', online);
    return () => { cancelled = true; window.removeEventListener('online', online); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  // Put the board in the puzzle's position (and orientation), and keep input locked until the
  // board has finished animating, so an early drag cannot land on a square that is still moving.
  function syncBoard(rec: PuzzleRecord, animated: boolean) {
    const b = boardObj.current;
    setLockBoth(true);
    if (!b) { setLockBoth(false); return; }
    const want = rec.fen.split(' ')[1] === 'w' ? COLOR.white : COLOR.black;
    const jobs: Promise<unknown>[] = [b.setPosition(rec.fen, animated)];
    // cm-chessboard drops a second turn request while one is queued, so only turn when needed.
    if (b.getOrientation() !== want) jobs.push(b.setOrientation(want, animated));
    const unlock = () => { if (currentRef.current === rec) setLockBoth(false); };
    Promise.all(jobs).then(unlock, unlock);
    setTimeout(unlock, 1500); // safety net: never leave the board locked
  }

  function nextPuzzle(list: PuzzleRecord[]) {
    if (!list.length) return;
    if (queueRef.current.length === 0) {
      const lastId = currentRef.current?.id;
      let order = shuffled(list);
      if (order.length > 1 && order[0].id === lastId) order = order.slice(1).concat(order[0]);
      queueRef.current = order;
    }
    const rec = queueRef.current.shift() as PuzzleRecord;
    currentRef.current = rec;
    setCurrent(rec);
    setHintLevel(0);
    setFeedback(null);
    setPromo(null);
    syncBoard(rec, false);
  }

  // Load the seed once.
  useEffect(() => {
    let cancelled = false;
    fetch(SEED_URL, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('seed ' + r.status); return r.json(); })
      .then(doc => {
        if (cancelled) return;
        const list: PuzzleRecord[] = Array.isArray(doc?.puzzles) ? doc.puzzles : [];
        if (!list.length) throw new Error('empty seed');
        setPuzzles(list);
        queueRef.current = shuffled(list);
        nextPuzzle(list);
      })
      .catch(() => { if (!cancelled) setLoadError('טעינת הפאזלים נכשלה.'); });
    return () => { cancelled = true; clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One attempt at a move, used by both drag input and the promotion chooser.
  // Returns the verdict and the position after the move (null when illegal).
  function attempt(from: string, to: string, promotion?: string): { verdict: 'correct' | 'wrong' | 'illegal'; afterFen: string | null } {
    const cur = currentRef.current;
    if (!cur || lockedRef.current) return { verdict: 'illegal', afterFen: null };
    let c: any;
    let mv: any;
    try { c = new Chess(cur.fen); mv = c.move({ from, to, promotion }); } catch { mv = null; }
    if (!mv) return { verdict: 'illegal', afterFen: null };
    const uci = from + to + (promotion ? String(promotion).toLowerCase() : '');
    const j = judge(cur, uci);
    if (j.verdict === 'correct') {
      setLockBoth(true);
      void recordDailyActivity(cur.id, uci);
      const nextStreak = streakRef.current + 1;
      streakRef.current = nextStreak;
      setStreak(nextStreak);
      setSolved(v => v + 1);
      if (nextStreak > bestRef.current) { bestRef.current = nextStreak; setBest(nextStreak); writeBest(nextStreak); }
      if (nextStreak === STREAK_MILESTONE) setFeedback({ kind: 'milestone', text: '🔥 רצף של ' + STREAK_MILESTONE + '! ממשיכים?' });
      else setFeedback({ kind: 'ok', text: j.viaAlt ? 'מהלך שווה ערך. גם זה נכון!' : 'נכון!' });
      timerRef.current = setTimeout(() => nextPuzzle(puzzlesRef.current), NEXT_DELAY_MS);
      return { verdict: 'correct', afterFen: c.fen() };
    }
    // Wrong: reset the streak and show the correct move; the board snaps back.
    streakRef.current = 0;
    setStreak(0);
    setLockBoth(true);
    setFeedback({ kind: 'miss', text: 'לא מדויק. המהלך הנכון: ' + sanFor(cur.fen, cur.solution[0]) });
    return { verdict: 'wrong', afterFen: null };
  }

  // Board: created once. Input goes through refs so it always sees the current puzzle.
  useEffect(() => {
    if (!boardRef.current) return;
    const b = new Chessboard(boardRef.current, {
      position: START_FEN,
      orientation: COLOR.white,
      responsive: true,
      assetsUrl: '/vendor/cm-chessboard/',
      style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: 'pieces/standard.svg' }, animationDuration: 280 },
    });
    boardObj.current = b;
    // Colour is not restricted here; the rules check enforces the side to move.
    b.enableMoveInput((ev: any) => {
      const cur = currentRef.current;
      if (!cur || lockedRef.current) return false;
      if (ev.type === 'moveInputStarted') return true;
      if (ev.type !== 'validateMoveInput') return true;
      // A pawn reaching the last rank needs a promotion piece: ask the player.
      try {
        const probe = new Chess(cur.fen);
        const piece = probe.get(ev.squareFrom);
        const lastRank = ev.squareTo[1] === '1' || ev.squareTo[1] === '8';
        if (piece && piece.type === 'p' && lastRank && !ev.promotion) {
          setPromo({ from: ev.squareFrom, to: ev.squareTo });
          return false;
        }
      } catch { return false; }
      const res = attempt(ev.squareFrom, ev.squareTo, ev.promotion || undefined);
      return res.verdict === 'correct';
    });
    return () => { clearTimeout(timerRef.current); try { b.destroy(); } catch { /* already gone */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const puzzlesRef = useRef<PuzzleRecord[]>([]);
  useEffect(() => { puzzlesRef.current = puzzles; }, [puzzles]);

  function choosePromotion(piece: string) {
    const p = promo;
    setPromo(null);
    if (!p) return;
    const res = attempt(p.from, p.to, piece);
    const b = boardObj.current;
    if (b) b.setPosition(res.verdict === 'correct' && res.afterFen ? res.afterFen : (currentRef.current?.fen || START_FEN), true);
  }
  function cancelPromotion() {
    setPromo(null);
    const b = boardObj.current;
    if (b && currentRef.current) b.setPosition(currentRef.current.fen, true);
  }

  function retry() {
    const cur = currentRef.current;
    if (!cur) return;
    setFeedback(null);
    setHintLevel(0);
    syncBoard(cur, true);
  }
  function skip() { clearTimeout(timerRef.current); streakRef.current = 0; setStreak(0); nextPuzzle(puzzlesRef.current); }
  function giveHint() { if (current && hintLevel < 3) setHintLevel(hintLevel + 1); }

  const turn = current ? sideName(current.fen) : '';
  const motif = current ? (MOTIF_LABEL[current.motif] || current.motif) : '';
  const hintTxt = current && hintLevel > 0 ? hintText(current, hintLevel) : '';

  const visibleDailyState = dailyOwnerId === userId ? dailyState : null;
  const visibleDailyStatus = userId && dailyOwnerId !== userId ? 'loading' : dailyStatus;
  const dailyCalendar = Array.isArray(visibleDailyState?.calendar) ? visibleDailyState.calendar : [];
  const dailyCard = h('section', { className: 'daily-streak-card', 'aria-label': 'רצף אימון יומי' },
    h('div', { className: 'daily-streak-heading' },
      h('div', null, h('h2', null, 'רצף יומי'), h('p', { className: 'muted' }, 'יום נספר רק אחרי אימות שרת. אם עדיין לא התאמנת היום, הרצף נשאר פעיל עד סוף היום המקומי.')),
      userId && visibleDailyStatus === 'ready' && h('div', { className: 'daily-streak-numbers' },
        h('span', null, h('b', null, String(visibleDailyState.currentStreak || 0)), h('small', null, 'רצף נוכחי')),
        h('span', null, h('b', null, String(visibleDailyState.longestStreak || 0)), h('small', null, 'שיא'))
      )
    ),
    !userId ? h('p', { className: 'muted' }, 'התחבר כדי לשמור רצף יומי בחשבון ולסנכרן בין מכשירים.')
      : visibleDailyStatus === 'loading' ? h('p', { role: 'status' }, 'טוען את הרצף היומי...')
      : visibleDailyStatus === 'disabled' ? h('p', { className: 'muted' }, 'הרצף היומי עדיין לא הופעל בשרת.')
      : visibleDailyStatus === 'error' ? h('p', { className: 'muted', role: 'status' }, 'לא ניתן לטעון את הרצף כרגע. נסה שוב מאוחר יותר.')
      : h(React.Fragment, null,
          h('div', { className: 'daily-streak-calendar', role: 'list', 'aria-label': 'לוח פעילות של 35 ימים' },
            ...dailyCalendar.map((day: any) => h('div', {
              key: day.date, role: 'listitem', title: day.date + (day.qualified ? ' · פעילות מאומתת' : ' · ללא פעילות מאומתת'),
              className: 'daily-streak-day' + (day.qualified ? ' is-qualified' : '') + (day.isToday ? ' is-today' : ''),
              'aria-label': day.date + (day.qualified ? ', פעילות מאומתת' : ', ללא פעילות מאומתת'),
            }, h('span', null, day.date.slice(-2)), day.qualified && h('span', { className: 'daily-streak-check', 'aria-hidden': 'true' }, '✓'))),
          ),
          dailyNotice && h('p', { className: 'daily-streak-milestone', role: 'status' }, dailyNotice),
          Array.isArray(visibleDailyState?.milestonesReached) && visibleDailyState.milestonesReached.length > 0 && h('p', { className: 'muted daily-streak-footnote' }, 'אבני דרך שהושגו: ' + visibleDailyState.milestonesReached.join(', ') + ' ימים'),
          h('p', { className: 'muted daily-streak-footnote' },
            'אזור זמן: ' + String(visibleDailyState.timezoneId || 'UTC') +
            (dailyPending ? ' · ' + dailyPending + ' פעילות ממתינה לאימות' : '') +
            (visibleDailyState.pendingTimezoneId ? ' · שינוי אזור זמן ייכנס לתוקף ביום המקומי הבא' : '')
          ),
          visibleDailyState.timezoneId !== dailyTimezone() && !visibleDailyState.pendingTimezoneId && h('button', {
            type: 'button', onClick: async () => {
              try {
                const res = await fetch('/api/daily-streak?action=timezone', {
                  method: 'POST', credentials: 'same-origin', cache: 'no-store',
                  headers: { 'content-type': 'application/json' }, body: JSON.stringify({ timezoneId: dailyTimezone() }),
                });
                const data = await res.json();
                if (res.ok && data?.ok) setDailyState(data);
              } catch {}
            },
          }, 'החל אזור זמן של המכשיר מהיום הבא')
        )
  );

  return h('div', { className: 'puzzle-streak' },
      dailyCard,
      h('div', { className: 'botgame-top' },
        h('div', null, h('b', null, 'רצף פאזלים'), h('span', { className: 'muted' }, ' פתרו פאזלים ברצף בלי לטעות')),
        current && h('span', { className: 'muted' }, 'מזהה ' + current.id.slice(0, 6) + ' • דירוג ' + current.rating)
      ),
      loadError
        ? h('div', { className: 'result-card' }, h('h2', null, loadError))
        : h('div', { className: 'botgame-layout' },
            h('div', null,
              h('div', { className: 'board-wrap bot-board-wrap' }, h('div', { ref: boardRef, className: 'board', 'data-ready': locked ? 'false' : 'true' })),
              promo && current && h('div', { className: 'puzzle-promo' },
                h('span', { className: 'muted' }, 'בחר כלי להכתרה:'),
                ...PROMO_PIECES.map(pc => h('button', { key: pc.letter, onClick: () => choosePromotion(pc.letter) },
                  (current.fen.split(' ')[1] === 'w' ? pc.white : pc.black) + ' ' + pc.name)),
                h('button', { onClick: cancelPromotion }, 'ביטול')
              )
            ),
            h('aside', { className: 'coach-card bot-side-panel' },
              h('div', { className: 'clocks' },
                h('div', { className: 'clock-box active puzzle-stat' }, h('small', { className: 'muted' }, 'רצף'), h('div', null, String(streak))),
                h('div', { className: 'clock-box puzzle-stat' }, h('small', { className: 'muted' }, 'שיא'), h('div', null, String(best)))
              ),
              h('p', { className: 'muted puzzle-meta' },
                current ? 'תורך: ' + turn + ' • ' + motif : 'טוען פאזל...',
                h('br'), 'נפתרו: ' + solved
              ),
              feedback && h('div', { className: 'result-card puzzle-feedback is-' + feedback.kind },
                h('h2', null, feedback.text)
              ),
              hintTxt && h('p', { className: 'puzzle-hint' }, hintTxt),
              h('div', { className: 'bot-side-actions' },
                h('button', { onClick: giveHint, disabled: !current || hintLevel >= 3 || locked }, hintLevel === 0 ? 'רמז' : hintLevel < 3 ? 'רמז נוסף' : 'אין רמזים נוספים'),
                feedback && feedback.kind === 'miss' && h('button', { onClick: retry }, 'נסה שוב'),
                h('button', { className: 'primary', onClick: skip, disabled: !current }, 'הפאזל הבא')
              )
            )
          )
  );
}

type Tab = 'training' | 'rush' | 'streak';
const TAB_LABEL: Record<Tab, string> = { training: 'אימון אישי', rush: 'Puzzle Rush', streak: 'רצף' };

function safeStorage() { try { return window.localStorage; } catch { return null; } }

function Gate({ data, snap, children }: { data: PuzzleData | null; snap: any; children: () => any }) {
  if (!data) return h('div', { className: 'result-card' }, h('h2', null, 'כדי לקבל פאזלים מהמשחקים שלך צריך להתחבר.'), h('p', { className: 'muted' }, 'בינתיים אפשר לשחק ברצף פאזלים.'));
  if (snap.phase === 'loading') return h('div', { className: 'result-card', role: 'status' }, h('h2', null, 'טוען פאזלים...'));
  if (snap.phase === 'auth') return h('div', { className: 'result-card' }, h('h2', null, 'ההתחברות פגה. התחבר שוב כדי להמשיך.'));
  if (snap.phase === 'disabled') return h('div', { className: 'result-card' }, h('h2', null, 'פאזלים אישיים עוד לא נפתחו בחשבון שלך.'), h('p', { className: 'muted' }, 'בינתיים אפשר לשחק ברצף פאזלים.'));
  if (snap.phase === 'offline') return h('div', { className: 'result-card' }, h('h2', null, 'אין חיבור ואין נתונים שמורים במכשיר.'), h('div', { className: 'bot-side-actions' }, h('button', { className: 'primary', onClick: () => data.load() }, 'נסה שוב')));
  return children();
}

export function PuzzlesPage({ onBack, Brand, LangButton, authUser }: { onBack: () => void; Brand: any; LangButton: any; authUser?: { id?: string } | null }) {
  const userId = authUser && authUser.id ? String(authUser.id) : '';
  const [tab, setTab] = useState<Tab>(userId ? 'training' : 'streak');
  const [, force] = useState(0);
  const dataRef = useRef<{ id: string; data: PuzzleData } | null>(null);
  if (userId && (!dataRef.current || dataRef.current.id !== userId)) {
    dataRef.current = { id: userId, data: new PuzzleData({ userId, api: createPuzzleApi(), storage: safeStorage() }) };
  }
  if (!userId) dataRef.current = null;
  const data = dataRef.current ? dataRef.current.data : null;

  useEffect(() => {
    if (!data) return;
    const unsub = data.subscribe(() => force((n) => n + 1));
    data.load();
    const sendTimer = setInterval(() => { if (data.outbox.size()) data.flush(); }, 15000);
    const metaTimer = setInterval(() => { if (!document.hidden) data.refreshMeta(); }, 60000);
    const jobTimer = setInterval(() => { if (data.snap.state && data.snap.state.job) data.pollJob(); }, 5000);
    const onVis = () => { if (document.hidden && data.outbox.size()) data.flush({ keepalive: true }); };
    const onHide = () => { if (data.outbox.size()) data.flush({ keepalive: true }); };
    const onOnline = () => { data.flush(); data.refreshMeta(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('online', onOnline);
    return () => {
      unsub(); clearInterval(sendTimer); clearInterval(metaTimer); clearInterval(jobTimer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('online', onOnline);
      if (data.outbox.size()) data.flush({ keepalive: true });
    };
  }, [userId]);

  const snap = data ? data.snap : null;
  const tabs: Tab[] = ['training', 'rush', 'streak'];
  let body: any;
  if (tab === 'streak') body = h(StreakView, { userId });
  else if (tab === 'training') body = h(Gate, { data, snap: snap || {}, children: () => h(PersonalView, { data: data as PuzzleData, snap: snap as any }) });
  else body = h(Gate, { data, snap: snap || {}, children: () => h(RushView, { data: data as PuzzleData, snap: snap as any }) });

  return h('div', { className: 'app-shell' },
    h('header', { className: 'topbar' },
      h(Brand, { section: 'פאזלים' }),
      h('div', { className: 'top-actions' }, h(LangButton), h('button', { onClick: onBack }, 'חזרה לבית'))
    ),
    h('main', { className: 'main puzzle-page' },
      h('div', { className: 'puzzle-tabs', role: 'tablist', 'aria-label': 'מצבי פאזלים' },
        tabs.map((t) => h('button', { key: t, role: 'tab', id: 'ptab-' + t, 'aria-selected': tab === t ? 'true' : 'false', className: tab === t ? 'active' : '', onClick: () => setTab(t) }, TAB_LABEL[t]))),
      h('div', { role: 'tabpanel', 'aria-labelledby': 'ptab-' + tab }, body)
    )
  );
}
