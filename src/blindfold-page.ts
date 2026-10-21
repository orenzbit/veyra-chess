// Blindfold training reuses the canonical Veyra chess rules and bot chooser.
// Only the board's display FEN is masked; game state and PGN remain complete.
import { blindfoldDisplayFen } from './blindfold-visibility.js';

const Chess = (window as any).ChessLib.Chess;
const Chessboard = (window as any).ChessBoardLib.Chessboard;
const COLOR = (window as any).ChessBoardLib.COLOR;
const BORDER_TYPE = (window as any).ChessBoardLib.BORDER_TYPE;
const h = React.createElement;
const useState = React.useState as <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
const useRef = React.useRef as <T>(v: T) => { current: T };
const useEffect = React.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

const LEVELS = [
  { value: 1, label: 'רמה 1 — מסתירים צריחים', detail: 'הצריחים מוסתרים; שאר הכלים והרגלים גלויים.' },
  { value: 2, label: 'רמה 2 — צריחים ופרשים', detail: 'הצריחים והפרשים מוסתרים.' },
  { value: 3, label: 'רמה 3 — כל כלי השורה האחורית', detail: 'מלך, מלכה, רצים, פרשים וצריחים מוסתרים; רגלים גלויים.' },
  { value: 4, label: 'רמה 4 — שחמט עיוור מלא', detail: 'כל הכלים והרגלים מוסתרים.' },
] as const;

const BOT_TIERS = [
  { key: 'beginner', title: 'מתחיל', targetElo: 100, preferredId: 'bobby' },
  { key: 'advanced', title: 'מתקדם', targetElo: 1000, preferredId: 'tal' },
  { key: 'master', title: 'מאסטר', targetElo: 1700, preferredId: 'alex' },
  { key: 'grandmaster', title: 'רב־אמן', targetElo: 2200, preferredId: 'entity' },
] as const;

function existingBotForTier(bots: any[], tier: typeof BOT_TIERS[number]) {
  const available = Array.isArray(bots) ? bots.filter((b) => b && Number.isFinite(Number(b.elo))) : [];
  if (!available.length) return null;
  return available.find((b) => String(b.id || b.slug || '') === tier.preferredId)
    || available.reduce((best, bot) => Math.abs(Number(bot.elo) - tier.targetElo) < Math.abs(Number(best.elo) - tier.targetElo) ? bot : best, available[0]);
}

function squareAtPoint(event: any, orientation: string, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const col = Math.max(0, Math.min(7, Math.floor((event.clientX - rect.left) / rect.width * 8)));
  const row = Math.max(0, Math.min(7, Math.floor((event.clientY - rect.top) / rect.height * 8)));
  const file = orientation === 'white' ? col : 7 - col;
  const rank = orientation === 'white' ? 8 - row : row + 1;
  return 'abcdefgh'[file] + String(rank);
}

function gameStatus(game: any) {
  if (game.isCheckmate()) return game.turn() === 'w' ? 'שחור ניצח במט' : 'לבן ניצח במט';
  if (game.isStalemate()) return 'תיקו — פט';
  if (game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return 'תיקו';
  return null;
}

export function BlindfoldTrainingPage({ bots, onBack, onReview, chooseBotMove }: {
  bots: any[];
  onBack: () => void;
  onReview: (pgn: string) => void;
  chooseBotMove: (game: any, bot: any) => any;
}) {
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(1);
  const [playerSide, setPlayerSide] = useState<'white' | 'black'>('white');
  const [botTier, setBotTier] = useState('beginner');
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<any>(null);
  const [thinking, setThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<any>(null);
  const [status, setStatus] = useState('בחר רמת הסתרה וצבע, ואז התחל לשחק.');
  const [result, setResult] = useState<string | null>(null);
  const boardRef = useRef<HTMLElement | null>(null);
  const boardObj = useRef<any>(null);
  const inputRef = useRef<HTMLElement | null>(null);
  const dragFrom = useRef<string | null>(null);
  const gameRef = useRef(game);
  const botTimer = useRef<any>(null);
  const playerColor = playerSide === 'white' ? 'w' : 'b';
  const botColor = playerColor === 'w' ? 'b' : 'w';
  const chosenTier = BOT_TIERS.find((tier) => tier.key === botTier) || BOT_TIERS[0];
  const bot = existingBotForTier(bots, chosenTier);
  const legalDestinations = selected
    ? game.moves({ verbose: true }).filter((move: any) => move.from === selected).map((move: any) => move.to)
    : [];
  const history = game.history({ verbose: true });
  const orientationColor = playerSide === 'white' ? COLOR.white : COLOR.black;

  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    if (!boardRef.current) return;
    const board = new Chessboard(boardRef.current, {
      position: blindfoldDisplayFen(game.fen(), level),
      orientation: orientationColor,
      responsive: true,
      assetsUrl: '/vendor/cm-chessboard/',
      style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: '/assets/pieces/chess-art-prmi.svg' }, animationDuration: 240 },
    });
    boardObj.current = board;
    return () => {
      try { board.destroy(); } catch {}
      if (boardObj.current === board) boardObj.current = null;
    };
  }, []);

  useEffect(() => {
    if (!boardObj.current) return;
    boardObj.current.setPosition(blindfoldDisplayFen(game.fen(), level), true);
    boardObj.current.setOrientation(orientationColor, true);
  }, [game, level, playerSide]);

  useEffect(() => {
    clearTimeout(botTimer.current);
    const ended = gameStatus(game);
    if (ended) {
      setResult(ended);
      setThinking(false);
      setStatus(ended);
      return;
    }
    setResult(null);
    if (game.turn() === botColor) {
      setThinking(true);
      if (!bot) {
        setThinking(false);
        setStatus('לא נטענו בוטים זמינים. נסה לרענן את הדף.');
        return;
      }
      botTimer.current = setTimeout(() => {
        try {
          const next = new Chess(gameRef.current.fen());
          const move = chooseBotMove(next, bot);
          if (move) next.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
          const verbose = next.history({ verbose: true });
          setGame(next);
          setLastMove(verbose[verbose.length - 1] || null);
          setSelected(null);
          setStatus(move ? 'הבוט ביצע מהלך.' : 'לא נמצא מהלך חוקי לבוט.');
        } catch {
          setStatus('מהלך הבוט נכשל. אפשר להתחיל משחק חדש.');
        } finally {
          setThinking(false);
        }
      }, 500);
    } else {
      setThinking(false);
    }
    return () => clearTimeout(botTimer.current);
  }, [game, playerSide, botTier, bots]);

  useEffect(() => () => clearTimeout(botTimer.current), []);

  function attemptMove(from: string, to: string, promotion?: string) {
    const current = gameRef.current;
    if (result || thinking || current.turn() !== playerColor || from === to) return false;
    const piece = current.get(from);
    if (!piece || piece.color !== playerColor) return false;
    if (piece.type === 'p' && (to[1] === '8' || to[1] === '1') && !promotion) {
      setPendingPromotion({ from, to });
      setStatus('בחר לאיזה כלי לקדם את הרגלי.');
      return true;
    }
    try {
      const next = new Chess(current.fen());
      const move = next.move({ from, to, promotion: promotion || undefined });
      if (!move) {
        const targetPiece = current.get(to);
        if (targetPiece?.color === playerColor) setSelected(to);
        else setStatus('המהלך אינו חוקי.');
        return false;
      }
      const verbose = next.history({ verbose: true });
      setGame(next);
      setLastMove(verbose[verbose.length - 1] || null);
      setSelected(null);
      setPendingPromotion(null);
      setStatus('המהלך נקלט.');
      return true;
    } catch {
      setStatus('המהלך אינו חוקי.');
      return false;
    }
  }

  function pointerDown(event: any) {
    if (result || thinking || pendingPromotion || gameRef.current.turn() !== playerColor || !inputRef.current) return;
    const square = squareAtPoint(event, playerSide, inputRef.current);
    if (!square) return;
    const current = gameRef.current;
    if (selected && selected !== square) {
      dragFrom.current = selected;
    } else if (current.get(square)?.color === playerColor) {
      dragFrom.current = square;
      setSelected(square);
      setStatus('בחר משבצת יעד או גרור אליה.');
    } else {
      dragFrom.current = selected;
    }
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  }

  function pointerUp(event: any) {
    const target = inputRef.current ? squareAtPoint(event, playerSide, inputRef.current) : null;
    const from = dragFrom.current;
    dragFrom.current = null;
    if (!target) return;
    if (from && from !== target) {
      const moved = attemptMove(from, target);
      if (!moved && gameRef.current.get(target)?.color === playerColor) setSelected(target);
    } else if (gameRef.current.get(target)?.color === playerColor && gameRef.current.turn() === playerColor) {
      setSelected(target);
    }
  }

  function restart() {
    clearTimeout(botTimer.current);
    const next = new Chess();
    setGame(next);
    gameRef.current = next;
    setSelected(null);
    setLastMove(null);
    setPendingPromotion(null);
    setThinking(false);
    setResult(null);
    setStatus('משחק חדש התחיל.');
  }

  const cells: any[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = playerSide === 'white' ? col : 7 - col;
      const rank = playerSide === 'white' ? 8 - row : row + 1;
      const square = 'abcdefgh'[file] + String(rank);
      cells.push(h('div', {
        key: square,
        className: 'blindfold-cell' + (selected === square ? ' selected' : '') + (legalDestinations.includes(square) ? ' legal' : '') + (lastMove && (lastMove.from === square || lastMove.to === square) ? ' last-move' : ''),
        'data-square': square,
        'aria-label': square,
      }));
    }
  }

  return h('div', { className: 'app-shell blindfold-page' },
    h('header', { className: 'topbar' },
      h('div', { className: 'product-brand' }, h('span', { className: 'product-brand-name' }, 'OREN AND CLAUDE'), h('span', { className: 'product-brand-divider', 'aria-hidden': true }, '·'), h('span', { className: 'product-brand-section' }, 'שחמט עיוור')),
      h('div', { className: 'top-actions' }, h('button', { onClick: onBack }, 'חזרה'))
    ),
    h('main', { className: 'content blindfold-content' },
      h('section', { className: 'hero-row blindfold-hero' },
        h('div', null, h('span', { className: 'eyebrow' }, 'BLINDFOLD TRAINING'), h('h1', null, 'שחמט עיוור'), h('p', { className: 'muted' }, 'לוח האימון מסתיר כלים בתצוגה בלבד. חוקי המשחק, המהלכים וה־PGN נשארים מלאים.')),
        h('div', { className: 'blindfold-status-pill', 'aria-live': 'polite' }, thinking ? 'הבוט חושב…' : result || status)
      ),
      h('section', { className: 'panel blindfold-controls' },
        h('label', null, 'רמת הסתרה', h('select', { value: level, onChange: (event: any) => { setLevel(Number(event.target.value) as 1 | 2 | 3 | 4); setStatus('רמת ההסתרה עודכנה.'); } }, LEVELS.map((item) => h('option', { key: item.value, value: item.value }, item.label)))),
        h('label', null, 'רמת הבוט', h('select', { value: botTier, onChange: (event: any) => setBotTier(event.target.value) }, BOT_TIERS.map((item) => h('option', { key: item.key, value: item.key }, item.title)))),
        h('label', null, 'הצד שלך', h('select', { value: playerSide, onChange: (event: any) => { setPlayerSide(event.target.value); setSelected(null); setStatus('הצד שלך עודכן.'); } }, h('option', { value: 'white' }, 'לבן'), h('option', { value: 'black' }, 'שחור'))),
        h('div', { className: 'blindfold-control-note' }, LEVELS[level - 1].detail),
        h('div', { className: 'blindfold-bot-label' }, bot ? `יריב קיים: ${bot.name || bot.id || bot.slug} · ${bot.elo} Elo` : 'טוען בוטים…'),
        h('div', { className: 'blindfold-actions' }, h('button', { className: 'primary', onClick: restart }, 'משחק חדש'), h('button', { onClick: () => onReview(game.pgn()) }, 'סקירה רגילה'))
      ),
      h('section', { className: 'blindfold-game-layout' },
        h('div', { className: 'board-wrap blindfold-board-wrap' },
          h('div', { ref: boardRef, className: 'board blindfold-board' }),
          h('div', { ref: inputRef, className: 'blindfold-board-input', onPointerDown: pointerDown, onPointerUp: pointerUp, onPointerCancel: () => { dragFrom.current = null; } }, cells)
        ),
        h('aside', { className: 'panel blindfold-moves-panel' },
          h('h2', null, 'רשימת מהלכים'),
          h('p', { className: 'muted' }, 'לחיצה על משבצת או גרירה אל משבצת יעד. הנקודות מציינות יעדים חוקיים.'),
          h('div', { className: 'blindfold-move-list' }, history.length ? history.map((move: any, index: number) => h('span', { key: index, className: 'blindfold-move' }, index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ${move.san}` : move.san)) : h('span', { className: 'muted' }, 'המשחק עדיין לא התחיל.')),
          result && h('div', { className: 'blindfold-result' }, h('strong', null, result), h('button', { className: 'primary', onClick: () => onReview(game.pgn()) }, 'פתח סקירה רגילה')),
          pendingPromotion && h('div', { className: 'blindfold-promotion' }, h('strong', null, 'קידום רגלי'), ['q', 'r', 'b', 'n'].map((piece) => h('button', { key: piece, onClick: () => attemptMove(pendingPromotion.from, pendingPromotion.to, piece) }, ({ q: 'מלכה', r: 'צריח', b: 'רץ', n: 'פרש' } as any)[piece])))
        )
      )
    )
  );
}
