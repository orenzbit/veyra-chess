export type ArchiveProvider = "chesscom" | "lichess";

export interface ArchivedGame {
  id: string;
  source: ArchiveProvider | "demo";
  date: string;
  pgn: string;
  result: "win" | "loss" | "draw" | "unknown";
  playerColor: "white" | "black";
  playerColorKnown?: boolean;
  opponent: string;
  opponentRating: number | null;
  userRating: number | null;
  timeClass: string;
  timeControlLabel: string;
  opening: string;
  moveCount: number;
  finishReason: string;
  url: string;
}

function readHeader(pgn: string, name: string): string {
  const match = new RegExp("^\\[" + name + "\\s+\"([^\"]*)\"\\]", "mi").exec(pgn || "");
  return match ? match[1].replace(/\\"/g, "\"").trim() : "";
}

function dateFromPgn(pgn: string): string {
  const date = readHeader(pgn, "Date");
  if (!date || date.includes("????")) return "unknown";
  const iso = date.replace(/\./g, "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "unknown";
}

function timeControlLabel(value: string): string {
  const match = String(value || "").match(/^(\d+)(?:\+(\d+))?$/);
  if (!match) return value || "לא ידוע";
  const seconds = Number(match[1]);
  const increment = Number(match[2] || 0);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const base = remainder ? String(minutes) + ":" + String(remainder).padStart(2, "0") : String(minutes);
  return base + "+" + increment;
}

export function inferTimeClass(_value: string, event: string): string {
  // PGN-only imports do not reliably expose the platform's time class.
  // Prefer an explicit class in Event metadata; never infer it from elapsed
  // duration or TimeControl because increment, delays and game length vary.
  const eventMatch = String(event || "").toLowerCase().match(/\b(bullet|blitz|rapid|classical|daily)\b/);
  return eventMatch ? eventMatch[1] : "unknown";
}

function scoreFromHeaders(pgn: string, raw: any): string {
  const result = readHeader(pgn, "Result");
  if (["1-0", "0-1", "1/2-1/2"].includes(result)) return result;
  if (raw?.white?.result === "win") return "1-0";
  if (raw?.black?.result === "win") return "0-1";
  const draws = new Set(["agreed", "stalemate", "repetition", "insufficient", "50move", "timevsinsufficient"]);
  if (draws.has(raw?.white?.result) || draws.has(raw?.black?.result)) return "1/2-1/2";
  return "*";
}

function finishReason(pgn: string, raw: any): string {
  const rawResults = [raw?.white?.result, raw?.black?.result].filter(Boolean).join(" ");
  const termination = (readHeader(pgn, "Termination") + " " + rawResults).toLowerCase();
  if (/checkmate|checkmated/.test(termination)) return "מט";
  if (/timeout|time forfeit|timevsinsufficient/.test(termination)) return "נפילה בזמן";
  if (/resign/.test(termination)) return "התפטרות";
  if (/stalemate/.test(termination)) return "פט";
  if (/repetition/.test(termination)) return "חזרה";
  if (/insufficient/.test(termination)) return "חומר לא מספיק";
  if (/abandon/.test(termination)) return "נטישה";
  if (/draw|agreed|50.?move/.test(termination)) return "תיקו";
  if (/normal/.test(termination)) return "סיום רגיל";
  return readHeader(pgn, "Termination") || "סיום המשחק";
}

function openingFromPgn(pgn: string): string {
  const named = readHeader(pgn, "Opening");
  if (named) return named;
  const eco = readHeader(pgn, "ECO");
  const url = readHeader(pgn, "ECOUrl");
  if (url) {
    const slug = url.split(/[/?#]/).filter(Boolean).pop() || "";
    let readable = slug;
    try { readable = decodeURIComponent(slug); } catch {}
    readable = readable.replace(/[-_]+/g, " ").trim();
    if (readable) return readable.replace(/\b\w/g, letter => letter.toUpperCase());
  }
  return eco ? "פתיחה " + eco : "פתיחה לא זוהתה";
}

function moveCountFromPgn(pgn: string): number {
  try {
    const Chess = (window as any).ChessLib?.Chess;
    if (!Chess) return 0;
    const chess = new Chess();
    chess.loadPgn(pgn, { sloppy: true });
    return Math.ceil(chess.history().length / 2);
  } catch {
    return 0;
  }
}

function normalizeGame(pgn: string, source: ArchiveProvider, playerUsername: string, raw: any = {}, fallbackId = ""): ArchivedGame {
  const whiteName = readHeader(pgn, "White") || raw?.white?.username || "לבן";
  const blackName = readHeader(pgn, "Black") || raw?.black?.username || "שחור";
  const target = String(playerUsername || "").trim().toLowerCase();
  const whiteMatches = String(whiteName).toLowerCase() === target ||
    String(raw?.white?.username || "").toLowerCase() === target;
  const blackMatches = String(blackName).toLowerCase() === target ||
    String(raw?.black?.username || "").toLowerCase() === target;
  const playerColorKnown = whiteMatches || blackMatches;
  const playerColor: "white" | "black" = whiteMatches ? "white" : blackMatches ? "black" : "black";
  const ownMeta = playerColor === "white" ? raw?.white : raw?.black;
  const opponentMeta = playerColor === "white" ? raw?.black : raw?.white;
  const resultCode = scoreFromHeaders(pgn, raw);
  let result: ArchivedGame["result"] = "unknown";
  if (resultCode === "1/2-1/2") result = "draw";
  else if (resultCode === "1-0") result = playerColor === "white" ? "win" : "loss";
  else if (resultCode === "0-1") result = playerColor === "black" ? "win" : "loss";
  else if (ownMeta?.result === "win") result = "win";
  else if (["agreed", "stalemate", "repetition", "insufficient", "50move", "timevsinsufficient"].includes(ownMeta?.result)) result = "draw";
  const timeControl = readHeader(pgn, "TimeControl") || String(raw?.time_control || "");
  const event = readHeader(pgn, "Event");
  const date = Number(raw?.end_time) > 0
    ? new Date(Number(raw.end_time) * 1000).toISOString().slice(0, 10)
    : dateFromPgn(pgn);
  const site = readHeader(pgn, "Site");
  const sourceUrl = String(raw?.url || (site.startsWith("http") ? site : ""));
  const rawId = sourceUrl || fallbackId || [date, whiteName, blackName, readHeader(pgn, "Round")].join("-");
  return {
    id: source + ":" + rawId,
    source,
    date,
    pgn,
    result,
    playerColor,
    playerColorKnown,
    opponent: String(playerColor === "white" ? blackName : whiteName),
    opponentRating: Number(opponentMeta?.rating || readHeader(pgn, playerColor === "white" ? "BlackElo" : "WhiteElo")) || null,
    userRating: Number(ownMeta?.rating || readHeader(pgn, playerColor === "white" ? "WhiteElo" : "BlackElo")) || null,
    timeClass: String(raw?.time_class || inferTimeClass(timeControl, event)),
    timeControlLabel: timeControlLabel(timeControl),
    opening: openingFromPgn(pgn),
    moveCount: moveCountFromPgn(pgn),
    finishReason: finishReason(pgn, raw),
    url: sourceUrl
  };
}

async function fetchJson(url: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  } catch {
    throw new Error("לא הצלחתי להתחבר לשירות. בדוק את החיבור לאינטרנט ונסה שוב.");
  }
  if (response.status === 429) throw new Error("השירות הגביל זמנית את מספר הבקשות. המתן מעט ונסה שוב.");
  if (response.status === 404) throw new Error("שם המשתמש לא נמצא או שאין משחקים ציבוריים זמינים.");
  if (!response.ok) throw new Error("השירות החזיר שגיאה (HTTP " + response.status + "). אפשר לנסות שוב.");
  try { return await response.json(); }
  catch { throw new Error("השירות החזיר תשובה שלא ניתן לקרוא. נסה שוב."); }
}

async function fetchChessCom(username: string, limit: number): Promise<{ games: ArchivedGame[]; warning: string }> {
  const root = "https://api.chess.com/pub/player/" + encodeURIComponent(username);
  const archiveData = await fetchJson(root + "/games/archives");
  const archiveUrls: string[] = Array.isArray(archiveData?.archives) ? archiveData.archives.slice().reverse() : [];
  if (!archiveUrls.length) return { games: [], warning: "" };
  const games: ArchivedGame[] = [];
  const warnings: string[] = [];
  for (const archiveUrl of archiveUrls) {
    if (games.length >= limit) break;
    try {
      const month = await fetchJson(archiveUrl);
      const monthlyGames = (Array.isArray(month?.games) ? month.games : []).slice().sort((a: any, b: any) => Number(b?.end_time || 0) - Number(a?.end_time || 0));
      for (const game of monthlyGames) {
        if (game?.pgn) games.push(normalizeGame(game.pgn, "chesscom", username, game, String(game.end_time || games.length)));
        if (games.length >= limit) break;
      }
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.includes("הגביל זמנית")) throw error;
      warnings.push(message);
    }
  }
  games.sort((a, b) => b.date.localeCompare(a.date));
  const unique = new Map<string, ArchivedGame>();
  for (const game of games) if (!unique.has(game.id)) unique.set(game.id, game);
  const recent = Array.from(unique.values()).slice(0, limit);
  if (!recent.length && warnings.length) throw new Error(warnings[0]);
  return {
    games: recent,
    warning: warnings.length ? "חלק מהארכיונים החודשיים לא נטענו; מוצגים המשחקים שהצליחו להיטען." : ""
  };
}

async function fetchLichess(username: string, limit: number): Promise<{ games: ArchivedGame[]; warning: string }> {
  const maxGames = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 100)));
  const games: ArchivedGame[] = [];
  const seenIds = new Set<string>();
  const warnings: string[] = [];
  let until: number | null = null;
  const maxPages = Math.ceil(maxGames / 100);

  for (let page = 0; page < maxPages && games.length < maxGames; page++) {
    const params = new URLSearchParams({ max: String(Math.min(100, maxGames - games.length)), clocks: 'true', evals: 'false', opening: 'true' });
    if (until !== null) params.set('until', String(until));
    const url = 'https://lichess.org/api/games/user/' + encodeURIComponent(username) + '?' + params.toString();
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' }, cache: 'no-store' });
    } catch {
      if (games.length) { warnings.push('החיבור ל-Lichess נותק בזמן טעינת דפים נוספים.'); break; }
      throw new Error('לא הצלחתי להתחבר ל-Lichess. בדוק את החיבור לאינטרנט ונסה שוב.');
    }
    if (response.status === 429) throw new Error('Lichess הגבילה זמנית את מספר הבקשות. נסה שוב בעוד רגע.');
    if (response.status === 404) throw new Error('שם המשתמש לא נמצא ב-Lichess או שאין משחקים ציבוריים.');
    if (!response.ok) {
      if (games.length) { warnings.push('חלק מהיסטוריית Lichess לא נטענה (HTTP ' + response.status + ').'); break; }
      throw new Error('Lichess החזירה שגיאה (HTTP ' + response.status + '). אפשר לנסות שוב.');
    }
    const text = await response.text();
    const pgns = text.trim()
      ? text.trim().split(/(?=^\[Event\s)/m).map(value => value.trim()).filter(value => /^\[Event\s/m.test(value))
      : [];
    if (!pgns.length) break;

    const pageGames = pgns.map((pgn, index) => normalizeGame(pgn, 'lichess', username, {}, String(page * 100 + index)));
    let added = 0;
    for (const game of pageGames) {
      if (seenIds.has(game.id)) continue;
      seenIds.add(game.id); games.push(game); added++;
      if (games.length >= maxGames) break;
    }
    if (games.length >= maxGames || pgns.length < 100) break;
    if (!added) break;

    // Lichess pagination uses an epoch-millisecond cutoff. Only advance when
    // UTC timestamps are explicit; date-only PGNs can skip same-day games.
    const timestamps = pgns.map(pgn => {
      const date = readHeader(pgn, 'UTCDate');
      const time = readHeader(pgn, 'UTCTime');
      if (!/^\d{4}\.\d{2}\.\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(time)) return NaN;
      return Date.parse(date.replace(/\./g, '-') + 'T' + time + 'Z');
    }).filter(Number.isFinite);
    if (timestamps.length !== pgns.length) {
      warnings.push('היסטוריית Lichess מוגבלת לעמוד הראשון כי לא לכל המשחקים יש חותמת זמן UTC אמינה.');
      break;
    }
    const earliest = Math.min(...timestamps);
    const nextUntil = earliest - 1;
    if (!Number.isFinite(nextUntil) || (until !== null && nextUntil >= until)) break;
    until = nextUntil;
  }

  games.sort((a, b) => b.date.localeCompare(a.date));
  return { games: games.slice(0, maxGames), warning: warnings.join(' ') };
}

export async function fetchArchiveGames(provider: ArchiveProvider, username: string, limit = 100): Promise<{ games: ArchivedGame[]; warning: string }> {
  const clean = String(username || "").trim();
  if (!clean) throw new Error("הכנס שם משתמש לפני טעינת המשחקים.");
  if (clean.length > 64 || /[\s/\\]/.test(clean)) throw new Error("שם המשתמש מכיל תווים לא צפויים. בדוק את האיות ונסה שוב.");
  const boundedLimit = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 100)));
  if (provider === "lichess") return fetchLichess(clean, boundedLimit);
  return fetchChessCom(clean, boundedLimit);
}

export const DEMO_GAME_PGN = [
  '[Event "Veyra Chess Demo"]',
  '[Site "Veyra Chess"]',
  '[Date "2026.10.14"]',
  '[Round "1"]',
  '[White "Opponent Gamma"]',
  '[Black "You"]',
  '[Result "1-0"]',
  '[WhiteElo "1510"]',
  '[BlackElo "1480"]',
  '[TimeControl "180+2"]',
  '[Opening "Scholar Mate"]',
  '[Termination "Checkmate"]',
  '',
  '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0'
].join("\n");

export const DEMO_ARCHIVE_GAME: ArchivedGame = {
  id: "demo-opponent-gamma",
  source: "demo",
  date: "2026-10-14",
  pgn: DEMO_GAME_PGN,
  result: "loss",
  playerColor: "black",
  opponent: "Opponent Gamma",
  opponentRating: 1510,
  userRating: 1480,
  timeClass: "blitz",
  timeControlLabel: "3+2",
  opening: "Scholar's Mate",
  moveCount: 4,
  finishReason: "מט",
  url: ""
};
