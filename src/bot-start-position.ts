// Start a bot game from a chosen opening (SAN move list and/or FEN) at a chosen strength level.
// Pure helpers: the page only passes the rules constructor in. Nothing here touches the DOM.
// Strength uses the bot's own searchDepthCap, which chooseBotMoveTimed honours; a level can only
// lower the depth a bot would search, never raise it.

export const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const MAX_START_PLIES = 200;
export const MAX_START_TEXT = 2000;
export const MAX_FEN_LENGTH = 100;

// Level 4 ("full") adds no cap. Native depth is 4 for 2400+, 3 for 1700+, 2 for 700+ and 1 below,
// so levels only differ for bots whose native depth is above the level's cap.
export const BOT_LEVELS = [
  { id: 1, cap: 1, label: 'מתחיל' },
  { id: 2, cap: 2, label: 'בינוני' },
  { id: 3, cap: 3, label: 'מתקדם' },
  { id: 4, cap: null, label: 'מלא' },
] as const;
export const DEFAULT_BOT_LEVEL = 4;

export type BotStart = { baseFen: string; moves: string[]; fen: string; reviewable: boolean };
export type StartParse = { ok: true; start: BotStart } | { ok: false; error: string };

export function normalizeBotLevel(level: any): number {
  const n = typeof level === 'string' && /^[1-4]$/.test(level.trim()) ? Number(level) : level;
  return BOT_LEVELS.some((l) => l.id === n) ? (n as number) : DEFAULT_BOT_LEVEL;
}

export function botAtLevel(bot: any, level?: any) {
  const entry = BOT_LEVELS.find((l) => l.id === normalizeBotLevel(level));
  if (!bot || !entry || entry.cap == null) return bot;
  const own = Number(bot.searchDepthCap);
  return { ...bot, searchDepthCap: own > 0 ? Math.min(own, entry.cap) : entry.cap };
}

const SAN_TOKEN = /^(?:O-O(?:-O)?|0-0(?:-0)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=?[QRBN])?)[+#]?[!?]{0,2}$/;
const RESULT_TOKEN = /^(?:1-0|0-1|1\/2-1\/2|\*)$/;

function sanTokens(moves: any): string[] | null {
  let text: string;
  if (Array.isArray(moves)) text = moves.map(String).join(' ');
  else if (typeof moves === 'string') text = moves;
  else return null;
  if (text.length > MAX_START_TEXT) return null;
  const tokens = text
    .replace(/\d+\s*\.(?:\s*\.\.)?/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean)
    .filter((t) => !RESULT_TOKEN.test(t));
  return tokens.every((t) => SAN_TOKEN.test(t)) ? tokens : null;
}

export function parseStartPosition(input: { moves?: any; fen?: any } | null | undefined, ChessCtor: any): StartParse {
  const hasFen = input?.fen != null && String(input.fen).trim() !== '';
  const hasMoves = input?.moves != null && !(typeof input.moves === 'string' && !input.moves.trim()) && !(Array.isArray(input.moves) && !input.moves.length);
  let baseFen = STANDARD_START_FEN;
  let game: any;
  if (hasFen) {
    const raw = typeof input!.fen === 'string' ? input!.fen.trim().replace(/\s+/g, ' ') : '';
    if (!raw || raw.length > MAX_FEN_LENGTH || /[^A-Za-z0-9\/ \-]/.test(raw)) return { ok: false, error: 'FEN לא תקין' };
    try { game = new ChessCtor(raw); } catch { return { ok: false, error: 'FEN לא תקין' }; }
    baseFen = game.fen();
  } else {
    game = new ChessCtor();
  }
  const played: string[] = [];
  if (hasMoves) {
    const tokens = sanTokens(input!.moves);
    if (!tokens) return { ok: false, error: 'רשימת המהלכים אינה תקינה' };
    if (tokens.length > MAX_START_PLIES) return { ok: false, error: 'רשימת המהלכים ארוכה מדי' };
    for (const token of tokens) {
      let applied: any = null;
      try { applied = game.move(token, { sloppy: true }); } catch { applied = null; }
      if (!applied) return { ok: false, error: `מהלך לא חוקי: ${token}` };
      played.push(applied.san);
    }
  }
  if (game.isGameOver() || game.isDraw()) return { ok: false, error: 'העמדה כבר הסתיימה' };
  return { ok: true, start: { baseFen, moves: played, fen: game.fen(), reviewable: baseFen === STANDARD_START_FEN } };
}

// The game a page starts with. Without a start it is the ordinary new game.
export function startingGame(start: BotStart | null | undefined, ChessCtor: any) {
  if (!start) return new ChessCtor();
  try {
    const game = start.baseFen === STANDARD_START_FEN ? new ChessCtor() : new ChessCtor(start.baseFen);
    for (const san of start.moves) if (!game.move(san, { sloppy: true })) return new ChessCtor(start.fen);
    return game;
  } catch {
    return new ChessCtor();
  }
}

// Historical bots (those with a sourceFile) first, then the strongest; the input is not changed.
export function rankBotsForPicker(bots: any[]) {
  const list = Array.isArray(bots) ? bots : [];
  return list
    .map((bot, index) => ({ bot, index }))
    .sort((a, b) => Number(Boolean(b.bot?.sourceFile)) - Number(Boolean(a.bot?.sourceFile)) || (b.bot?.elo || 0) - (a.bot?.elo || 0) || a.index - b.index)
    .map((e) => e.bot);
}

export type StartRequest = { botId?: any; moves?: any; fen?: any; level?: any; side?: any };
export type ResolvedStart = { ok: true; bot: any; start: BotStart; level: number; side: 'white' | 'black' } | { ok: false; error: string };

// Any bot in the list can be used; locked campaign bots are not special-cased here.
export function resolveBotStart(request: StartRequest, bots: any[], ChessCtor: any): ResolvedStart {
  const id = String(request?.botId ?? '');
  const bot = (Array.isArray(bots) ? bots : []).find((b) => b && (b.id === id || b.slug === id));
  if (!/^[a-z0-9-]{2,80}$/.test(id) || !bot) return { ok: false, error: 'הבוט לא נמצא' };
  const parsed = parseStartPosition({ moves: request.moves, fen: request.fen }, ChessCtor);
  if (parsed.ok === false) return { ok: false, error: parsed.error };
  const side = request.side === 'black' ? 'black' : 'white';
  return { ok: true, bot, start: parsed.start, level: normalizeBotLevel(request.level), side };
}

// Test/deep-link entry: ?botgame=<id>&moves=e4,e5,Nf3 | &fen=...  [&level=1..4] [&side=white|black].
// Returns null when the query does not ask for a bot game.
export function botStartFromQuery(search: string, bots: any[], ChessCtor: any): ResolvedStart | null {
  let params: URLSearchParams;
  try { params = new URLSearchParams(String(search || '').slice(0, 4000)); } catch { return null; }
  if (!params.has('botgame')) return null;
  return resolveBotStart({ botId: params.get('botgame'), moves: params.get('moves'), fen: params.get('fen'), level: params.get('level'), side: params.get('side') }, bots, ChessCtor);
}
