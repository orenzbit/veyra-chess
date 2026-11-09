// Loading a big game archive must not freeze the page: run by npm run check:release (check-archive-load.mjs)
// The DNA scan asks fetchArchiveGames for up to 1000 games. Listing them must not replay every game
// on the UI thread (measured on orenzbit's chess.com month: ~93 ms per game -> ~90 s frozen for 1000).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { Chess } from '../rules-src/chess-compat.mjs';

globalThis.window = { ChessLib: { Chess } };
const source = await readFile('src/game-archive.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const archive = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

// A real-length blitz game with clock comments, as chess.com sends it.
const moves = '1. e4 {[%clk 0:02:59.9]} 1... c5 {[%clk 0:02:59.1]} 2. Nf3 {[%clk 0:02:58.7]} 2... d6 {[%clk 0:02:57.5]} 3. d4 {[%clk 0:02:57.9]} 3... cxd4 {[%clk 0:02:56.8]} 4. Nxd4 {[%clk 0:02:57.2]} 4... Nf6 {[%clk 0:02:55.9]} 5. Nc3 {[%clk 0:02:56.4]} 5... a6 {[%clk 0:02:54.7]} 6. Be3 {[%clk 0:02:55.1]} 6... e5 {[%clk 0:02:53.0]} 7. Nb3 {[%clk 0:02:54.0]} 7... Be6 {[%clk 0:02:51.2]} 8. f3 {[%clk 0:02:53.2]} 8... Be7 {[%clk 0:02:49.8]} 9. Qd2 {[%clk 0:02:52.1]} 9... O-O {[%clk 0:02:48.0]} 10. O-O-O {[%clk 0:02:50.9]} 10... Nbd7 {[%clk 0:02:46.2]} 11. g4 {[%clk 0:02:49.5]} 11... b5 {[%clk 0:02:44.1]} 12. g5 {[%clk 0:02:48.3]} 12... b4 {[%clk 0:02:41.9]} 13. Ne2 {[%clk 0:02:46.0]} 13... Ne8 {[%clk 0:02:39.0]} 14. f4 {[%clk 0:02:44.2]} 14... a5 {[%clk 0:02:36.5]} 15. f5 {[%clk 0:02:42.9]} 15... Bxb3 {[%clk 0:02:34.0]} 16. cxb3 {[%clk 0:02:41.5]} 16... a4 {[%clk 0:02:31.1]} 17. bxa4 {[%clk 0:02:39.8]} 17... Rxa4 {[%clk 0:02:29.7]} 18. Kb1 {[%clk 0:02:37.6]} 18... Nc5 {[%clk 0:02:27.2]} 19. Bxc5 {[%clk 0:02:35.1]} 19... dxc5 {[%clk 0:02:25.0]} 20. Qd5 {[%clk 0:02:33.3]} 20... Qxd5 {[%clk 0:02:22.8]} 21. Rxd5 {[%clk 0:02:31.9]} 21... Nd6 {[%clk 0:02:20.1]} 22. Ng3 {[%clk 0:02:29.0]} 22... Rfa8 {[%clk 0:02:17.3]} 23. a3 {[%clk 0:02:27.4]} 23... bxa3 {[%clk 0:02:15.0]} 24. bxa3 {[%clk 0:02:25.8]} 24... Rxa3 {[%clk 0:02:12.9]} 25. Bd3 {[%clk 0:02:23.1]} 25... c4 {[%clk 0:02:10.0]} 0-1';
const pgn = (i) => `[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2026.10.${String(1 + (i % 28)).padStart(2, '0')}"]\n[White "Orenzbit"]\n[Black "Opponent${i}"]\n[Result "0-1"]\n[TimeControl "180"]\n[Termination "Opponent${i} won by resignation"]\n\n${moves}`;
const month = Array.from({ length: 1000 }, (_, i) => ({ pgn: pgn(i), url: `https://www.chess.com/game/live/${1000 + i}`, end_time: 1790000000 + i, time_class: 'blitz', time_control: '180', white: { username: 'Orenzbit', rating: 1500, result: 'resigned' }, black: { username: `Opponent${i}`, rating: 1500, result: 'win' } }));
globalThis.fetch = async (url) => String(url).endsWith('/games/archives')
  ? new Response(JSON.stringify({ archives: ['https://api.chess.com/pub/player/orenzbit/games/2026/10'] }), { status: 200 })
  : new Response(JSON.stringify({ games: month }), { status: 200 });

const t0 = performance.now();
const result = await archive.fetchArchiveGames('chesscom', 'orenzbit', 1000);
const ms = Math.round(performance.now() - t0);
const replay = new Chess(); replay.loadPgn(pgn(0), { sloppy: true });
const expected = Math.ceil(replay.history().length / 2);
let failures = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` (${detail})` : ''}`); if (!ok) failures += 1; };
check('1000 chess.com games are listed', result.games.length === 1000, String(result.games.length));
check('listing 1000 games takes under 1.5 s (no full replay per game on the UI thread)', ms < 1500, `${ms} ms`);
check('move count still matches a full replay', result.games.every((g) => g.moveCount === expected), `expected ${expected}, got ${result.games[0]?.moveCount}`);
const tricky = '[Event "x"]\n[White "A"]\n[Black "B"]\n\n1. e4 $1 (1. d4 d5 (1... Nf6) 2. c4) 1... e5 {a comment with 2. Nf3 inside} 2. Nf3; rest of line\n2... Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5 Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6 23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5 hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5 35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6 Nf2 42. g4 Bd3 43. Re6 1/2-1/2';
check('comments, variations, NAGs and ;-comments are not counted as moves', (() => { const r = new Chess(); r.loadPgn(tricky, { sloppy: true }); return archive.countPgnMoves?.(tricky) === Math.ceil(r.history().length / 2); })(), `countPgnMoves=${archive.countPgnMoves?.(tricky)}`);

// A refresh must not empty the archive: the last list is kept in this tab, per account/provider/username.
const store = new Map(); globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
archive.saveArchiveCache?.('user-a', 'chesscom', 'Orenzbit', result.games.slice(0, 100));
check('after a refresh the same account sees its last loaded games', archive.loadArchiveCache?.('user-a', 'chesscom', 'orenzbit').length === 100);
check('another account in the same tab sees nothing', archive.loadArchiveCache?.('user-b', 'chesscom', 'orenzbit').length === 0);
check('another username or provider sees nothing', archive.loadArchiveCache?.('user-a', 'chesscom', 'someone').length === 0 && archive.loadArchiveCache?.('user-a', 'lichess', 'orenzbit').length === 0);
if (failures) { console.log(`FAIL: ${failures} archive load check(s) failed.`); process.exit(1); }
console.log('PASS: a 1000-game archive loads without replaying every game on the UI thread, and a refresh keeps the list.');
