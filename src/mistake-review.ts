// Spaced review of the player's own mistakes. Pure data, no DOM.
//
// A position where the player blundered, made a mistake or missed a win in an analysed game becomes a review item:
// the board before that move, and the engine's better move as the answer.
// Schedule (Veyra's own, a plain spaced-repetition ladder): an item is due 1 day after it is added; solving it moves
// it to 3 days, then to 7 days; solving it at the 7-day step retires it as learned. A wrong answer, or a solve after
// the hint, sends it back to the 1-day step. Days are the user's local calendar dates (YYYY-MM-DD).

export const REVIEW_DAYS = [1, 3, 7];
export const LEARNED = REVIEW_DAYS.length;
export const MAX_ITEMS = 200;
export const PER_GAME = 3;
const KIND_ORDER = ['blunder', 'miss', 'mistake'] as const;
export type MistakeKind = typeof KIND_ORDER[number];

export type MistakeItem = {
  id: string; fen: string; best: string; played: string; kind: MistakeKind;
  added: string; due: string; step: number; updated: string;
};
export type MistakeReview = { items: MistakeItem[] };

const ID_RE = /^[a-z0-9:_-]{1,120}$/i;
const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const FEN_RE = /^[1-8pnbrqkPNBRQK/]{15,71} [wb] [KQkq-]{1,4} (?:-|[a-h][36]) \d{1,3} \d{1,4}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function validItem(raw: any): MistakeItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const step = Number(raw.step);
  if (!ID_RE.test(String(raw.id)) || !FEN_RE.test(String(raw.fen)) || !UCI_RE.test(String(raw.best)) || !UCI_RE.test(String(raw.played))) return null;
  if (!KIND_ORDER.includes(raw.kind) || !DAY_RE.test(String(raw.added)) || !DAY_RE.test(String(raw.due)) || !Number.isInteger(step) || step < 0 || step > LEARNED) return null;
  const updated = Number.isFinite(Date.parse(String(raw.updated))) ? new Date(Date.parse(String(raw.updated))).toISOString() : new Date(0).toISOString();
  return { id: raw.id, fen: raw.fen, best: raw.best, played: raw.played, kind: raw.kind, added: raw.added, due: raw.due, step, updated };
}

/** Keeps MAX_ITEMS: open items before learned ones, newest added first; output sorted by id for stable storage. */
function cap(items: MistakeItem[]): MistakeItem[] {
  const keep = [...items].sort((a, b) => Number(a.step >= LEARNED) - Number(b.step >= LEARNED) || (a.added < b.added ? 1 : a.added > b.added ? -1 : 0) || (a.id < b.id ? -1 : 1)).slice(0, MAX_ITEMS);
  return keep.sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function normalizeMistakeReview(input: unknown): MistakeReview {
  const raw = Array.isArray((input as any)?.items) ? (input as any).items : [];
  const byId = new Map<string, MistakeItem>();
  for (const item of raw.map(validItem)) if (item && !byId.has(item.id)) byId.set(item.id, item);
  return { items: cap([...byId.values()]) };
}

/** Union by id; for the same item the most recently updated copy wins (a tie keeps the further step). */
export function mergeMistakeReview(a: unknown, b: unknown): MistakeReview {
  const byId = new Map<string, MistakeItem>();
  for (const item of [...normalizeMistakeReview(a).items, ...normalizeMistakeReview(b).items]) {
    const old = byId.get(item.id);
    if (!old || item.updated > old.updated || (item.updated === old.updated && item.step > old.step)) byId.set(item.id, item);
  }
  return { items: cap([...byId.values()]) };
}

const uci = (m: any) => m.from + m.to + (m.promotion || '');

/**
 * Review items from one analysed game: the player's own blunders, misses and mistakes where the engine had a different,
 * legal best move. At most PER_GAME per game, worst first (blunder, miss, mistake; then the bigger drop; then earlier).
 * `history` is the game's verbose move list, `moves` the analysis rows (index, classification, bestUci, drop).
 */
export function mistakesFromGame(Chess: any, history: any[], moves: any[], playerColor: string, gameKey: string, today: string): MistakeItem[] {
  const side = playerColor === 'black' ? 'b' : playerColor === 'white' ? 'w' : '';
  const key = String(gameKey || '').replace(/[^a-z0-9]/gi, '').slice(-16); // game urls differ at the end
  if (!side || !key || !Array.isArray(history) || !Array.isArray(moves)) return [];
  const fens: string[] = []; const game = new Chess();
  for (const mv of history) { fens.push(game.fen()); try { if (!game.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined })) break; } catch { break; } }
  const found: Array<MistakeItem & { drop: number; index: number }> = [];
  for (const row of moves) {
    const index = Number(row?.index); const kind = row?.classification;
    if (!Number.isInteger(index) || !fens[index] || !KIND_ORDER.includes(kind)) continue;
    const fen = fens[index];
    if (fen.split(' ')[1] !== side || !UCI_RE.test(String(row.bestUci || ''))) continue;
    const played = uci(history[index]);
    if (row.bestUci === played) continue;
    const check = new Chess(fen);
    let legal = false; try { legal = Boolean(check.move({ from: row.bestUci.slice(0, 2), to: row.bestUci.slice(2, 4), promotion: row.bestUci[4] || undefined })); } catch {}
    if (!legal) continue;
    found.push({ id: `${key}:${index}`, fen, best: row.bestUci, played, kind, added: today, due: addDays(today, REVIEW_DAYS[0]), step: 0, updated: new Date(0).toISOString(), drop: Number(row.drop) || 0, index });
  }
  found.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.drop - a.drop || a.index - b.index);
  return found.slice(0, PER_GAME).map(({ drop, index, ...item }) => item);
}

/** Adds new items; an item already in the queue (same id, or same position and answer) keeps its own schedule. */
export function addMistakes(state: MistakeReview, items: MistakeItem[]): MistakeReview {
  const known = new Set(state.items.flatMap(i => [i.id, i.fen + ' ' + i.best]));
  const fresh = items.filter(i => !known.has(i.id) && !known.has(i.fen + ' ' + i.best));
  return fresh.length ? normalizeMistakeReview({ items: [...state.items, ...fresh] }) : state;
}

/** Items due on `today` (or overdue), earliest due first. */
export function dueMistakes(state: MistakeReview, today: string): MistakeItem[] {
  return state.items.filter(i => i.step < LEARNED && i.due <= today).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.id < b.id ? -1 : 1));
}

/** Records an answer: solved (without the hint) climbs one step, anything else goes back to the 1-day step. */
export function answerMistake(state: MistakeReview, id: string, solved: boolean, today: string, now: Date = new Date()): MistakeReview {
  return { items: state.items.map(item => {
    if (item.id !== id) return item;
    const step = solved ? item.step + 1 : 0;
    return { ...item, step, due: step >= LEARNED ? item.due : addDays(today, REVIEW_DAYS[step]), updated: now.toISOString() };
  }) };
}
