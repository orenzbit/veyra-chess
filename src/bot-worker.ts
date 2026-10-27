// Background bot search: the page posts a FEN, this worker runs the same bot-engine search
// with the same rules bundle the page uses (window.ChessLib comes from this file too).
import { chooseBotMoveTimed } from './bot-engine.js';
import { botNow } from './bot-time.js';

const RULES_URL = '/vendor/veyra-rules/chess-compat.js';
let rulesPromise: Promise<any> | null = null;

function loadRules(): Promise<any> {
  if (!rulesPromise) {
    rulesPromise = import(RULES_URL).then((mod: any) => {
      if (typeof mod?.Chess !== 'function') throw new Error('Chess rules export missing');
      return mod.Chess;
    });
  }
  return rulesPromise;
}

export async function handleBotWorkerMessage(data: any, loadChess: () => Promise<any>) {
  if (!data || data.type !== 'choose') return null;
  let ChessCtor: any;
  try {
    ChessCtor = await loadChess();
  } catch {
    return { type: 'error', id: data.id, fatal: true, message: 'Chess rules could not be loaded in the worker' };
  }
  try {
    const fen = String(data.fen);
    const deadlineAt = typeof data.deadlineAt === 'number' && Number.isFinite(data.deadlineAt) ? data.deadlineAt : null;
    const result = chooseBotMoveTimed(new ChessCtor(fen), data.bot || {}, ChessCtor, { deadlineAt, now: botNow });
    const move = result.move ? { from: result.move.from, to: result.move.to, promotion: result.move.promotion || undefined } : null;
    return { type: 'move', id: data.id, fen, move, depth: result.depth, complete: result.complete };
  } catch (error: any) {
    return { type: 'error', id: data.id, fatal: false, message: String(error?.message || error) };
  }
}

const scope: any = typeof self !== 'undefined' ? self : null;
const WorkerScope: any = (globalThis as any).WorkerGlobalScope;
if (scope && typeof WorkerScope === 'function' && scope instanceof WorkerScope) {
  scope.onmessage = (event: any) => {
    handleBotWorkerMessage(event.data, loadRules).then((reply) => { if (reply) scope.postMessage(reply); });
  };
  // 'ready' means the rules are loaded; the page treats a missing 'ready' as a failed boot.
  loadRules().then(() => scope.postMessage({ type: 'ready' }), () => scope.postMessage({ type: 'boot-error' }));
}
