// "אימון אישי": practice kit of 15 puzzles built from the user's own mistakes, plus the DNA panel.
import type { PuzzleDto } from './api.js';
import type { PuzzleData, Snapshot } from './data.js';
import { PuzzleBoard, judge, sanFor, sideName } from './board-view.js';

const h = React.createElement;
const useState = React.useState as <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
const useRef = React.useRef as <T>(v: T) => { current: T };
const useEffect = React.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

export const MOTIF_LABEL: Record<string, string> = {
  missed_mate: 'מט שהוחמץ', hanging_piece: 'כלי תלוי', endgame: 'סיום', general: 'כללי',
  king_safety: 'ביטחון המלך', opening: 'פתיחה', time_pressure: 'לחץ זמן',
};
const NEXT_DELAY_MS = 1000;

export function dnaMessage(code: string): string {
  switch (code) {
    case 'daily_cap': case 'daily_or_rate_limit': return 'הגעת למגבלת הניתוח היומית. אפשר להמשיך מחר.';
    case 'network': return 'אין חיבור כרגע. נסה שוב בעוד רגע.';
    case 'auth': return 'צריך להתחבר מחדש כדי להריץ DNA.';
    case 'job_failed': return 'הניתוח נעצר בגלל שגיאה. אפשר להפעיל אותו שוב.';
    case 'rate_limited': return 'ספק המשחקים הגביל זמנית את הבקשות. הניתוח ימשיך בהפעלה הבאה.';
    default: return 'לא הצלחנו להפעיל את הניתוח. נסה שוב.';
  }
}

export function reportSummary(report: any): string {
  if (!report) return '';
  const warns: string[] = Array.isArray(report.warnings) ? report.warnings : [];
  if (warns.includes('no_source') || (report.gamesScanned === 0 && warns.some((w) => w.endsWith(':not_found')))) {
    return 'לא מצאנו משחקים. הגדר שם משתמש של Chess.com או Lichess במסך הארכיון ונסה שוב.';
  }
  if (!report.gamesScanned) return 'אין משחקים חדשים לניתוח כרגע.';
  if (!report.puzzlesAdded) return 'נותחו ' + report.gamesScanned + ' משחקים ולא נמצאו טעויות שמתאימות לפאזל.';
  return 'נותחו ' + report.gamesScanned + ' משחקים ונוספו ' + report.puzzlesAdded + ' פאזלים מהטעויות שלך.';
}

function DnaPanel({ data, snap }: { data: PuzzleData; snap: Snapshot }) {
  const s = snap.state;
  if (!s) return null;
  const job = s.job;
  const seedsOnly = s.pool.total === 0;
  let body: any;
  if (job) {
    const total = job.gamesTotal || 0;
    body = h('div', null,
      h('b', null, 'מנתח את המשחקים שלך'),
      h('p', { className: 'muted', 'aria-live': 'polite' }, 'משחק ' + Math.min(job.gamesDone + 1, Math.max(total, 1)) + ' מתוך ' + total + ' • נוספו ' + job.puzzlesAdded + ' פאזלים'),
      h('div', { className: 'puzzle-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': job.gamesDone },
        h('span', { style: { width: (total ? Math.round((job.gamesDone / total) * 100) : 5) + '%' } })),
      h('p', { className: 'muted' }, 'אפשר להמשיך לתרגל. הניתוח נמשך ברקע וגם אם תסגור את האפליקציה.'));
  } else {
    body = h('div', null,
      h('b', null, seedsOnly ? 'עדיין אין לך פאזלים מהמשחקים שלך' : 'הבריכה שלך: ' + s.pool.total + ' פאזלים (' + s.pool.fresh + ' חדשים)'),
      h('p', { className: 'muted' }, seedsOnly
        ? 'כרגע מוצגים פאזלים לדוגמה. הרץ DNA כדי שנמצא את הטעויות האמיתיות שלך ונהפוך אותן לפאזלים.'
        : 'רוצה עוד? הרץ DNA נוסף והמשחקים הבאים שלך יהפכו לפאזלים.'),
      h('button', { className: 'primary', disabled: snap.dnaBusy || snap.authLost, onClick: () => data.startDna() }, snap.dnaBusy ? 'מפעיל...' : seedsOnly ? 'הרץ DNA על המשחקים שלי' : 'הרץ DNA נוסף'));
  }
  const summary = !job && snap.lastReport ? reportSummary(snap.lastReport) : '';
  return h('section', { className: 'panel puzzle-dna' }, body,
    summary && h('p', { className: 'puzzle-dna-result', role: 'status' }, summary),
    snap.message && h('p', { className: 'puzzle-error', role: 'alert' }, dnaMessage(snap.message)));
}

export function PersonalView({ data, snap }: { data: PuzzleData; snap: Snapshot }) {
  const kitObj = snap.state?.kits?.regular || null;
  const kit: PuzzleDto[] = kitObj ? kitObj.puzzles : [];
  const kitId = kitObj ? kitObj.id : '';
  const [idx, setIdx] = useState(0);
  const [solved, setSolved] = useState(0);
  const [fb, setFb] = useState<{ kind: 'ok' | 'miss'; text: string } | null>(null);
  const [locked, setLocked] = useState(false);
  const [hint, setHint] = useState(0);
  const [flushed, setFlushed] = useState(false);
  const answered = useRef(false);
  const startedAt = useRef(Date.now());
  const timer = useRef<any>(null);

  useEffect(() => { // a different kit means a new session
    clearTimeout(timer.current);
    setIdx(0); setSolved(0); setFb(null); setLocked(false); setHint(0); setFlushed(false);
    answered.current = false; startedAt.current = Date.now();
  }, [kitId]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finished = kit.length > 0 && idx >= kit.length;
  useEffect(() => { // end of kit: send everything and ask for the next kit
    if (!finished) return;
    let live = true;
    data.flush({ final: true }).then(() => { if (live) setFlushed(true); });
    return () => { live = false; };
  }, [finished]);

  const cur = kit[idx] || null;

  function next() {
    clearTimeout(timer.current);
    answered.current = false; startedAt.current = Date.now();
    setFb(null); setHint(0); setLocked(false); setIdx((i) => i + 1);
  }
  function onMove(uci: string): 'correct' | 'wrong' | 'illegal' {
    if (!cur || locked) return 'illegal';
    const j = judge(cur, uci);
    if (!j.verdict) return 'illegal';
    const first = !answered.current;
    if (first) {
      answered.current = true;
      data.recordAttempt('regular', cur, { solved: j.verdict === 'correct', ms: Date.now() - startedAt.current, move: uci, viaAlt: j.viaAlt });
    }
    if (j.verdict === 'correct') {
      if (first) setSolved((n) => n + 1);
      setLocked(true);
      setFb({ kind: 'ok', text: j.viaAlt ? 'מהלך שווה ערך. גם זה נכון!' : 'נכון!' });
      timer.current = setTimeout(next, NEXT_DELAY_MS);
      return 'correct';
    }
    setLocked(true);
    setFb({ kind: 'miss', text: 'לא מדויק. המהלך הנכון: ' + sanFor(cur.fen, cur.solution[0]) });
    return 'wrong';
  }
  function retry() { setFb(null); setLocked(false); setHint(0); /* the board snaps back by itself */ }
  function skip() { if (cur) next(); }
  async function removeCurrent() {
    if (!cur || cur.origin !== 'harvest') return;
    if (await data.remove(cur.id)) next();
  }

  const header = h(DnaPanel, { data, snap });
  const banners = [
    snap.offline && h('p', { key: 'o', className: 'puzzle-offline', role: 'status' }, 'אין חיבור. התוצאות נשמרות במכשיר ויישלחו כשהחיבור יחזור.' + (snap.pending ? ' ממתינות: ' + snap.pending : '')),
    snap.authLost && h('p', { key: 'a', className: 'puzzle-error', role: 'alert' }, 'ההתחברות פגה. התחבר שוב כדי לשמור את התוצאות. הן לא אבדו.'),
  ];

  if (!kit.length) return h('div', null, ...banners, header, h('div', { className: 'result-card' }, h('h2', null, 'אין פאזלים זמינים כרגע.')));

  if (finished) {
    return h('div', null, ...banners, header,
      h('div', { className: 'result-card puzzle-summary' },
        h('h2', null, 'סיימת את הסט: ' + solved + ' מתוך ' + kit.length),
        h('p', { className: 'muted', role: 'status' }, flushed ? (snap.pending ? 'חלק מהתוצאות יישלחו כשהחיבור יחזור.' : 'התוצאות נשמרו בחשבון שלך.') : 'שומר את התוצאות...'),
        h('div', { className: 'bot-side-actions' },
          h('button', { className: 'primary', disabled: !flushed, onClick: () => { setIdx(0); setSolved(0); setFlushed(false); answered.current = false; startedAt.current = Date.now(); } }, 'תרגול נוסף'))));
  }

  const src = cur && cur.source;
  const sourceLine = cur && cur.origin === 'harvest'
    ? 'מהמשחק שלך' + (src && src.opponent ? ' מול ' + src.opponent : '') + (src && src.date ? ' (' + src.date + ')' : '') + (src && src.moveNumber ? ' • מהלך ' + src.moveNumber : '') + (cur.played ? ' • שיחקת: ' + sanFor(cur.fen, cur.played) : '')
    : 'פאזל לדוגמה';
  const hintTxt = cur && hint > 0 ? (hint === 1 ? 'כלי במשבצת ' + cur.solution[0].slice(0, 2) : hint === 2 ? 'היעד: ' + cur.solution[0].slice(2, 4) : 'המהלך: ' + sanFor(cur.fen, cur.solution[0])) : '';

  return h('div', null, ...banners, header,
    h('div', { className: 'botgame-layout' },
      h(PuzzleBoard, { fen: cur ? cur.fen : '', locked: locked || !cur, animate: false, onMove, label: 'לוח הפאזל' }),
      h('aside', { className: 'coach-card bot-side-panel' },
        h('div', { className: 'clocks' },
          h('div', { className: 'clock-box active puzzle-stat' }, h('small', { className: 'muted' }, 'פאזל'), h('div', null, (idx + 1) + '/' + kit.length)),
          h('div', { className: 'clock-box puzzle-stat' }, h('small', { className: 'muted' }, 'נכונים'), h('div', null, String(solved)))),
        h('p', { className: 'muted puzzle-meta' }, cur ? 'תורך: ' + sideName(cur.fen) + ' • ' + (MOTIF_LABEL[cur.motif] || cur.motif) : '', h('br'), sourceLine),
        fb && h('div', { className: 'result-card puzzle-feedback is-' + fb.kind, role: 'status' }, h('h2', null, fb.text)),
        hintTxt && h('p', { className: 'puzzle-hint' }, hintTxt),
        h('div', { className: 'bot-side-actions' },
          h('button', { onClick: () => setHint((v) => Math.min(3, v + 1)), disabled: !cur || hint >= 3 || locked }, hint === 0 ? 'רמז' : hint < 3 ? 'רמז נוסף' : 'אין רמזים נוספים'),
          fb && fb.kind === 'miss' && h('button', { onClick: retry }, 'נסה שוב'),
          h('button', { className: 'primary', onClick: skip, disabled: !cur }, 'הפאזל הבא'),
          cur && cur.origin === 'harvest' && h('button', { className: 'puzzle-remove', onClick: removeCurrent }, 'הסר פאזל זה')))));
}
