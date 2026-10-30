// Offline tests for netlify/functions/lib/puzzle-sources.mjs (recorded JSON/PGN, injected fetch).
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const S = await import(pathToFileURL(join(root, 'netlify/functions/lib/puzzle-sources.mjs')).href);

const pgn = (white, black, extra = '', moves = '1. e4 {[%clk 0:03:00]} e5 {[%clk 0:02:58.5]} 2. Nf3 {[%clk 0:02:59]} Nc6 {[%clk 0:00:09.5]} 1-0') =>
  `[Event "Live Chess"]\n[Site "Chess.com"]\n[White "${white}"]\n[Black "${black}"]\n[TimeControl "180"]\n[UTCDate "2026.10.01"]\n${extra}\n${moves}`;

// headers + colour
const h = S.parseHeaders(pgn('Oren', 'Rival'));
assert.equal(h.White, 'Oren');
assert.equal(S.resolveUserColor(h, ['oren']), 'w');
assert.equal(S.resolveUserColor(S.parseHeaders(pgn('Rival', 'OREN')), ['oren']), 'b');
assert.equal(S.resolveUserColor(h, ['someone-else']), null, 'unmatched name must not default');
assert.equal(S.resolveUserColor(S.parseHeaders(pgn('oren', 'Oren')), ['oren']), null, 'both sides match => unresolved');
assert.equal(S.resolveUserColor(h, []), null);

// clocks and time class
assert.deepEqual(S.extractClocks(pgn('a', 'b')), [180, 178.5, 179, 9.5]);
assert.equal(S.timeClassOf({ TimeControl: '180' }), 'blitz');
assert.equal(S.timeClassOf({ TimeControl: '60' }), 'bullet');
assert.equal(S.timeClassOf({ TimeControl: '600+5' }), 'rapid');
assert.equal(S.timeClassOf({ TimeControl: '1/86400' }), 'daily');

// username cleaning
assert.equal(S.cleanUsername(' ok_name '), 'ok_name');
assert.equal(S.cleanUsername('a/b'), '');
assert.equal(S.cleanUsername('x'.repeat(65)), '');

const reply = (body, status = 200, text = false) => async () => ({
  ok: status >= 200 && status < 300, status,
  json: async () => body, text: async () => (text ? body : JSON.stringify(body)),
});

// Chess.com: two monthly archives, newest first, cursor paging
const calls = [];
const chessCom = async (url) => {
  calls.push(url);
  if (url.endsWith('/games/archives')) return reply({ archives: ['https://api.chess.com/pub/player/oren/games/2026/09', 'https://api.chess.com/pub/player/oren/games/2026/10'] })();
  if (url.endsWith('/2026/10')) return reply({ games: [
    { url: 'https://www.chess.com/game/live/3', end_time: 1790000300, pgn: pgn('Oren', 'R3') },
    { url: 'https://www.chess.com/game/live/2', end_time: 1790000200, pgn: pgn('R2', 'oren') },
    { url: 'https://www.chess.com/game/live/x', end_time: 1790000250, pgn: undefined },
  ] })();
  if (url.endsWith('/2026/09')) return reply({ games: [{ url: 'https://www.chess.com/game/live/1', end_time: 1780000000, pgn: pgn('Nobody', 'R1') }] })();
  throw new Error('unexpected ' + url);
};
let page = await S.fetchChessComPage('oren', {}, 2, chessCom);
assert.deepEqual(page.games.map((g) => g.key), ['chesscom:https://www.chess.com/game/live/3', 'chesscom:https://www.chess.com/game/live/2']);
assert.deepEqual(page.games.map((g) => g.userColor), ['w', 'b']);
assert.equal(page.games[1].opponent, 'R2');
assert.equal(page.exhausted, false);
assert.equal(page.cursor.beforeEndTime, 1790000200);
page = await S.fetchChessComPage('oren', page.cursor, 5, chessCom);
assert.equal(page.games.length, 1);
assert.equal(page.games[0].userColor, null, 'user not in game => unresolved');
assert.equal(page.exhausted, true);

// errors
await assert.rejects(S.fetchChessComPage('oren', {}, 5, reply({}, 429)), (e) => e.code === 'rate_limited');
await assert.rejects(S.fetchChessComPage('oren', {}, 5, reply({}, 404)), (e) => e.code === 'not_found');
await assert.rejects(S.fetchChessComPage('oren', {}, 5, reply({}, 500)), (e) => e.code === 'provider_error');
await assert.rejects(S.fetchChessComPage('oren', {}, 5, async () => { throw new Error('boom'); }), (e) => e.code === 'network');
await assert.rejects(S.fetchChessComPage('bad name', {}, 5, chessCom), (e) => e.code === 'bad_username');
await assert.rejects(S.fetchLichessPage('', {}, 5, chessCom), (e) => e.code === 'bad_username');

// Lichess: PGN stream, cursor from the seconds-precision UTC headers
const li = (id, w, b, time) => `[Event "Rated Blitz game"]\n[Site "https://lichess.org/${id}"]\n[White "${w}"]\n[Black "${b}"]\n[UTCDate "2026.10.02"]\n[UTCTime "${time}"]\n[TimeControl "300+0"]\n[Variant "Standard"]\n\n1. e4 e5 *\n\n`;
let lichessUrl = '';
const lichess = async (url) => { lichessUrl = url; return reply(li('abcd1234', 'Oren', 'X', '10:00:00') + li('efgh5678', 'Y', 'oren', '09:00:00'), 200, true)(); };
const lp = await S.fetchLichessPage('Oren', {}, 2, lichess);
assert.deepEqual(lp.games.map((g) => g.key), ['lichess:abcd1234', 'lichess:efgh5678']);
assert.deepEqual(lp.games.map((g) => g.userColor), ['w', 'b']);
assert.equal(lp.games[0].url, 'https://lichess.org/abcd1234');
assert.equal(lp.cursor.untilMs, Date.parse('2026-10-02T09:00:00Z') - 1);
assert.equal(lp.exhausted, false);
await S.fetchLichessPage('Oren', lp.cursor, 2, lichess);
assert.ok(lichessUrl.includes('until=' + lp.cursor.untilMs), 'cursor must be sent as until=');
assert.ok(lichessUrl.includes('clocks=true'));
const empty = await S.fetchLichessPage('Oren', {}, 5, reply('', 200, true));
assert.equal(empty.games.length, 0);
assert.equal(empty.exhausted, true);

// variants are surfaced, not hidden
const v = await S.fetchLichessPage('Oren', {}, 5, reply(li('zzzz0000', 'Oren', 'X', '08:00:00').replace('Standard', 'Chess960'), 200, true));
assert.equal(v.games[0].variant, 'Chess960');

// saved games
const dbCalls = [];
const db = async (path) => { dbCalls.push(path); return [{ id: 1, pgn: pgn('Oren', 'R'), created_at: '2026-10-01T00:00:00Z' }, { id: 2, pgn: pgn('A', 'Oren'), created_at: '2026-09-30T00:00:00Z' }]; };
const sp = await S.fetchSavedPage(db, 'user-1', ['oren'], { offset: 4 }, 2);
assert.deepEqual(sp.games.map((g) => g.userColor), ['w', 'b']);
assert.ok(dbCalls[0].includes('offset=4') && dbCalls[0].includes('limit=2') && dbCalls[0].includes('user_id=eq.user-1'));
assert.equal(sp.cursor.offset, 6);
assert.equal(sp.exhausted, false);
assert.match(sp.games[0].key, /^saved:[0-9a-f]{16}$/);
const unresolved = await S.fetchSavedPage(db, 'user-1', [], {}, 5);
assert.deepEqual(unresolved.games.map((g) => g.userColor), [null, null]);

console.log('PASS: puzzle sources (strict colour, clocks, paging, 429/404/network/variant) with recorded data, no network.');
