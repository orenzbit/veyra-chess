// The Learn page: the two courses as a vertical path, lesson screens, practice boards and the daily-goal celebration.
// Pure course logic is in learning-path.ts and the streak rule in learn-progress.ts.
import { getLang } from './i18n.js';
import { buildCourses, nodeStates, nextPlannedNode, endgameResult, type CourseId, type PathNode, type PlanStep } from './learning-path.js';
import { learnStreak, localDateKey, recordNodeDone, DAILY_GOAL, type LearnProgress } from './learn-progress.js';
import { enableQuizBoardInput, openingBoardExtensions } from './opening-board-input.js';
import { chooseBotMoveAsync } from './bot-worker-client.js';
import { botNow } from './bot-time.js';
import { endgameBotId, DEFAULT_ENDGAME_LEVEL } from './endgames.js';

const h = React.createElement;
const { useEffect, useRef, useState } = React as any;
const Chess = () => (window as any).ChessLib.Chess;
const Lib = () => (window as any).ChessBoardLib;
const BOT_THINK_MS = 1200;

function squarePoint(square: string, white: boolean) {
  const f = square.charCodeAt(0) - 97; const r = Number(square[1]);
  return white ? { x: f + 0.5, y: 8 - r + 0.5 } : { x: 7 - f + 0.5, y: r - 0.5 };
}

/** The app's board (cm-chessboard, as on the openings and endgames pages) with an arrow overlay and optional move input. */
function LearnBoard({ fen, white, arrows, onReady }: { fen: string; white: boolean; arrows: Array<[string, string]>; onReady?: (board: any) => void }) {
  const ref = useRef(null); const board = useRef(null);
  useEffect(() => {
    const { Chessboard, COLOR, BORDER_TYPE } = Lib();
    board.current = new Chessboard(ref.current, { position: fen, orientation: white ? COLOR.white : COLOR.black, responsive: true, assetsUrl: '/vendor/cm-chessboard/',
      style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: 'pieces/standard.svg' }, animationDuration: 200 }, extensions: openingBoardExtensions() });
    onReady && onReady(board.current);
    return () => { try { board.current.destroy(); } catch {} board.current = null; };
  }, [white]);
  useEffect(() => { board.current && board.current.setPosition(fen, true); }, [fen]);
  return h('div', { className: 'learn-board' }, h('div', { ref }),
    arrows.length > 0 && h('svg', { className: 'learn-arrows', viewBox: '0 0 8 8', 'aria-hidden': 'true' },
      h('defs', null, h('marker', { id: 'learn-arrow-head', markerWidth: 3, markerHeight: 3, refX: 1.5, refY: 1.5, orient: 'auto' }, h('path', { d: 'M0,0 L3,1.5 L0,3 z', fill: 'var(--status-success, #2e9d5b)' }))),
      arrows.map(([from, to]) => { const a = squarePoint(from, white), b = squarePoint(to, white);
        return h('line', { key: from + to, x1: a.x, y1: a.y, x2: b.x - (b.x - a.x) * 0.12, y2: b.y - (b.y - a.y) * 0.12, stroke: 'var(--status-success, #2e9d5b)', strokeWidth: 0.18, strokeLinecap: 'round', opacity: 0.85, markerEnd: 'url(#learn-arrow-head)' }); })));
}

function Counters({ hints, mistakes, correct, t }: any) {
  const item = (label: string, value: number, cls: string) => h('div', { className: 'learn-counter ' + cls }, h('b', null, value), h('span', null, label));
  return h('div', { className: 'learn-counters', 'aria-live': 'polite' }, item(t('רמזים', 'Hints'), hints, 'hints'), item(t('טעויות', 'Mistakes'), mistakes, 'mistakes'), item(t('נכון', 'Correct'), correct, 'correct'));
}

function ResultCard({ title, hints, mistakes, correct, t, onDone }: any) {
  return h('div', { className: 'learn-result', 'data-learn-result': 'done', role: 'status' },
    h('b', null, title),
    h('p', null, t(`${correct} מהלכים נכונים · ${mistakes} טעויות · ${hints} רמזים`, `${correct} correct moves · ${mistakes} mistakes · ${hints} hints`)),
    h('button', { className: 'primary', onClick: onDone }, t('המשך', 'Continue')));
}

function LessonView({ node, t, en, onDone }: any) {
  const [i, setI] = useState(0);
  const screen = node.screens[i]; const last = i === node.screens.length - 1;
  return h('section', { className: 'learn-step', 'data-learn-lesson': node.id },
    h('small', { className: 'muted' }, t('שיעור', 'Lesson') + ` · ${i + 1}/${node.screens.length}`),
    h(LearnBoard, { fen: screen.fen, white: node.white, arrows: screen.arrows }),
    h('p', { className: 'learn-sentence' }, en ? screen.text.en : screen.text.he),
    h('div', { className: 'learn-actions' },
      i > 0 && h('button', { onClick: () => setI(i - 1) }, t('הקודם', 'Back')),
      h('button', { className: 'primary', onClick: () => last ? onDone() : setI(i + 1) }, last ? t('סיום השיעור', 'Finish lesson') : t('הבא', 'Next'))));
}

function OpeningPracticeView({ node, t, onDone }: any) {
  const white = node.side === 'w';
  const [ply, setPly] = useState(0); const [count, setCount] = useState({ hints: 0, mistakes: 0, correct: 0 });
  const [msg, setMsg] = useState(''); const [arrow, setArrow] = useState(null);
  const state = useRef({ ply: 0 }); state.current.ply = ply;
  const fenAt = (n: number) => { const c = new (Chess())(); for (let k = 0; k < n; k++) c.move(node.sans[k]); return c.fen(); };
  const mine = (n: number) => (n % 2 === 0) === white;
  const finished = ply >= node.sans.length;
  // a move played while the opponent's reply is still pending counts after that reply, so a fast player never falls out of step
  const current = () => { const n = state.current.ply; return n < node.sans.length && !mine(n) ? n + 1 : n; };
  useEffect(() => { if (finished) return;
    if (!mine(ply)) { const timer = setTimeout(() => setPly(ply + 1), 450); return () => clearTimeout(timer); } }, [ply]);
  const ready = (board: any) => enableQuizBoardInput(board, white ? Lib().COLOR.white : Lib().COLOR.black, Chess(), {
    getState: () => { const n = current(); return { active: n < node.sans.length && mine(n), fen: fenAt(n), expected: node.sans[n] || '' }; },
    onVerdict: (ok: boolean) => { if (ok) { setArrow(null); setMsg(''); setCount((c: any) => ({ ...c, correct: c.correct + 1 })); setPly(current() + 1); }
      else { setPly(current()); setCount((c: any) => ({ ...c, mistakes: c.mistakes + 1 })); setMsg(t('לא המהלך הזה. נסה שוב.', 'Not that move. Try again.')); } },
    resetBoard: () => board.setPosition(fenAt(current()), true),
  });
  const hint = () => { if (finished || !mine(ply)) return; const mv = new (Chess())(fenAt(ply)).move(node.sans[ply]); setArrow([mv.from, mv.to]); setCount((c: any) => ({ ...c, hints: c.hints + 1 })); };
  return h('section', { className: 'learn-step', 'data-learn-practice': node.id },
    h('small', { className: 'muted' }, t('תרגול', 'Practice') + ' · ' + (white ? t('אתה משחק לבן', 'You play White') : t('אתה משחק שחור', 'You play Black'))),
    h(Counters, { ...count, t }),
    finished && h(ResultCard, { ...count, title: t('כל הכבוד, הקו הושלם.', 'Well done, line complete.'), t, onDone }),
    h(LearnBoard, { fen: fenAt(Math.min(ply, node.sans.length)), white, arrows: arrow ? [arrow] : [], onReady: ready }),
    h('p', { className: 'learn-sentence', role: 'status' }, msg || (finished ? '' : mine(ply) ? t('תורך: שחק את המהלך של הקו.', 'Your move: play the line’s move.') : t('היריב משחק…', 'Opponent is moving…'))),
    h('div', { className: 'learn-actions' }, h('button', { onClick: hint, disabled: finished || !mine(ply) }, t('רמז', 'Hint'))));
}

function EndgamePracticeView({ node, bots, t, onDone }: any) {
  const eg = node.endgame; const white = eg.side === 'white';
  const [fen, setFen] = useState(eg.fen); const [count, setCount] = useState({ hints: 0, mistakes: 0, correct: 0 });
  const [msg, setMsg] = useState(''); const [arrow, setArrow] = useState(null); const [busy, setBusy] = useState(false); const [won, setWon] = useState(false);
  // over: input closed (goal reached, or a failed try waiting to reset); gen: bumps on reset/unmount so late bot replies are dropped
  const live = useRef({ fen: eg.fen, moves: 0, busy: false, over: false, gen: 0, dead: false }); const boardRef = useRef(null);
  useEffect(() => () => { live.current.dead = true; live.current.gen += 1; }, []);
  const later = (fn: () => void, ms: number) => setTimeout(() => { if (!live.current.dead) fn(); }, ms);
  const bot = (bots || []).find((b: any) => b.slug === endgameBotId(DEFAULT_ENDGAME_LEVEL) || b.id === endgameBotId(DEFAULT_ENDGAME_LEVEL)) || (bots || [])[0] || { elo: 2000 };
  const show = (next: string) => { live.current.fen = next; setFen(next); };
  const setWorking = (v: boolean) => { live.current.busy = v; setBusy(v); };
  const settle = (result: string | null) => {
    if (result === 'success') { live.current.over = true; setWon(true); return true; }
    if (result === 'fail') { setCount((c: any) => ({ ...c, mistakes: c.mistakes + 1 })); setMsg(t('זה לא מחזיק. נסה שוב מההתחלה.', 'That lets it slip. Try again from the start.'));
      live.current.over = true; live.current.gen += 1;
      later(() => { live.current.moves = 0; live.current.over = false; show(eg.fen); boardRef.current && boardRef.current.setPosition(eg.fen, true); }, 900); return true; }
    return false;
  };
  const ask = async (position: string) => (await chooseBotMoveAsync(position, bot, { ChessCtor: Chess(), deadlineAt: botNow() + BOT_THINK_MS })).move;
  async function reply(position: string) {
    setWorking(true); const gen = live.current.gen;
    try {
      const mv = await ask(position); if (!mv || live.current.dead || gen !== live.current.gen || live.current.fen !== position) return;
      const g = new (Chess())(position); g.move(mv); show(g.fen()); boardRef.current && boardRef.current.setPosition(g.fen(), true);
      settle(endgameResult(Chess(), eg, g.fen(), live.current.moves));
    } catch { if (!live.current.dead) setMsg(t('הבוט לא ענה. נסה שוב.', 'The bot did not answer. Try again.')); } finally { if (!live.current.dead) setWorking(false); }
  }
  const ready = (board: any) => { boardRef.current = board; board.enableMoveInput((ev: any) => {
    if (ev.type === 'moveInputStarted') return !live.current.busy && !live.current.over;
    if (ev.type !== 'validateMoveInput') return true;
    const g = new (Chess())(live.current.fen); let mv = null;
    const legal = g.moves({ verbose: true }).find((m: any) => m.from === ev.squareFrom && m.to === ev.squareTo);
    if (!legal) return false; // an illegal drop is not an answer: nothing is counted
    try { mv = g.move({ from: ev.squareFrom, to: ev.squareTo, promotion: legal.promotion ? 'q' : undefined }); } catch { return false; } // shortcut: always queens, add the promotion dialog if an underpromotion endgame is added
    if (!mv) return false;
    live.current.moves += 1; setArrow(null); setMsg(''); setCount((c: any) => ({ ...c, correct: c.correct + 1 })); show(g.fen());
    later(() => board.setPosition(g.fen(), false), 0);
    if (!settle(endgameResult(Chess(), eg, g.fen(), live.current.moves))) void reply(g.fen());
    return true;
  }, white ? Lib().COLOR.white : Lib().COLOR.black); };
  async function hint() {
    if (live.current.busy || live.current.over) return;
    setWorking(true); const gen = live.current.gen; const at = live.current.fen;
    try { const mv = await ask(at); if (mv && !live.current.dead && gen === live.current.gen && at === live.current.fen) { setArrow([mv.from, mv.to]); setCount((c: any) => ({ ...c, hints: c.hints + 1 })); } } catch {} finally { if (!live.current.dead) setWorking(false); }
  }
  return h('section', { className: 'learn-step', 'data-learn-practice': node.id },
    h('small', { className: 'muted' }, t('תרגול', 'Practice') + ' · ' + (white ? t('אתה משחק לבן', 'You play White') : t('אתה משחק שחור', 'You play Black'))),
    h(Counters, { ...count, t }),
    won && h(ResultCard, { ...count, title: t('המטרה הושגה!', 'Goal reached!'), t, onDone }),
    h(LearnBoard, { fen, white, arrows: arrow ? [arrow] : [], onReady: ready }),
    h('p', { className: 'learn-sentence', role: 'status' }, msg || (busy ? t('הבוט חושב…', 'The bot is thinking…') : t(eg.hint.he, eg.hint.en))),
    h('div', { className: 'learn-actions' }, h('button', { onClick: hint, disabled: busy }, t('רמז', 'Hint'))));
}

export function LearnPage({ bots, progress, onProgress, plan, onBack, Brand, LangButton }: {
  bots: any[]; progress: LearnProgress; onProgress: (next: LearnProgress) => void; plan?: PlanStep[]; onBack: () => void;
  Brand: typeof React.Component; LangButton: typeof React.Component;
}) {
  const [lang, setLang] = useState(getLang());
  const [repertoire, setRepertoire] = useState(null); const [loadError, setLoadError] = useState(false);
  const [course, setCourse] = useState('openings' as CourseId); const [openId, setOpenId] = useState(null as string | null);
  const [celebrate, setCelebrate] = useState(null as null | { streak: number; restDays: number });
  const en = lang === 'en'; const t = (he: string, enText: string) => en ? enText : he;
  useEffect(() => { const on = () => setLang(getLang()); window.addEventListener('tabia-language-change', on); return () => window.removeEventListener('tabia-language-change', on); }, []);
  useEffect(() => { fetch('/data/repertoire.json').then(r => r.json()).then(setRepertoire, () => setLoadError(true)); }, []);
  const today = localDateKey();
  const streak = learnStreak(progress.days, today);
  const courses = repertoire ? buildCourses(Chess(), repertoire, plan || []) : null;
  const nodes: PathNode[] = courses ? courses[course] : [];
  const states = nodeStates(nodes, progress.done);
  const all = courses ? [...courses.openings, ...courses.endgames] : [];
  const node = all.find(n => n.id === openId) || null;
  const latest = useRef(progress); latest.current = progress; // practice boards keep their first onDone; read progress fresh
  const finish = (n: PathNode) => {
    const current = latest.current;
    const before = learnStreak(current.days, today).todayDone;
    const next = recordNodeDone(current, n.id, today);
    if (next !== current) { latest.current = next; onProgress(next); }
    setOpenId(null);
    if (!before) { const s = learnStreak(next.days, today); setCelebrate({ streak: s.streak, restDays: s.restDays }); }
  };
  const header = h('header', { className: 'topbar' }, h(Brand, { section: 'Learn' }), h('div', { className: 'top-actions' }, h(LangButton), h('button', { onClick: node ? () => setOpenId(null) : onBack }, node ? t('חזרה למסלול', 'Back to path') : t('חזרה', 'Back'))));
  let body: any;
  if (celebrate) {
    body = h('section', { className: 'learn-celebrate', 'data-learn-celebration': true },
      h('div', { className: 'learn-burst', 'aria-hidden': 'true' }, Array.from({ length: 12 }, (_, i) => h('i', { key: i, style: { '--i': i } }))),
      h('div', { className: 'learn-badge' }, '♞'),
      h('h1', null, t('היעד היומי הושלם!', 'Daily goal done!')),
      h('p', { className: 'learn-streak-big' }, h('b', null, celebrate.streak), ' ', t('ימים ברצף', 'day streak')),
      h('p', { className: 'muted' }, t(`ימי מנוחה שמורים: ${celebrate.restDays}. כל 7 ימים ברצף מרוויחים יום מנוחה שמגן על יום שפספסת.`, `Rest days saved: ${celebrate.restDays}. Every 7 days in a row earns a rest day that covers a day you miss.`)),
      h('button', { className: 'primary', onClick: () => setCelebrate(null) }, t('המשך', 'Continue')));
  } else if (node) {
    const done = () => finish(node);
    body = node.kind === 'lesson' ? h(LessonView, { key: node.id, node, t, en, onDone: done })
      : node.course === 'openings' ? h(OpeningPracticeView, { key: node.id, node, t, onDone: done })
      : h(EndgamePracticeView, { key: node.id, node, bots, t, onDone: done });
  } else {
    // each course unlocks on its own; the course of the plan's first step is offered first
    const order: CourseId[] = plan && plan[0]?.kind === 'endgame' ? ['endgames', 'openings'] : ['openings', 'endgames'];
    const nextUp = courses && plan && plan.length ? order.map(c => nextPlannedNode(courses[c], progress.done)).find(Boolean) || null : null;
    body = h('section', { className: 'learn-home' },
      h('div', { className: 'learn-streak', 'data-learn-streak': streak.streak },
        h('b', null, streak.streak), h('span', null, t('ימים ברצף', 'day streak')),
        h('small', null, (streak.todayDone ? t('היעד של היום הושלם ✓', 'Today’s goal done ✓') : t(`יעד יומי: ${DAILY_GOAL} שלב`, `Daily goal: ${DAILY_GOAL} step`)) + ' · ' + t(`ימי מנוחה: ${streak.restDays}`, `Rest days: ${streak.restDays}`))),
      nextUp && h('div', { className: 'learn-next', 'data-learn-next': nextUp.id }, h('small', null, t('מה לעשות עכשיו', 'What to do next')),
        h('b', null, nextUp.title), h('button', { className: 'primary', onClick: () => { setCourse(nextUp.course); setOpenId(nextUp.id); } }, nextUp.kind === 'lesson' ? t('התחל שיעור', 'Start lesson') : t('התחל תרגול', 'Start practice'))),
      h('div', { className: 'learn-tabs', role: 'tablist' }, (['openings', 'endgames'] as CourseId[]).map(c => h('button', { key: c, role: 'tab', 'aria-selected': c === course, className: c === course ? 'active' : '', onClick: () => setCourse(c) }, c === 'openings' ? t('פתיחות', 'Openings') : t('סיומים', 'Endgames')))),
      loadError ? h('p', { className: 'muted' }, t('לא הצלחתי לטעון את הקורס.', 'Could not load the course.'))
        : !courses ? h('p', { className: 'muted' }, t('טוען…', 'Loading…'))
        : h('ol', { className: 'learn-path', 'data-learn-course': course }, nodes.map((n, i) => {
          const s = states[i];
          return h('li', { key: n.id, className: `learn-node ${n.kind} ${s}`, style: { '--offset': [0, 1, 0, -1][i % 4] } },
            h('button', { disabled: s === 'locked', 'data-learn-node': n.id, 'data-state': s, onClick: () => setOpenId(n.id), 'aria-label': `${n.title} (${n.kind}, ${s})` },
              s === 'done' ? '✓' : s === 'locked' ? '🔒' : n.kind === 'lesson' ? '♗' : '♞'),
            h('span', { className: 'learn-node-label' }, h('b', null, n.kind === 'lesson' ? t('שיעור', 'Lesson') : t('תרגול', 'Practice')), h('small', null, n.title)));
        })));
  }
  return h('div', { className: 'app-shell learn-page', dir: en ? 'ltr' : 'rtl' }, header, h('main', { className: 'content' }, body));
}
