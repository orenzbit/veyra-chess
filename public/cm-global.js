import * as ChessBoardLib from '/vendor/cm-chessboard/src/Chessboard.js'; window.ChessBoardLib = ChessBoardLib;
// Optional promotion dialog for boards that take move input. A failed load only means those boards fall back to auto-queen.
import('/vendor/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js').then((m) => { window.CmPromotionDialog = m.PromotionDialog; }).catch(() => {});
