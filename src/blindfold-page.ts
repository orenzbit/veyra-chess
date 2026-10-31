// Blindfold training reuses the canonical Veyra chess rules and bot chooser.
// Only the board's display FEN is masked; game state and PGN remain complete.
import { blindfoldDisplayFen } from './blindfold-visibility.js';
import { blindfoldReviewPgn, botAcceptsDraw, copyGameWithHistory, manualGameEnd, moveRows, naturalGameEnd, type GameEnd, type ManualEndKind } from './blindfold-game-end.js';
import { botMoveOnPage, cancelBotMove, isBotMoveCancelled, type BotMoveChooser } from './bot-worker-client.js';

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

const CONFIRM_TEXT: Record<ManualEndKind, string> = {
  resign: 'בטוח שאתה רוצה להיכנע? המשחק יסתיים בהפסד.',
  draw: 'להציע לבוט תיקו? הבוט יחליט לפי העמדה.',
  abort: 'בטוח שאתה רוצה לבטל את המשחק? הוא יסתיים בלי תוצאה.',
};

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

// A copy built from the FEN alone would forget every earlier move (the move table, repetition
// draws and the review PGN need the full history), so replay the moves on a fresh game.
function copyWithHistory(source: any) {
  return copyGameWithHistory(Chess, source);
}

function nextSquareInDirection(square: string, key: string, orientation: string) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  let col = orientation === 'white' ? file : 7 - file;
  let row = orientation === 'white' ? 8 - rank : rank - 1;
  if (key === 'ArrowLeft') col--;
  else if (key === 'ArrowRight') col++;
  else if (key === 'ArrowUp') row--;
  else if (key === 'ArrowDown') row++;
  col = Math.max(0, Math.min(7, col));
  row = Math.max(0, Math.min(7, row));
  const nextFile = orientation === 'white' ? col : 7 - col;
  const nextRank = orientation === 'white' ? 8 - row : row + 1;
  return 'abcdefgh'[nextFile] + String(nextRank);
}

export function BlindfoldTrainingPage({ bots, onBack, onReview, chooseBotMove, initialBotId }: {
  bots: any[];
  onBack: () => void;
  onReview: (pgn: string) => void;
  chooseBotMove: BotMoveChooser;
  initialBotId?: string | null;
}) {
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(1);
  const [playerSide, setPlayerSide] = useState<'white' | 'black'>('white');
  const [botTier, setBotTier] = useState(() => initialBotId === 'tal' ? 'advanced' : 'beginner');
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<string | null>(null);
  const [focusSquare, setFocusSquare] = useState('e2');
  const [lastMove, setLastMove] = useState<any>(null);
  const [thinking, setThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<any>(null);
  const [status, setStatus] = useState('בחר רמת הסתרה וצבע, ואז התחל לשחק.');
  const [result, setResult] = useState<string | null>(null);
  const [manualEnd, setManualEnd] = useState<GameEnd | null>(null);
  const [confirming, setConfirming] = useState<ManualEndKind | null>(null);
  const [drawDeclinedAt, setDrawDeclinedAt] = useState<number | null>(null);
  const movesRef = useRef<HTMLElement | null>(null);
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
  const inProgress = !result && !manualEnd;
  const canResign = inProgress && history.length > 0;
  const canOfferDraw = inProgress && !thinking && history.length > 0 && (drawDeclinedAt === null || history.length > drawDeclinedAt);

  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    const list = movesRef.current as any;
    if (list && typeof list.scrollHeight === 'number') list.scrollTop = list.scrollHeight;
  }, [history.length]);

  useEffect(() => {
    if (!boardRef.current) return;
    const board = new Chessboard(boardRef.current, {
      position: blindfoldDisplayFen(game.fen(), level),
      orientation: orientationColor,
      responsive: true,
      assetsUrl: '/vendor/cm-chessboard/',
      style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: 'pieces/standard.svg' }, animationDuration: 240 },
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
    let live = true;
    if (manualEnd) {
      // Resigned, agreed draw or aborted: the bot must not move any more.
      setThinking(false);
      return;
    }
    const ended = gameStatus(game);
    if (ended) {
      setResult(ended);
      setThinking(false);
      setStatus(ended);
      setConfirming(null);
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
      const fen = gameRef.current.fen();
      botTimer.current = setTimeout(() => {
        chooseBotMove(fen, bot, { deadlineAt: null, ChessCtor: Chess }).then((reply) => {
          if (!live || gameRef.current.fen() !== fen) return;
          try {
            const next = copyWithHistory(gameRef.current);
            const move = reply.move || botMoveOnPage(fen, bot, Chess);
            if (!move) {
              setStatus('לא נמצא מהלך חוקי לבוט.');
              return;
            }
            const applied = next.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
            if (!applied) throw new Error('Bot chooser returned an illegal move');
            const verbose = next.history({ verbose: true });
            setGame(next);
            setLastMove(verbose[verbose.length - 1] || null);
            setSelected(null);
            setStatus('הבוט ביצע מהלך.');
          } catch {
            setStatus('מהלך הבוט נכשל. אפשר להתחיל משחק חדש.');
          } finally {
            setThinking(false);
          }
        }, (error) => {
          if (!live || isBotMoveCancelled(error)) return;
          setStatus('מהלך הבוט נכשל. אפשר להתחיל משחק חדש.');
          setThinking(false);
        });
      }, 500);
    } else {
      setThinking(false);
    }
    return () => { live = false; clearTimeout(botTimer.current); cancelBotMove(); };
  }, [game, playerSide, botTier, bots, manualEnd]);

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
      const next = copyWithHistory(current);
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

  function cellKeyDown(event: any, square: string) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextSquare = nextSquareInDirection(square, event.key, playerSide);
      setFocusSquare(nextSquare);
      (inputRef.current?.querySelector(`[data-square="${nextSquare}"]`) as HTMLElement | null)?.focus();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setSelected(null);
      setPendingPromotion(null);
      setStatus('הבחירה בוטלה.');
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (result || thinking || pendingPromotion || gameRef.current.turn() !== playerColor) return;
    const current = gameRef.current;
    if (selected && selected !== square) {
      attemptMove(selected, square);
    } else if (current.get(square)?.color === playerColor) {
      setSelected(square);
      setStatus('נבחר כלי. נווט למשבצת יעד ולחץ Enter.');
    } else if (selected) {
      attemptMove(selected, square);
    }
  }

  function pointerDown(event: any) {
    if (result || thinking || pendingPromotion || gameRef.current.turn() !== playerColor || !inputRef.current) return;
    const square = squareAtPoint(event, playerSide, inputRef.current);
    if (!square) return;
    setFocusSquare(square);
    const current = gameRef.current;
    if (current.get(square)?.color === playerColor) {
      // Starting a fresh drag on one of our pieces always takes priority over
      // an older click-selection. Empty/enemy target squares use the selection.
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

  function finishByPlayer(end: GameEnd) {
    clearTimeout(botTimer.current);
    cancelBotMove();
    setManualEnd(end);
    setResult(end.text);
    setThinking(false);
    setSelected(null);
    setPendingPromotion(null);
    setStatus(end.text);
  }

  function confirmAction(kind: ManualEndKind) {
    setConfirming(null);
    // The game may have ended on the board while the question was open; never overwrite that result.
    if (result || manualEnd || gameStatus(gameRef.current)) return;
    if (kind === 'draw') {
      if (!botAcceptsDraw(gameRef.current.fen(), botColor)) {
        setDrawDeclinedAt(gameRef.current.history().length);
        setStatus('הבוט דחה את הצעת התיקו. אפשר להציע שוב אחרי המהלך הבא.');
        return;
      }
      finishByPlayer(manualGameEnd('draw', playerColor));
      setStatus('הבוט קיבל את הצעת התיקו.');
      return;
    }
    finishByPlayer(manualGameEnd(kind, playerColor));
  }

  function reviewPgn() {
    const end = manualEnd || naturalGameEnd(game);
    return blindfoldReviewPgn(Chess, game.history(), { playerColor, botName: String(bot?.name || bot?.id || bot?.slug || 'Bot'), end });
  }

  function restart() {
    clearTimeout(botTimer.current);
    setManualEnd(null);
    setConfirming(null);
    setDrawDeclinedAt(null);
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
        role: 'gridcell',
        tabIndex: focusSquare === square ? 0 : -1,
        className: 'blindfold-cell' + (selected === square ? ' selected' : '') + (legalDestinations.includes(square) ? ' legal' : '') + (lastMove && (lastMove.from === square || lastMove.to === square) ? ' last-move' : ''),
        'data-square': square,
        'aria-label': square,
        onFocus: () => setFocusSquare(square),
        onKeyDown: (event: any) => cellKeyDown(event, square),
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
        h('div', { className: 'blindfold-actions' }, h('button', { className: 'primary', onClick: restart }, 'משחק חדש'), h('button', { onClick: () => onReview(reviewPgn()) }, 'סקירה רגילה'))
      ),
      h('section', { className: 'blindfold-game-layout' },
        h('div', { className: 'board-wrap blindfold-board-wrap' },
          h('div', { ref: boardRef, className: 'board blindfold-board' }),
          h('div', { ref: inputRef, className: 'blindfold-board-input', role: 'grid', 'aria-label': 'לוח שחמט עיוור', onPointerDown: pointerDown, onPointerUp: pointerUp, onPointerCancel: () => { dragFrom.current = null; } }, cells)
        ),
        h('aside', { className: 'panel blindfold-moves-panel' },
          h('h2', null, 'המשחק'),
          h('p', { className: 'muted' }, 'לחיצה על משבצת או גרירה אל משבצת יעד. הנקודות מציינות יעדים חוקיים.'),
          inProgress && h('div', { className: 'blindfold-game-actions' },
            h('button', { onClick: () => setConfirming('draw'), disabled: !canOfferDraw }, 'הצע תיקו'),
            h('button', { onClick: () => setConfirming('abort'), disabled: !inProgress }, 'בטל משחק'),
            h('button', { className: 'danger', onClick: () => setConfirming('resign'), disabled: !canResign }, 'כניעה')
          ),
          inProgress && confirming && h('div', { className: 'blindfold-confirm', role: 'alertdialog', 'aria-live': 'assertive' },
            h('strong', null, CONFIRM_TEXT[confirming]),
            h('div', { className: 'blindfold-confirm-buttons' },
              h('button', { className: confirming === 'resign' ? 'danger' : 'primary', onClick: () => confirmAction(confirming) }, 'כן'),
              h('button', { onClick: () => setConfirming(null) }, 'לא')
            )
          ),
          result && (manualEnd?.kind !== 'abort'
            ? h('div', { className: 'blindfold-result' }, h('strong', null, result), h('button', { className: 'primary', onClick: () => onReview(reviewPgn()) }, 'פתח סקירה רגילה'))
            : h('div', { className: 'blindfold-result' }, h('strong', null, result), h('button', { className: 'primary', onClick: restart }, 'משחק חדש'))),
          pendingPromotion && h('div', { className: 'blindfold-promotion' }, h('strong', null, 'קידום רגלי'), ['q', 'r', 'b', 'n'].map((piece) => h('button', { key: piece, onClick: () => attemptMove(pendingPromotion.from, pendingPromotion.to, piece) }, ({ q: 'מלכה', r: 'צריח', b: 'רץ', n: 'פרש' } as any)[piece])))
        )
      ),
      h('section', { className: 'panel blindfold-moves-table-panel' },
        h('h2', null, 'רשימת מהלכים'),
        history.length
          ? h('div', { ref: movesRef, className: 'blindfold-moves-scroll' },
            h('table', { className: 'blindfold-moves-table' },
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, '#'), h('th', { scope: 'col' }, 'לבן'), h('th', { scope: 'col' }, 'שחור'))),
              h('tbody', null, moveRows(history.map((move: any) => move.san)).map((row, index, rows) => {
                const lastRow = index === rows.length - 1;
                const lastIsBlack = history.length % 2 === 0;
                return h('tr', { key: row.number },
                  h('td', { className: 'move-number' }, h('bdi', { dir: 'ltr' }, row.number + '.')),
                  h('td', { className: 'san' + (lastRow && !lastIsBlack ? ' is-last' : '') }, h('bdi', { dir: 'ltr' }, row.white)),
                  h('td', { className: 'san' + (lastRow && lastIsBlack ? ' is-last' : '') }, row.black ? h('bdi', { dir: 'ltr' }, row.black) : ''));
              }))
            ))
          : h('p', { className: 'muted' }, 'המשחק עדיין לא התחיל.')
      )
    )
  );
}
