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
