// The Legends area reuses Veyra's existing rules, board renderer and bot chooser.
import { botMoveOnPage, cancelBotMove, isBotMoveCancelled, type BotMoveChooser } from './bot-worker-client.js';
import { playMoveSound, GlobalAudioButton } from './sound-effects.js';
const Chess = (window as any).ChessLib.Chess;
const Chessboard = (window as any).ChessBoardLib.Chessboard;
const COLOR = (window as any).ChessBoardLib.COLOR;
const BORDER_TYPE = (window as any).ChessBoardLib.BORDER_TYPE;
const h = React.createElement;
const { useEffect, useRef, useState } = React;

function statusOf(game: any): string | null {
  if (game.isCheckmate()) return game.turn() === 'w' ? 'שחור ניצח במט' : 'לבן ניצח במט';
  if (game.isStalemate()) return 'תיקו בפט';
  if (game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return 'תיקו';
  return null;
}
function positionsFromMoves(moves: any[]) {
  const replay = new Chess();
  const positions = [replay.fen()];
  for (const move of moves) {
    replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    positions.push(replay.fen());
  }
  return positions;
}
function noteForMove(move: any) {
  if (!move) return 'בחר מהלך כדי לראות הסבר.';
  if (move.san?.includes('#')) return 'מט: בדוק אילו משבצות בריחה ואמצעי הגנה נותרו למלך.';
  if (move.san?.includes('+')) return 'שח: בדוק אם התשובה היא להזיז את המלך, לחסום או להכות את הכלי המאיים.';
  if (move.flags?.includes('k') || move.flags?.includes('q')) return 'הצרחה: המלך עובר לבטיחות יחסית והצריח נכנס למשחק.';
  if (move.promotion) return 'קידום רגלי: השווה את בחירת הכלי לאיומים המיידיים על שני המלכים.';
  if (move.captured) return 'הכאה: בדוק מה השתנה בחומר, בקווים הפתוחים ובאיומים על הכלים.';
  return 'מהלך שקט: בדוק את האיום הבא, את הכלים שאינם מוגנים ואת תוכנית היריב.';
}

export function LegendsPage({ bots, onBack, onReview, onBlindfold, chooseBotMove }: {
  bots: any[];
  onBack: () => void;
  onReview: (pgn: string) => void;
  onBlindfold: () => void;
  chooseBotMove: BotMoveChooser;
}) {
  const safeBots = Array.isArray(bots) ? bots.filter((bot) => bot && bot.id && bot.slug) : [];
  const tal = safeBots.find((bot) => bot.id === 'tal' || bot.slug === 'tal');
  const defaultWhite = tal || safeBots[0] || null;
  const defaultBlack = safeBots.find((bot) => bot.id === 'alex') || safeBots.find((bot) => bot.id !== defaultWhite?.id) || defaultWhite;
  const [whiteId, setWhiteId] = useState(defaultWhite?.id || '');
  const [blackId, setBlackId] = useState(defaultBlack?.id || '');
  const [game, setGame] = useState(() => new Chess());
  const [moves, setMoves] = useState([] as any[]);
  const [positions, setPositions] = useState([new Chess().fen()] as string[]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(null as string | null);
  const [commentary, setCommentary] = useState('בחר בוטים והתחל משחק כדי לשמוע הערות בסגנון המשחק.');
  const [speed, setSpeed] = useState(650);
  const [reviewPly, setReviewPly] = useState(null as number | null);
  const boardRef = useRef(null as HTMLElement | null);
  const boardObj = useRef(null as any);
  const gameRef = useRef(game);
  const pendingRef = useRef(null as null | { fen: string });
  const whiteBot = safeBots.find((bot) => bot.id === whiteId) || defaultWhite;
  const blackBot = safeBots.find((bot) => bot.id === blackId) || defaultBlack;
  const visiblePly = reviewPly == null ? moves.length : Math.max(0, Math.min(positions.length - 1, reviewPly));
  const visibleMove = visiblePly > 0 ? moves[visiblePly - 1] : null;
  const resultText = finished || statusOf(game) || (running ? 'המשחק מתנהל' : 'מוכן להתחלה');

  useEffect(() => {
    if (!boardRef.current) return;
    const board = new Chessboard(boardRef.current, {
      position: game.fen(), orientation: COLOR.white, responsive: true,
      assetsUrl: '/vendor/cm-chessboard/',
      style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: '/assets/pieces/chess-art-prmi.svg' }, animationDuration: 220 },
    });
    boardObj.current = board;
    return () => { try { board.destroy(); } catch {} if (boardObj.current === board) boardObj.current = null; };
  }, []);
  useEffect(() => {
    if (boardObj.current) boardObj.current.setPosition(reviewPly == null ? game.fen() : (positions[visiblePly] || game.fen()), true);
  }, [game, positions, reviewPly, visiblePly]);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => () => stopPendingBotMove(), []);

  function stopPendingBotMove() {
    if (!pendingRef.current) return;
    pendingRef.current = null;
    cancelBotMove();
  }

  function applyNextMove(current: any) {
    if (!whiteBot || !blackBot || finished) return;
    if (current.history().length >= 300) {
      setRunning(false); setFinished('המשחק נעצר בתקרת 300 חצאי־מסעים כדי למנוע לולאה אינסופית.');
      setReviewPly(current.history().length); return;
    }
    if (pendingRef.current) return;
    const next = new Chess(current.fen());
    const mover = next.turn() === 'w' ? whiteBot : blackBot;
    const request = { fen: current.fen() };
    pendingRef.current = request;
    chooseBotMove(request.fen, mover, { deadlineAt: null, ChessCtor: Chess })
      .then((reply) => reply.move || botMoveOnPage(request.fen, mover, Chess), (error) => isBotMoveCancelled(error) ? undefined : null)
      .then((candidate: any) => {
        if (pendingRef.current !== request) return;
        pendingRef.current = null;
        if (candidate === undefined || gameRef.current.fen() !== request.fen) return;
        applyBotMove(next, mover, candidate);
      });
  }
  function applyBotMove(next: any, mover: any, candidate: any) {
    if (!candidate) { setRunning(false); setFinished('הבוט לא החזיר מהלך. אתחל את המשחק ונסה שוב.'); return; }
    let applied: any = null;
    try { applied = next.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion || undefined }); } catch {}
    if (!applied) { setRunning(false); setFinished('הבוט החזיר מהלך לא חוקי. המשחק נעצר כדי לשמור על מצב לוח תקין.'); return; }
    playMoveSound(applied, next);
    const nextMoves = next.history({ verbose: true });
    const nextPositions = positionsFromMoves(nextMoves);
    const archive = mover?.phraseArchive || {};
    const category = String(applied.san || '').includes('+') || String(applied.san || '').includes('#') ? 'threat' : applied.captured ? 'tactics' : nextMoves.length < 16 ? 'opening' : nextMoves.length > 60 ? 'endgame' : 'general';
    const phrases = Array.isArray(archive[category]) && archive[category].length ? archive[category] : (Array.isArray(mover?.quips) ? mover.quips : []);
    const selectedPhrase = phrases.length ? phrases[nextMoves.length % phrases.length] : null;
    setCommentary(typeof selectedPhrase === 'string' ? selectedPhrase : (selectedPhrase?.text || mover?.flavor || 'המשחק ממשיך.'));
    setGame(next); setMoves(nextMoves); setPositions(nextPositions); setReviewPly(null);
    const status = statusOf(next);
    if (status) { setRunning(false); setFinished(status); setReviewPly(nextMoves.length); }
    else if (nextMoves.length >= 300) { setRunning(false); setFinished('המשחק נעצר בתקרת 300 חצאי־מסעים כדי למנוע לולאה אינסופית.'); setReviewPly(nextMoves.length); }
  }
  useEffect(() => {
    if (!running || finished) return;
    const timer = setTimeout(() => applyNextMove(game), speed);
    return () => clearTimeout(timer);
  }, [running, finished, game, speed, whiteId, blackId]);

  function startGame() {
    stopPendingBotMove();
    const fresh = new Chess();
    setGame(fresh); setMoves([]); setPositions([fresh.fen()]);
    setFinished(null); setReviewPly(null); setCommentary('המשחק התחיל. בדוק כל איום לפני בחירת המהלך הבא.'); setRunning(true);
  }
  function stepGame() { if (!running && !finished) applyNextMove(game); }
  function choosePly(ply: number) { stopPendingBotMove(); setRunning(false); const bounded = Math.max(0, Math.min(positions.length - 1, ply)); setReviewPly(!finished && bounded === moves.length ? null : bounded); }
  const captures = moves.filter((move) => Boolean(move.captured)).length;
  const checks = moves.filter((move) => String(move.san || '').includes('+') || String(move.san || '').includes('#')).length;
  const castles = moves.filter((move) => move.flags?.includes('k') || move.flags?.includes('q')).length;

  return h('div', { className: 'app-shell legends-page' },
    h('header', { className: 'topbar' },
      h('div', { className: 'brand product-brand' }, h('span', { className: 'product-brand-name' }, 'OREN AND CLAUDE'), h('span', { className: 'product-brand-divider', 'aria-hidden': true }, '·'), h('span', { className: 'product-brand-section' }, 'אגדות')),
      h('div', { className: 'top-actions' }, h(GlobalAudioButton), h('button', { onClick: onBack }, 'חזרה'))
    ),
    h('main', { className: 'content legends-content' },
      h('section', { className: 'legends-hero' },
        h('span', { className: 'eyebrow' }, 'THE LEGENDS'),
        h('h1', null, 'אגדות'),
        h('p', null, 'בוטים בהשראת משחקים אמיתיים, עם רפרטואר מתועד ואפשרות ללמוד ממשחקים ביניהם.'),
        h('p', { className: 'legends-disclaimer' }, tal?.description || 'הבוטים הם סימולציות עצמאיות בהשראת סגנונות משחק, ללא קשר רשמי לשחקנים או לעיזבונותיהם.')
      ),
      tal && h('section', { className: 'legend-feature-card' },
        h('div', { className: 'legend-emblem' }, tal.piece || '♞'),
        h('div', { className: 'legend-feature-copy' },
          h('span', { className: 'eyebrow' }, 'FIRST LEGEND'),
          h('h2', null, tal.name || 'The Magician from Riga'),
          h('p', null, tal.flavor || ''),
          h('div', { className: 'legend-meta' },
            h('span', null, 'רפרטואר: ' + (tal.sourceGameCount || 0).toLocaleString('he-IL') + ' משחקים'),
            h('span', null, 'שנים: ' + (tal.sourceYearRange || 'לא ידוע')),
            h('span', null, 'דירוג פנימי משוער: ' + tal.elo)
          )
        ),
        h('button', { className: 'primary', onClick: onBlindfold }, '♟ שחמט עיוור מול טל')
      ),
      h('section', { className: 'legends-simulation panel' },
        h('div', { className: 'legends-section-heading' },
          h('div', null, h('h2', null, 'בוט מול בוט'), h('p', { className: 'muted' }, 'בחר לבן ושחור, הרץ משחק, עצור או עבור מהלך־מהלך.')),
          h('span', { className: 'legends-status' }, resultText)
        ),
        h('p', { className: 'legends-commentary', 'aria-live': 'polite' }, commentary),
        h('div', { className: 'legends-selectors' },
          h('label', null, 'לבן', h('select', { value: whiteId, onChange: (event: any) => { stopPendingBotMove(); setWhiteId(event.target.value); setRunning(false); setFinished(null); }, disabled: running }, safeBots.map((bot) => h('option', { key: bot.id, value: bot.id }, bot.name + ' · ' + bot.elo + ' Elo')))),
          h('label', null, 'שחור', h('select', { value: blackId, onChange: (event: any) => { stopPendingBotMove(); setBlackId(event.target.value); setRunning(false); setFinished(null); }, disabled: running }, safeBots.map((bot) => h('option', { key: bot.id, value: bot.id }, bot.name + ' · ' + bot.elo + ' Elo')))),
          h('label', null, 'מהירות', h('select', { value: speed, onChange: (event: any) => setSpeed(Number(event.target.value)) }, h('option', { value: 250 }, 'מהיר מאוד'), h('option', { value: 650 }, 'רגיל'), h('option', { value: 1200 }, 'איטי'), h('option', { value: 2000 }, 'לימודי')))
        ),
        h('div', { className: 'legends-actions' },
          h('button', { className: 'primary', onClick: startGame, disabled: !whiteBot || !blackBot }, 'התחל משחק חדש'),
          h('button', { onClick: () => { if (running) stopPendingBotMove(); setRunning((value: boolean) => !value); }, disabled: !moves.length || Boolean(finished) || reviewPly !== null }, running ? 'השהה' : 'המשך אוטומטית'),
          h('button', { onClick: stepGame, disabled: running || Boolean(finished) || reviewPly !== null || !whiteBot || !blackBot }, 'מהלך יחיד'),
          h('button', { onClick: () => choosePly(Math.max(0, visiblePly - 1)), disabled: visiblePly <= 0 }, '← מהלך קודם'),
          h('button', { onClick: () => choosePly(Math.min(positions.length - 1, visiblePly + 1)), disabled: visiblePly >= positions.length - 1 }, 'מהלך הבא →')
        ),
        h('div', { className: 'legends-board-layout' },
          h('div', { className: 'board-wrap legends-board-wrap' }, h('div', { ref: boardRef, className: 'board' })),
          h('aside', { className: 'legends-moves-panel' },
            h('h3', null, 'מהלכים'),
            moves.length ? h('div', { className: 'legends-move-list' }, moves.map((move, index) => h('button', {
              key: index + '-' + move.from + move.to,
              className: 'legends-move' + (visiblePly === index + 1 ? ' active' : ''),
              onClick: () => choosePly(index + 1)
            }, h('span', null, String(Math.floor(index / 2) + 1) + (index % 2 === 0 ? '.' : '...')), h('strong', null, move.san)))) : h('p', { className: 'muted' }, 'התחל משחק כדי לראות את המהלכים.'),
            h('div', { className: 'legends-stats' }, h('span', null, 'חצאי־מסעים: ' + moves.length), h('span', null, 'הכאות: ' + captures), h('span', null, 'שחים: ' + checks), h('span', null, 'הצרחות: ' + castles))
          )
        )
      ),
      h('section', { className: 'legends-review panel' },
        h('div', { className: 'legends-section-heading' }, h('h2', null, 'סקירה לימודית')),
        h('p', null, visibleMove ? ('מהלך ' + visiblePly + ': ' + visibleMove.san + ' — ' + noteForMove(visibleMove)) : 'בחר מהלך מהרשימה או התחל משחק. הסקירה מציגה אירועי משחק נצפים, ולא טוענת שהמהלך הוא הטוב ביותר לפי מנוע.'),
        h('div', { className: 'legends-lesson-grid' },
          h('article', null, h('strong', null, 'יוזמה ואיומים'), h('p', null, 'בכל מהלך התקפי, שאל איזה איום נוצר ומהי התשובה הכפויה של היריב.')),
          h('article', null, h('strong', null, 'הקרבות וחומר'), h('p', null, 'כשיש הכאה או הקרבה, בדוק אם התמורה היא חומר, זמן, קווים פתוחים או התקפה על המלך.')),
          h('article', null, h('strong', null, 'הגנה נגדית'), h('p', null, 'חפש גם את משאב ההגנה של היריב; התקפה אינה מוצלחת רק מפני שהיא נראית מסוכנת.'))
        ),
        finished && h('p', { className: 'legends-finished-note', role: 'status' }, 'תוצאת הסימולציה: ' + finished),
        h('div', { className: 'legends-actions' },
          h('button', { className: 'primary', onClick: () => onReview(game.pgn()), disabled: !moves.length }, 'פתח בסקירת השחמט המלאה'),
          h('button', { onClick: startGame }, 'אתחל ונסה שוב'),
          h('button', { onClick: onBlindfold }, 'תרגל את טל בשחמט עיוור')
        )
      )
    )
  );
}
