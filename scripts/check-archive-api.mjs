import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { Chess } from '../rules-src/chess-compat.mjs';

// The archive module reads the global chess API used by the app. Mirror that in Node so
// normalization (move counts, SAN replay) is exercised, not just the fetch plumbing.
globalThis.window = { ChessLib: { Chess } };

const source = await readFile('src/game-archive.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { fetchArchiveGames, DEMO_ARCHIVE_GAME } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const restore = () => { globalThis.fetch = originalFetch; globalThis.window = originalWindow; };

const lichessPgn = (white, black, date, result, moves, extraHeaders = []) => [
  `[Event "Rated Blitz game"]`,
  `[Site "https://lichess.org/${white}${date.replace(/\./g, '')}"]`,
  `[Date "${date}"]`,
  `[White "${white}"]`,
  `[Black "${black}"]`,
  `[Result "${result}"]`,
  `[TimeControl "180+2"]`,
  ...extraHeaders,
  '',
  moves,
].join('\n');

try {
  // --- Lichess: successful normalization ------------------------------------------------
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /^https:\/\/lichess\.org\/api\/games\/user\/TestUser\?/);
    assert.equal(options.headers.Accept, 'application/x-chess-pgn');
    assert.match(String(url), /clocks=true/);
    return new Response(lichessPgn('TestUser', 'Opponent', '2026.10.18', '1-0', '1. e4 e5 2. Nf3 Nc6 1-0'), { status: 200 });
  };
  const result = await fetchArchiveGames('lichess', 'TestUser');
  assert.equal(result.games.length, 1);
  assert.equal(result.games[0].source, 'lichess');
  assert.equal(result.games[0].playerColor, 'white');
  assert.equal(result.games[0].opponent, 'Opponent');
  assert.equal(result.games[0].result, 'win');
  assert.equal(result.games[0].date, '2026-10-18');
  assert.equal(result.games[0].timeControlLabel, '3+2');
  assert.equal(result.games[0].timeClass, 'blitz');
  assert.equal(result.games[0].moveCount, 2);
  assert.equal(result.games[0].url, 'https://lichess.org/TestUser20261018');
  console.log('PASS: Lichess PGN is normalized (players, result, date, clock, move count).');

  // Multi-game payload, missing Opening header and missing clock annotations.
  globalThis.fetch = async () => new Response([
    lichessPgn('TestUser', 'A', '2026.10.17', '0-1', '1. d4 d5 2. c4 e6 0-1'),
    lichessPgn('B', 'TestUser', '2026.10.16', '1/2-1/2', '1. Nf3 Nf6 1/2-1/2'),
  ].join('\n\n'), { status: 200 });
  const multi = await fetchArchiveGames('lichess', 'TestUser');
  assert.equal(multi.games.length, 2);
  assert.equal(multi.games[0].playerColor, 'white');
  assert.equal(multi.games[0].result, 'loss');
  assert.equal(multi.games[0].moveCount, 2);
  assert.equal(multi.games[1].playerColor, 'black');
  assert.equal(multi.games[1].result, 'draw');
  assert.ok(multi.games[0].opening.length > 0, 'missing Opening header must fall back to a label');
  assert.ok(multi.games[0].finishReason.length > 0);
  console.log('PASS: Lichess multi-game PGN without Opening/clk normalizes safely.');

  // Empty body: a public account with no games is not an error.
  globalThis.fetch = async () => new Response('', { status: 200 });
  const empty = await fetchArchiveGames('lichess', 'TestUser');
  assert.deepEqual(empty.games, []);
  console.log('PASS: empty Lichess archive returns zero games without throwing.');

  // --- Provider failures ----------------------------------------------------------------
  const rejectsWith = async (status, body = 'error') => {
    globalThis.fetch = async () => new Response(body, { status });
    try {
      await fetchArchiveGames('lichess', 'TestUser');
    } catch (error) {
      return String(error.message || '');
    }
    throw new Error(`expected a rejection for HTTP ${status}`);
  };
  const notFound = await rejectsWith(404, 'not found');
  const throttled = await rejectsWith(429, 'slow down');
  assert.ok(/Lichess/.test(notFound) && notFound.length > 0);
  assert.ok(/Lichess/.test(throttled) && throttled.length > 0);
  assert.notEqual(notFound, throttled, '404 and 429 must be distinguishable to the user');
  const serverError = await rejectsWith(503, 'down');
  assert.match(serverError, /HTTP 503/);
  console.log('PASS: Lichess 404/429/5xx produce distinct, actionable errors.');

  // Network failure (fetch rejects) is reported as a connection problem.
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(() => fetchArchiveGames('lichess', 'TestUser'), (error) => error.message.length > 0);
  console.log('PASS: network failure for Lichess is reported, not swallowed.');

  // --- Chess.com ------------------------------------------------------------------------
  const userAgent = 'https://api.chess.com/pub/player/TestUser';
  const monthlyUrl = userAgent + '/games/2026/10';
  const chessComGame = {
    url: 'https://www.chess.com/game/live/123',
    pgn: '[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2026.10.18"]\n[White "TestUser"]\n[Black "Opponent"]\n[Result "0-1"]\n[WhiteElo "1500"]\n[BlackElo "1520"]\n[TimeControl "300"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 0-1',
    time_control: '300',
    end_time: 1760800000,
    time_class: 'blitz',
    white: { username: 'TestUser', rating: 1500, result: 'checkmated' },
    black: { username: 'Opponent', rating: 1520, result: 'win' },
  };
  const seen = [];
  globalThis.fetch = async (url, options) => {
    seen.push(String(url));
    assert.equal(options.headers.Accept, 'application/json');
    if (String(url) === userAgent + '/games/archives') return new Response(JSON.stringify({ archives: [monthlyUrl] }), { status: 200 });
    if (String(url) === monthlyUrl) return new Response(JSON.stringify({ games: [chessComGame] }), { status: 200 });
    throw new Error('unexpected URL ' + url);
  };
  const cc = await fetchArchiveGames('chesscom', 'TestUser');
  assert.deepEqual(seen, [userAgent + '/games/archives', monthlyUrl]);
  assert.equal(cc.games.length, 1);
  assert.equal(cc.games[0].source, 'chesscom');
  assert.equal(cc.games[0].playerColor, 'white');
  assert.equal(cc.games[0].result, 'loss');
  assert.equal(cc.games[0].opponentRating, 1520);
  assert.equal(cc.games[0].userRating, 1500);
  assert.equal(cc.games[0].timeControlLabel, '5+0');
  assert.equal(cc.games[0].moveCount, 3);
  assert.equal(cc.games[0].date, new Date(1760800000 * 1000).toISOString().slice(0, 10));
  console.log('PASS: Chess.com archives are followed and normalized (ratings, result, time control).');

  // No archives yet: an empty, successful response.
  globalThis.fetch = async () => new Response(JSON.stringify({ archives: [] }), { status: 200 });
  const noArchives = await fetchArchiveGames('chesscom', 'TestUser');
  assert.deepEqual(noArchives.games, []);
  console.log('PASS: Chess.com account without archives returns zero games.');

  // A failing month is downgraded to a warning; a fully failing archive still surfaces an error.
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/games/archives')) return new Response(JSON.stringify({ archives: [monthlyUrl] }), { status: 200 });
    return new Response('boom', { status: 500 });
  };
  await assert.rejects(() => fetchArchiveGames('chesscom', 'TestUser'), (error) => /HTTP 500/.test(error.message));
  console.log('PASS: Chess.com monthly archive failure surfaces an error when nothing loaded.');

  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/games/archives')) return new Response(JSON.stringify({ archives: [monthlyUrl, monthlyUrl + 'b'] }), { status: 200 });
    if (String(url).endsWith('b')) return new Response(JSON.stringify({ games: [chessComGame] }), { status: 200 });
    return new Response('boom', { status: 500 });
  };
  const partial = await fetchArchiveGames('chesscom', 'TestUser');
  assert.equal(partial.games.length, 1);
  assert.ok(partial.warning.length > 0, 'partial archive load must warn the user');
  console.log('PASS: Chess.com partial archive failure keeps the loaded games and warns.');

  // Rate limiting across months aborts instead of silently returning stale data.
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/games/archives')) return new Response(JSON.stringify({ archives: [monthlyUrl + 'c'] }), { status: 200 });
    return new Response('slow down', { status: 429 });
  };
  await assert.rejects(() => fetchArchiveGames('chesscom', 'TestUser'), (error) => error.message.length > 0);
  console.log('PASS: Chess.com rate limiting aborts the import.');

  // --- Input validation ------------------------------------------------------------------
  await assert.rejects(() => fetchArchiveGames('lichess', 'bad user'), (error) => error.message.length > 0);
  await assert.rejects(() => fetchArchiveGames('lichess', ''), (error) => error.message.length > 0);
  await assert.rejects(() => fetchArchiveGames('lichess', 'a'.repeat(65)), (error) => error.message.length > 0);
  await assert.rejects(() => fetchArchiveGames('lichess', 'user/name'), (error) => error.message.length > 0);
  console.log('PASS: usernames with spaces, slashes, empty or over-long values are rejected before any request.');

  // --- Demo game used by the archive UI --------------------------------------------------
  const demo = new Chess();
  demo.loadPgn(DEMO_ARCHIVE_GAME.pgn, { sloppy: true });
  assert.equal(demo.history().at(-1), 'Qxf7#');
  assert.equal(demo.isCheckmate(), true);
  assert.equal(DEMO_ARCHIVE_GAME.result, 'loss');
  console.log('PASS: bundled demo game loads, ends in mate and matches its metadata.');
} finally {
  restore();
}

console.log('PASS: archive provider contract and failure handling.');
