// Game sources for the puzzle engine (server side): Chess.com, Lichess and the user's saved games.
// Pure with respect to the network: callers inject `fetchImpl` / `db`, so tests run offline.
import crypto from 'node:crypto';

const USER_AGENT = () => String(process.env.PUZZLES_USER_AGENT || 'VeyraChess/1.0 (puzzle engine)').slice(0, 200);

export class SourceError extends Error {
  constructor(code, message, status) {
    super(message || code);
    this.code = code;
    this.status = status || 0;
  }
}

export function cleanUsername(value) {
  const name = String(value || '').trim();
  // Letters, digits, _ - and inner dots only (both providers). Anything else could change the URL path or query.
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(name) || name.includes('..')) return '';
  return name;
}

export function parseHeaders(pgn) {
  const headers = {};
  const re = /^\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let match;
  while ((match = re.exec(String(pgn || '')))) headers[match[1]] = match[2].replace(/\\(["\\])/g, '$1');
  return headers;
}

/**
 * Strict colour resolution: returns 'w' or 'b' only when exactly one side matches the username.
 * Never defaults. (The browser archive defaults to black; that is wrong for training data.)
 */
export function resolveUserColor(headers, usernames) {
  const names = (Array.isArray(usernames) ? usernames : [usernames])
    .map((n) => String(n || '').trim().toLowerCase()).filter(Boolean);
  if (!names.length) return null;
  const white = String(headers?.White || '').trim().toLowerCase();
  const black = String(headers?.Black || '').trim().toLowerCase();
  const isWhite = names.includes(white);
  const isBlack = names.includes(black);
  if (isWhite === isBlack) return null;
  return isWhite ? 'w' : 'b';
}

/** Clock seconds left after each ply, from [%clk h:mm:ss(.s)] comments; [] if not every ply has one. */
export function extractClocks(pgn) {
  const body = String(pgn || '').replace(/^\[[^\n]*\]\s*$/gm, '');
  const clocks = [...body.matchAll(/\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/g)]
    .map((m) => Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
  return clocks;
}

export function timeClassOf(headers) {
  const tc = String(headers?.TimeControl || '');
  const m = tc.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return tc.includes('/') ? 'daily' : 'unknown';
  const estimate = Number(m[1]) + 40 * Number(m[2] || 0);
  if (estimate < 180) return 'bullet';
  if (estimate < 480) return 'blitz';
  if (estimate < 1500) return 'rapid';
  return 'classical';
}

function dateOf(headers) {
  const d = String(headers?.UTCDate || headers?.Date || '').replace(/\./g, '-');
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

function pgnHash(pgn) {
  return crypto.createHash('sha256').update(String(pgn)).digest('hex').slice(0, 16);
}

function buildGame({ provider, key, url, pgn, endTime, usernames }) {
  const headers = parseHeaders(pgn);
  const white = String(headers.White || '');
  const black = String(headers.Black || '');
  const userColor = resolveUserColor(headers, usernames);
  return {
    provider, key, url: url || '', pgn, endTime: Number(endTime) || 0, headers, userColor,
    date: dateOf(headers), timeClass: timeClassOf(headers),
    opponent: userColor === 'w' ? black : userColor === 'b' ? white : '',
    variant: String(headers.Variant || 'Standard'),
  };
}

async function getResponse(fetchImpl, url, accept) {
  let response;
  try {
    response = await fetchImpl(url, { headers: { Accept: accept, 'User-Agent': USER_AGENT() } });
  } catch {
    throw new SourceError('network', 'provider unreachable');
  }
  if (response.status === 429) throw new SourceError('rate_limited', 'provider rate limit', 429);
  if (response.status === 404) throw new SourceError('not_found', 'user or games not found', 404);
  if (!response.ok) throw new SourceError('provider_error', 'provider error ' + response.status, response.status);
  return response;
}

/**
 * Chess.com page of games, newest first.
 * cursor: { beforeEndTime } - only games that ended strictly before it (unix seconds).
 * returns { games, cursor, exhausted }
 */
export async function fetchChessComPage(username, cursor = {}, limit = 20, fetchImpl = fetch) {
  const name = cleanUsername(username);
  if (!name) throw new SourceError('bad_username', 'invalid username');
  const root = 'https://api.chess.com/pub/player/' + encodeURIComponent(name);
  const archives = await (await getResponse(fetchImpl, root + '/games/archives', 'application/json')).json();
  // A provider answer must not steer the server elsewhere: only this user's own archive pages are fetched.
  const allowedPrefix = root + '/games/';
  const urls = (Array.isArray(archives?.archives) ? archives.archives : []).filter((u) => typeof u === 'string' && u.toLowerCase().startsWith(allowedPrefix.toLowerCase()) && /\/\d{4}\/\d{2}$/.test(u)).slice().reverse();
  const before = Number(cursor?.beforeEndTime) || Infinity;
  const games = [];
  let lastEnd = before;
  let exhausted = true;
  for (const url of urls) {
    // Archive URLs end in /YYYY/MM; skip whole months that are entirely after the cursor.
    const ym = url.match(/\/(\d{4})\/(\d{2})$/);
    if (ym && Number.isFinite(before)) {
      const monthStart = Date.UTC(Number(ym[1]), Number(ym[2]) - 1, 1) / 1000;
      if (monthStart >= before) continue;
    }
    const month = await (await getResponse(fetchImpl, url, 'application/json')).json();
    const list = (Array.isArray(month?.games) ? month.games : [])
      .filter((g) => g && typeof g.pgn === 'string' && Number(g.end_time) < before)
      .sort((a, b) => Number(b.end_time) - Number(a.end_time));
    for (const g of list) {
      if (games.length >= limit) { exhausted = false; break; }
      games.push(buildGame({
        provider: 'chesscom', key: 'chesscom:' + (g.url || g.uuid || g.end_time), url: /^https:\/\/www\.chess\.com\//.test(String(g.url || '')) ? String(g.url) : '',
        pgn: g.pgn, endTime: g.end_time, usernames: [name],
      }));
      lastEnd = Number(g.end_time);
    }
    if (games.length >= limit) { exhausted = false; break; }
  }
  return { games, cursor: { beforeEndTime: lastEnd }, exhausted };
}

/**
 * Lichess page, newest first. cursor: { untilMs }. Uses the seconds-precision UTC headers to advance.
 */
export async function fetchLichessPage(username, cursor = {}, limit = 20, fetchImpl = fetch) {
  const name = cleanUsername(username);
  if (!name) throw new SourceError('bad_username', 'invalid username');
  const params = new URLSearchParams({ max: String(Math.max(1, Math.min(50, limit))), clocks: 'true', evals: 'false', opening: 'false' });
  if (Number(cursor?.untilMs) > 0) params.set('until', String(Math.floor(Number(cursor.untilMs))));
  const url = 'https://lichess.org/api/games/user/' + encodeURIComponent(name) + '?' + params.toString();
  const text = await (await getResponse(fetchImpl, url, 'application/x-chess-pgn')).text();
  const chunks = text.trim() ? text.trim().split(/(?=^\[Event\s)/m).map((s) => s.trim()).filter((s) => /^\[Event\s/m.test(s)) : [];
  const games = [];
  let untilMs = Number(cursor?.untilMs) || 0;
  for (const pgn of chunks) {
    const headers = parseHeaders(pgn);
    const id = (String(headers.Site || '').match(/lichess\.org\/([A-Za-z0-9]{8})/) || [])[1];
    const stamp = Date.parse(String(headers.UTCDate || '').replace(/\./g, '-') + 'T' + String(headers.UTCTime || '00:00:00') + 'Z');
    const game = buildGame({ provider: 'lichess', key: id ? 'lichess:' + id : 'lichess:' + pgnHash(pgn), url: id ? 'https://lichess.org/' + id : '', pgn, endTime: Number.isFinite(stamp) ? Math.floor(stamp / 1000) : 0, usernames: [name] });
    games.push(game);
    if (Number.isFinite(stamp)) untilMs = untilMs ? Math.min(untilMs, stamp - 1) : stamp - 1;
  }
  return { games, cursor: { untilMs }, exhausted: chunks.length < Math.max(1, Math.min(50, limit)) };
}

/**
 * The user's own saved games (table user_games). `db(path)` is a supabaseRequest-like function.
 * cursor: { offset }. usernames come from the user's app state; without them colour is unresolved.
 */
export async function fetchSavedPage(db, userId, usernames, cursor = {}, limit = 20) {
  const offset = Math.max(0, Number(cursor?.offset) || 0);
  const rows = await db(`user_games?select=id,pgn,meta,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&offset=${offset}&limit=${limit}`);
  const list = Array.isArray(rows) ? rows : [];
  const games = list.filter((r) => typeof r?.pgn === 'string').map((r) => buildGame({
    provider: 'saved', key: 'saved:' + pgnHash(r.pgn), url: '', pgn: r.pgn,
    endTime: Date.parse(r.created_at) / 1000, usernames,
  }));
  return { games, cursor: { offset: offset + list.length }, exhausted: list.length < limit };
}
