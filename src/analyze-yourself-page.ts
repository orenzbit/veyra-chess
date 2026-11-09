// "Analyze it yourself": classify every move of a game Chess DNA already analyzed and stored, guess both
// players' ratings, then compare with the stored review. No engine evaluation or eval bar is shown, and the
// answer key stays on the server until the guesses are sent. English only.
import { normalizePgnForDnaFingerprint } from './chess-dna.js';
import { moveClassBadge, moveClassLabel } from './move-class-style.js';

const Chess = (window as any).ChessLib.Chess;
const Chessboard = (window as any).ChessBoardLib.Chessboard;
const COLOR = (window as any).ChessBoardLib.COLOR;
const BORDER_TYPE = (window as any).ChessBoardLib.BORDER_TYPE;
const h = React.createElement;
const useState = React.useState as <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
const useRef = React.useRef as <T>(v: T) => { current: T };
const useEffect = React.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

// Same categories and order as the server's ladder (netlify/functions/lib/analyze-yourself-score.mjs).
export const GRADED_CHOICES = ['brilliant', 'great', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder'];

interface ArchiveGame { id: string; pgn: string; date?: string; opponent?: string; playerColor?: string; timeClass?: string }
interface Listed { fingerprint: string; date: string | null; timeClass: string | null; playerColor: string | null; plies: number; game: ArchiveGame }
interface StartMove { index: number; given: string | null; graded: boolean }

async function fingerprintOf(pgn: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizePgnForDnaFingerprint(pgn)));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function api(method: 'GET' | 'POST', query: string, body?: unknown) {
  const response = await fetch('/api/analyze-yourself' + query, {
    method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined
  });
  let data: any = null;
  try { data = await response.json(); } catch {}
  return { status: response.status, data };
}

const ERRORS: Record<string, string> = {
  DISABLED: 'Analyze it yourself is not switched on for this site yet.',
  UNAUTHENTICATED: 'Sign in to use Analyze it yourself.',
  not_analyzed: 'This game has no stored analysis. Analyze it with Chess DNA first.',
  analysis_mismatch: 'The stored analysis does not match this game. Run Chess DNA on it again.',
  nothing_to_grade: 'Every move of this game is a book or forced move, so there is nothing to classify.'
};
const errorText = (status: number, data: any) => ERRORS[data?.error] || (status === 429 ? 'Too many requests. Wait a minute and try again.' : 'Something went wrong. Please try again.');

export function AnalyzeYourselfPage({ archiveGames, authUser, onBack }: { archiveGames: ArchiveGame[]; authUser?: { id?: string } | null; onBack: () => void }) {
  const [listed, setListed] = useState<Listed[] | null>(null);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState<Listed | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [moves, setMoves] = useState<StartMove[]>([]);
  const [guesses, setGuesses] = useState<(string | null)[]>([]);
  const [ply, setPly] = useState(0);
  const [elo, setElo] = useState({ white: '', black: '' });
  const [score, setScore] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const boardRef = useRef<HTMLElement | null>(null);
  const boardObj = useRef<any>(null);
  const fens = useRef<string[]>([]);

  // Which of the loaded archive games already have a stored analysis.
  useEffect(() => {
    let cancelled = false;
    setListed(null); setMessage('');
    if (!authUser?.id) { setMessage(ERRORS.UNAUTHENTICATED); setListed([]); return; }
    const games = (archiveGames || []).filter(game => game?.pgn).slice(0, 75);
    if (!games.length) { setMessage('Load your games in the archive first, then analyze them with Chess DNA.'); setListed([]); return; }
    (async () => {
      const byPrint = new Map<string, ArchiveGame>();
      for (const game of games) byPrint.set(await fingerprintOf(game.pgn), game);
      const r = await api('GET', '?action=list&fingerprints=' + encodeURIComponent([...byPrint.keys()].join(',')));
      if (cancelled) return;
      if (r.status !== 200) { setMessage(errorText(r.status, r.data)); setListed([]); return; }
      const rows: Listed[] = (r.data.games || []).map((row: any) => ({ ...row, game: byPrint.get(row.fingerprint)! })).filter((row: Listed) => row.game);
      setListed(rows);
      if (!rows.length) setMessage('None of the loaded games has a stored analysis yet. Analyze them with Chess DNA first.');
    })().catch(() => { if (!cancelled) { setMessage('Something went wrong. Please try again.'); setListed([]); } });
    return () => { cancelled = true; };
  }, [authUser?.id, archiveGames]);

  useEffect(() => {
    if (!active || !boardRef.current || boardObj.current) return;
    boardObj.current = new Chessboard(boardRef.current, {
      position: fens.current[0], orientation: active.playerColor === 'black' ? COLOR.black : COLOR.white, responsive: true,
      assetsUrl: '/vendor/cm-chessboard/', style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: 'pieces/standard.svg' }, animationDuration: 200 }
    });
    return () => { try { boardObj.current?.destroy(); } catch {} boardObj.current = null; };
  }, [active, score === null]);
  // The board shows the position right after the move being classified.
  useEffect(() => { boardObj.current?.setPosition(fens.current[ply + 1] || fens.current[0], true); }, [ply, active]);

  async function start(row: Listed) {
    setBusy(true); setMessage('');
    const r = await api('POST', '', { action: 'start', fingerprint: row.fingerprint, pgn: row.game.pgn }).catch(() => ({ status: 0, data: null }));
    setBusy(false);
    if (r.status !== 200) { setMessage(errorText(r.status, r.data)); return; }
    const game = new Chess(); game.loadPgn(row.game.pgn);
    const verbose = game.history({ verbose: true });
    if (verbose.length !== r.data.moves.length) { setMessage(ERRORS.analysis_mismatch); return; }
    const replay = new Chess(); fens.current = [replay.fen()];
    for (const move of verbose) { replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined }); fens.current.push(replay.fen()); }
    const firstGraded = r.data.moves.findIndex((m: StartMove) => m.graded);
    setHistory(verbose); setMoves(r.data.moves); setGuesses(r.data.moves.map(() => null)); setPly(Math.max(0, firstGraded));
    setElo({ white: '', black: '' }); setScore(null); setActive(row);
  }

  function choose(cls: string) {
    const next = guesses.slice(); next[ply] = cls; setGuesses(next);
    const following = moves.findIndex((m, i) => i > ply && m.graded && !next[i]);
    if (following >= 0) setPly(following);
  }

  const open = moves.filter((m, i) => m.graded && !guesses[i]).length;
  const eloValue = (v: string) => /^\d{3,4}$/.test(v) && Number(v) >= 100 && Number(v) <= 3500;
  const ready = active && !open && eloValue(elo.white) && eloValue(elo.black);

  async function submit() {
    if (!active || !ready) return;
    setBusy(true); setMessage('');
    const r = await api('POST', '', { action: 'score', fingerprint: active.fingerprint, pgn: active.game.pgn, guesses, eloGuess: { white: Number(elo.white), black: Number(elo.black) } }).catch(() => ({ status: 0, data: null }));
    setBusy(false);
    if (r.status !== 200) { setMessage(errorText(r.status, r.data)); return; }
    setScore(r.data.score);
  }

  const moveName = (i: number) => (Math.floor(i / 2) + 1) + (i % 2 ? '... ' : '. ') + (history[i]?.san || '');
  const header = h('header', { className: 'topbar' },
    h('div', { className: 'brand product-brand' }, h('span', { className: 'product-brand-name' }, 'VEYRA CHESS'), h('span', { className: 'product-brand-divider', 'aria-hidden': true }, '·'), h('span', { className: 'product-brand-section' }, 'Analyze it yourself')),
    h('div', { className: 'top-actions' }, active && h('button', { onClick: () => { setActive(null); setScore(null); } }, 'Games'), h('button', { onClick: onBack }, 'Back to archive')));

  let body: any;
  if (!active) {
    body = h('section', { className: 'panel ay-list' },
      h('h2', null, 'Pick an analyzed game'),
      h('p', { className: 'muted' }, 'Classify every move yourself, with no engine evaluation, then guess both players\' ratings. Your answers are compared with the stored review.'),
      listed === null ? h('p', { className: 'muted' }, 'Looking for your analyzed games…') : null,
      message && h('p', { className: 'ay-message', role: 'status' }, message),
      (listed || []).map(row => h('button', { key: row.fingerprint, className: 'ay-game', disabled: busy, onClick: () => start(row), 'data-fingerprint': row.fingerprint },
        h('strong', null, (row.date || row.game.date || 'Unknown date') + ' · ' + (row.timeClass || row.game.timeClass || '')),
        h('span', null, 'You played ' + (row.playerColor || row.game.playerColor || '?') + ' vs ' + (row.game.opponent || 'opponent') + ' · ' + row.plies + ' moves'))));
  } else if (score) {
    body = h('section', { className: 'panel ay-result' },
      h('h2', null, 'Your score'),
      h('div', { className: 'ay-score-grid' },
        h('div', { className: 'ay-score', 'data-metric': 'accuracy' }, h('strong', null, score.accuracyPct + '%'), h('span', null, 'Classifications right (' + score.correct + ' of ' + score.gradedMoves + ')')),
        h('div', { className: 'ay-score', 'data-metric': 'distance' }, h('strong', null, String(score.meanDistance)), h('span', null, 'Average distance per move (0 = exact, 8 = brilliant vs blunder)')),
        h('div', { className: 'ay-score', 'data-metric': 'closeness' }, h('strong', null, score.closenessPct + '%'), h('span', null, 'Closeness')),
        h('div', { className: 'ay-score', 'data-metric': 'elo' }, h('strong', null, score.elo.meanError === null ? 'n/a' : '±' + score.elo.meanError), h('span', null, 'Rating guess error'))),
      h('p', { className: 'muted' }, ['white', 'black'].map(side => side[0].toUpperCase() + side.slice(1) + ': you guessed ' + score.elo[side].guess + ', rating ' + (score.elo[side].actual ?? 'not in the game file') + (score.elo[side].error === null ? '' : ' (off by ' + score.elo[side].error + ')')).join(' · ')),
      h('table', { className: 'ay-table' },
        h('thead', null, h('tr', null, h('th', null, 'Move'), h('th', null, 'Your call'), h('th', null, 'Review'), h('th', null, 'Distance'))),
        h('tbody', null, score.perMove.map((m: any) => h('tr', { key: m.index, className: m.graded ? (m.correct ? 'ay-hit' : 'ay-miss') : 'ay-given' },
          h('td', null, moveName(m.index)),
          h('td', null, m.graded ? h('span', { className: 'ay-chip' }, moveClassBadge(m.guess, { lang: 'en', size: 18 }), moveClassLabel(m.guess, 'en')) : '—'),
          h('td', null, h('span', { className: 'ay-chip' }, moveClassBadge(m.actual, { lang: 'en', size: 18 }), moveClassLabel(m.actual, 'en'))),
          h('td', null, m.graded ? String(m.distance) : 'given'))))));
  } else {
    const current = moves[ply];
    body = h('section', { className: 'ay-quiz' },
      h('div', { className: 'ay-board-wrap' }, h('div', { className: 'ay-board', ref: boardRef })),
      h('div', { className: 'panel ay-side' },
        h('div', { className: 'ay-nav' },
          h('button', { onClick: () => setPly(Math.max(0, ply - 1)), disabled: ply === 0 }, '‹ Prev'),
          h('strong', { 'data-ply': ply }, moveName(ply)),
          h('button', { onClick: () => setPly(Math.min(moves.length - 1, ply + 1)), disabled: ply >= moves.length - 1 }, 'Next ›')),
        current?.graded
          ? h('div', { className: 'ay-choices', role: 'group', 'aria-label': 'Classify this move' }, GRADED_CHOICES.map(cls => h('button', {
              key: cls, className: 'ay-choice' + (guesses[ply] === cls ? ' selected' : ''), 'aria-pressed': guesses[ply] === cls, 'data-class': cls, onClick: () => choose(cls)
            }, moveClassBadge(cls, { lang: 'en', size: 20, decorative: true }), moveClassLabel(cls, 'en'))))
          : h('p', { className: 'muted' }, 'This move is ' + moveClassLabel(current?.given, 'en').toLowerCase() + ', so it is not graded.'),
        h('ol', { className: 'ay-moves' }, moves.map((m, i) => h('li', { key: i },
          h('button', { className: (i === ply ? 'current ' : '') + (m.graded ? (guesses[i] ? 'done' : 'open') : 'given'), onClick: () => setPly(i) },
            moveName(i), m.graded ? (guesses[i] ? moveClassBadge(guesses[i], { lang: 'en', size: 14 }) : null) : moveClassBadge(m.given, { lang: 'en', size: 14 }))))),
        h('div', { className: 'ay-elo' },
          h('label', null, 'White rating guess', h('input', { inputMode: 'numeric', placeholder: 'e.g. 1200', value: elo.white, onChange: (e: any) => setElo({ ...elo, white: e.target.value.trim() }) })),
          h('label', null, 'Black rating guess', h('input', { inputMode: 'numeric', placeholder: 'e.g. 1200', value: elo.black, onChange: (e: any) => setElo({ ...elo, black: e.target.value.trim() }) }))),
        h('p', { className: 'muted', 'aria-live': 'polite' }, open ? open + ' moves left to classify.' : ready ? 'Ready to score.' : 'Enter both ratings (100–3500).'),
        message && h('p', { className: 'ay-message', role: 'status' }, message),
        h('button', { className: 'primary', disabled: !ready || busy, onClick: submit }, busy ? 'Scoring…' : 'Score my analysis')));
  }
  return h('div', { className: 'app-shell analyze-yourself-page', dir: 'ltr', lang: 'en' }, header, h('main', { className: 'content ay-content' }, body));
}
