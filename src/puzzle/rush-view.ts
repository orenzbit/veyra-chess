// Puzzle Rush screen: 3:00 on the clock, 3 strikes. All rules live in rush.ts; this file only draws and wires.
import type { PuzzleDto } from './api.js';
import type { PuzzleData, Snapshot } from './data.js';
import { PuzzleBoard, judge, sanFor } from './board-view.js';
import * as R from './rush.js';
import { MOTIF_LABEL } from './personal-view.js';

const h = React.createElement;
const useState = React.useState as <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
const useRef = React.useRef as <T>(v: T) => { current: T };
const useEffect = React.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

const TICK_MS = 100;
const fmt = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export function finishText(reason: R.FinishReason | null): string {
  if (reason === 'strikes') return 'שלוש טעויות. הריצה הסתיימה.';
  if (reason === 'time') return 'הזמן נגמר!';
  if (reason === 'no_puzzles') return 'נגמרו הפאזלים בסט.';
  return '';
}

export function RushView({ data, snap }: { data: PuzzleData; snap: Snapshot }) {
  const kit: PuzzleDto[] = snap.state?.kits?.rush?.puzzles || [];
  const [rs, setRsState] = useState<R.RushState>(() => R.createRush(kit));
  const rsRef = useRef(rs);
  const [bestBefore, setBestBefore] = useState(snap.state?.rushBest || 0);
  const [saved, setSaved] = useState(false);
  const reported = useRef(false);
  const setRs = (next: R.RushState) => { rsRef.current = next; setRsState(next); };

  function begin(puzzles: PuzzleDto[]) {
    reported.current = false; setSaved(false);
    setBestBefore(snap.state?.rushBest || 0);
    setRs(R.start(R.createRush(puzzles), Date.now()));
  }

  // clock
  useEffect(() => {
    const id = setInterval(() => {
      const cur = rsRef.current;
      if (cur.phase === 'countdown' || cur.phase === 'playing' || cur.phase === 'feedback') setRs(R.tick(cur, Date.now()));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);
  // hidden tab pauses the clock
  useEffect(() => {
    const onVis = () => setRs(document.hidden ? R.hide(rsRef.current, Date.now()) : R.show(rsRef.current, Date.now()));
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  // kit ran out
  useEffect(() => {
    if (!rs.needMore) return;
    let live = true;
    data.moreRushPuzzles(rs.kit.map((p) => p.id)).then((more) => { if (live) setRs(R.appendKit(rsRef.current, more, Date.now())); });
    return () => { live = false; };
  }, [rs.needMore]);
  // run finished: queue the result and send it
  useEffect(() => {
    if (rs.phase !== 'finished' || reported.current) return;
    reported.current = true;
    const r = R.result(rs);
    if (rs.answers.length || r.score) {
      data.recordRun({ id: data.uuid(), score: r.score, strikes: r.strikes, durationMs: r.durationMs, puzzleIds: r.puzzleIds, startedAt: new Date(r.startedAt || Date.now()).toISOString(), endedAt: new Date(r.endedAt || Date.now()).toISOString() });
    }
    data.flush({ final: true }).then(() => setSaved(true));
  }, [rs.phase]);

  const cur = R.currentPuzzle(rs);
  const acting = rs.phase === 'playing' && Date.now() >= rs.lockUntil && !rs.needMore;

  function onMove(uci: string): 'correct' | 'wrong' | 'illegal' {
    const s = rsRef.current;
    const p = R.currentPuzzle(s);
    if (!p || s.phase !== 'playing') return 'illegal';
    const j = judge(p, uci);
    if (!j.verdict) return 'illegal';
    const now = Date.now();
    const next = R.answer(s, now, uci, j.verdict === 'correct');
    if (next.answers.length > s.answers.length) {
      const a = next.answers[next.answers.length - 1];
      data.recordAttempt('rush', p, { solved: a.solved, ms: a.ms, move: uci, viaAlt: j.viaAlt });
    }
    setRs(next);
    return j.verdict;
  }

  const hud = h('div', { className: 'rush-hud' },
    h('div', { className: 'clock-box active puzzle-stat' }, h('small', { className: 'muted' }, 'זמן'), h('div', { role: 'timer', 'aria-live': 'off' }, fmt(rs.remainingMs))),
    h('div', { className: 'clock-box puzzle-stat' }, h('small', { className: 'muted' }, 'ניקוד'), h('div', null, String(rs.score))),
    h('div', { className: 'clock-box puzzle-stat' }, h('small', { className: 'muted' }, 'טעויות'),
      h('div', { 'aria-label': rs.strikes + ' מתוך 3 טעויות' }, [0, 1, 2].map((i) => h('span', { key: i, className: i < rs.strikes ? 'rush-strike on' : 'rush-strike' }, '✕')))));

  if (rs.phase === 'idle') {
    return h('div', { className: 'result-card rush-start' },
      h('h2', null, 'Puzzle Rush'),
      h('p', { className: 'muted' }, 'שלוש דקות. כמה שיותר פאזלים נכונים. שלוש טעויות והריצה נגמרת. הפאזלים לקוחים מהטעויות שלך.'),
      h('p', null, 'השיא שלך: ', h('b', null, String(snap.state?.rushBest || 0))),
      snap.offline && h('p', { className: 'puzzle-offline', role: 'status' }, 'אין חיבור. אפשר לשחק והתוצאה תישלח אחר כך.'),
      h('div', { className: 'bot-side-actions' }, h('button', { className: 'primary', disabled: !kit.length, onClick: () => begin(kit) }, kit.length ? 'התחל' : 'אין פאזלים זמינים')));
  }

  if (rs.phase === 'finished') {
    const r = R.result(rs);
    const record = r.score > bestBefore;
    const motifs = Object.keys(r.byMotif);
    return h('div', { className: 'result-card rush-end' },
      h('h2', null, finishText(rs.finishReason)),
      h('p', { className: 'rush-score' }, r.score + ' פתרונות', record && h('span', { className: 'rush-record' }, ' • שיא חדש!')),
      h('p', { className: 'muted' }, 'דיוק ' + r.accuracy + '% • שיא קודם ' + bestBefore),
      motifs.length > 0 && h('ul', { className: 'rush-motifs' }, motifs.map((m) => h('li', { key: m }, (MOTIF_LABEL[m] || m) + ': ' + r.byMotif[m].solved + '/' + r.byMotif[m].seen))),
      h('p', { className: 'muted', role: 'status' }, saved ? (snap.pending ? 'התוצאה תישלח כשהחיבור יחזור.' : 'התוצאה נשמרה בחשבון שלך.') : 'שומר את התוצאה...'),
      h('div', { className: 'bot-side-actions' }, h('button', { className: 'primary', disabled: !saved, onClick: () => begin(snap.state?.kits?.rush?.puzzles || kit) }, 'שחק שוב')));
  }

  const overlay = rs.phase === 'countdown' ? h('div', { className: 'rush-countdown', role: 'status', 'aria-live': 'assertive' }, String(Math.max(1, R.countdownSeconds(rs, Date.now())))) : null;
  const feedback = rs.phase === 'feedback' && cur
    ? h('div', { className: 'result-card puzzle-feedback is-miss', role: 'status' }, h('h2', null, 'לא נכון. המהלך: ' + sanFor(cur.fen, cur.solution[0])))
    : rs.phase === 'paused' ? h('div', { className: 'result-card', role: 'status' }, h('h2', null, 'מושהה. הזמן לא נספר.')) : null;

  return h('div', { className: 'botgame-layout rush-layout' },
    h('div', { className: 'rush-board-wrap' }, overlay, h(PuzzleBoard, { fen: cur ? cur.fen : (rs.kit[0] ? rs.kit[0].fen : ''), locked: !acting, animate: false, onMove, label: 'לוח Puzzle Rush' })),
    h('aside', { className: 'coach-card bot-side-panel' }, hud, feedback));
}
