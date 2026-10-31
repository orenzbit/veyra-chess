// Board move input for the opening quiz. The user drags or clicks a move on the board; it is turned into SAN and judged by
// quizMoveMatches, the same matcher as the typed-move field, so correct/incorrect, hints, completion and the streak behave the same.
import { quizMoveMatches, type QuizChessCtor } from './opening-quiz.js';

export interface QuizBoardState {
  active: boolean; // quiz running and it is the trained side's turn
  fen: string; // position before the expected move
  expected: string; // the line's SAN for that ply
}

export interface QuizBoardHooks {
  getState(): QuizBoardState;
  /** Called with the verdict of a legal move; illegal drops are never reported. */
  onVerdict(correct: boolean, san: string): void;
  /** Called when the board must show the current position again (rejected move or cancelled promotion). */
  resetBoard(): void;
}

/** cm-chessboard extensions for the openings board: the promotion dialog, when the vendored extension has loaded. */
export function openingBoardExtensions(): Array<{ class: unknown }> {
  const dialog = (window as any).CmPromotionDialog;
  return dialog ? [{ class: dialog }] : [];
}

function judge(Chess: QuizChessCtor, hooks: QuizBoardHooks, from: string, to: string, promotion: string | undefined): boolean {
  const { fen, expected } = hooks.getState();
  let san = '';
  try {
    const mv = new (Chess as any)(fen).move({ from, to, promotion });
    if (!mv) return false;
    san = mv.san;
  } catch {
    return false;
  }
  const correct = quizMoveMatches(Chess, fen, san, expected);
  hooks.onVerdict(correct, san);
  return correct; // a wrong move returns false, so the board snaps the piece back
}

export interface QuizKeyboardHooks extends QuizBoardHooks {
  isWhite(): boolean; // the trained side, which is also the board orientation
  en(): boolean;
}

const FILES = 'abcdefgh';
const PIECE_NAMES: Record<string, [string, string]> = { p: ['pawn', 'רגלי'], n: ['knight', 'פרש'], b: ['bishop', 'רץ'], r: ['rook', 'צריח'], q: ['queen', 'מלכה'], k: ['king', 'מלך'] };

/** Square reached by an arrow key, as seen on screen (up = toward the opponent). Stays put at the edge. */
export function keyboardStep(square: string, key: string, white: boolean): string {
  const d = white ? 1 : -1;
  let f = FILES.indexOf(square[0]);
  let r = Number(square[1]);
  if (key === 'ArrowUp') r += d;
  else if (key === 'ArrowDown') r -= d;
  else if (key === 'ArrowRight') f += d;
  else if (key === 'ArrowLeft') f -= d;
  return f >= 0 && f < 8 && r >= 1 && r <= 8 ? FILES[f] + r : square;
}

/**
 * Keyboard input for the openings board, like blindfold training: arrows move a cursor, Enter/Space picks the piece and then
 * the target square, Escape cancels. Legal moves go through judge(), the same path as drag/tap. Returns a detach function.
 */
export function attachQuizBoardKeyboard(wrap: HTMLElement, boardEl: HTMLElement, Chess: QuizChessCtor, hooks: QuizKeyboardHooks): () => void {
  let cursor = '';
  let selected = '';
  const layer = document.createElement('div');
  layer.className = 'quiz-kb-layer';
  layer.setAttribute('aria-hidden', 'true');
  const selBox = document.createElement('div');
  selBox.className = 'quiz-kb-selected';
  const cursorBox = document.createElement('div');
  cursorBox.className = 'quiz-kb-cursor';
  layer.append(selBox, cursorBox);
  const live = document.createElement('div');
  live.className = 'quiz-kb-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  wrap.append(layer, live);
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'application');
  const t = (enText: string, heText: string) => (hooks.en() ? enText : heText);
  const setLabel = () => wrap.setAttribute('aria-label', t('Opening board. Arrow keys move, Enter or Space picks the piece and then the target square, Escape cancels.', 'לוח הפתיחה. חיצים להזזה, Enter או רווח לבחירת הכלי ואז משבצת היעד, Escape לביטול.'));
  setLabel();
  const say = (text: string) => { live.textContent = text; };

  function place(box: HTMLElement, square: string) {
    box.hidden = !square;
    if (!square) return;
    const outer = wrap.getBoundingClientRect();
    const rect = boardEl.getBoundingClientRect();
    const size = rect.width / 8;
    const white = hooks.isWhite();
    const file = FILES.indexOf(square[0]);
    const rank = Number(square[1]);
    const col = white ? file : 7 - file;
    const row = white ? 8 - rank : rank - 1;
    box.style.left = `${rect.left - outer.left - wrap.clientLeft + col * size}px`;
    box.style.top = `${rect.top - outer.top - wrap.clientTop + row * size}px`;
    box.style.width = box.style.height = `${size}px`;
  }
  const render = () => { place(cursorBox, cursor); place(selBox, selected); };
  function describe(square: string, fen: string): string {
    let piece: { type: string; color: string } | undefined;
    try { piece = new (Chess as any)(fen).get(square); } catch { piece = undefined; }
    if (!piece) return square;
    const [enName, heName] = PIECE_NAMES[piece.type] || [piece.type, piece.type];
    return square + ', ' + t((piece.color === 'w' ? 'white ' : 'black ') + enName, heName + (piece.color === 'w' ? ' לבן' : ' שחור'));
  }

  function onKey(ev: KeyboardEvent) {
    if (ev.target !== wrap) return; // e.g. keys inside the promotion dialog
    const white = hooks.isWhite();
    const state = hooks.getState();
    if (!cursor) cursor = white ? 'e2' : 'e7';
    if (ev.key.startsWith('Arrow')) {
      ev.preventDefault();
      wrap.dataset.kb = '1';
      cursor = keyboardStep(cursor, ev.key, white);
      render();
      say(describe(cursor, state.fen));
      return;
    }
    if (ev.key === 'Escape') {
      if (!selected) return;
      ev.preventDefault();
      selected = '';
      render();
      say(t('Selection cancelled', 'הבחירה בוטלה'));
      return;
    }
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    wrap.dataset.kb = '1';
    render();
    if (!state.active) { say(t('Not your move right now', 'זה לא התור שלך כרגע')); return; }
    let game: any;
    try { game = new (Chess as any)(state.fen); } catch { return; }
    const piece = game.get(cursor);
    const mine = piece && piece.color === (white ? 'w' : 'b');
    if (cursor === selected) {
      selected = '';
      render();
      say(t('Selection cancelled', 'הבחירה בוטלה'));
      return;
    }
    if (mine) {
      selected = cursor;
      render();
      say(t('Selected ', 'נבחר: ') + describe(cursor, state.fen));
      return;
    }
    if (!selected) { say(t('Pick one of your pieces first', 'בחר קודם כלי שלך')); return; }
    const from = selected;
    selected = '';
    render();
    const legal = game.moves({ verbose: true }).filter((m: any) => m.from === from && m.to === cursor);
    if (!legal.length) { say(t('Illegal move', 'מהלך לא חוקי')); return; }
    const correct = judge(Chess, hooks, from, cursor, legal[0].promotion ? 'q' : undefined);
    say(t(correct ? 'Correct' : 'Not that move', correct ? 'נכון' : 'לא המהלך הזה'));
  }
  const onPointer = () => { delete wrap.dataset.kb; };
  wrap.addEventListener('keydown', onKey);
  wrap.addEventListener('pointerdown', onPointer);
  wrap.addEventListener('focus', setLabel);
  return () => {
    wrap.removeEventListener('keydown', onKey);
    wrap.removeEventListener('pointerdown', onPointer);
    wrap.removeEventListener('focus', setLabel);
    layer.remove();
    live.remove();
    wrap.removeAttribute('tabindex');
    wrap.removeAttribute('role');
    wrap.removeAttribute('aria-label');
    delete wrap.dataset.kb;
  };
}

/** (Re)enables drag/click input for the trained side. Safe to call again when the opening or colour changes. */
export function enableQuizBoardInput(board: any, color: unknown, Chess: QuizChessCtor, hooks: QuizBoardHooks): void {
  try { board.disableMoveInput(); } catch { /* not enabled yet */ }
  board.enableMoveInput((ev: any) => {
    if (ev.type === 'moveInputStarted') return hooks.getState().active && !(board.isPromotionDialogShown && board.isPromotionDialogShown());
    if (ev.type !== 'validateMoveInput') return true;
    const state = hooks.getState();
    if (!state.active) return false;
    let legal: Array<{ promotion?: string; color: string }>;
    try {
      legal = new (Chess as any)(state.fen).moves({ verbose: true }).filter((m: any) => m.from === ev.squareFrom && m.to === ev.squareTo);
    } catch {
      return false;
    }
    if (!legal.length) return false; // an illegal drop is not an answer: no mistake is counted
    if (!legal[0].promotion) return judge(Chess, hooks, ev.squareFrom, ev.squareTo, undefined);
    if (ev.promotion) return judge(Chess, hooks, ev.squareFrom, ev.squareTo, String(ev.promotion).toLowerCase());
    if (!board.showPromotionDialog) return judge(Chess, hooks, ev.squareFrom, ev.squareTo, 'q'); // dialog extension missing: queen
    board.showPromotionDialog(ev.squareTo, legal[0].color, (result: any) => {
      if (result && result.type === 'pieceSelected' && result.piece) {
        if (judge(Chess, hooks, ev.squareFrom, ev.squareTo, String(result.piece).charAt(1).toLowerCase())) return;
      }
      hooks.resetBoard();
    });
    return true; // keep the pawn on the last rank while the dialog is open
  }, color);
}
