// Games and ratings stay with the signed-in account across Logout -> Login (and on another device).
// Before this fix: the archive game list (with each game's ratings) lived only in the browser, and a review
// kept only its accuracy, so signing in again showed an empty archive and the review's ratings were gone.
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { sanitizeAppState, mergeAppStateData } from '../netlify/functions/sync.mjs';

const source = await readFile('src/account-sync.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { normalizeAccountState, mergeAccountState } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const main = await readFile('src/main.ts', 'utf8');
const puzzles = await readFile('src/puzzle-page.ts', 'utf8');

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${ok ? '' : ' ' + detail}`); if (!ok) failed++; };
const safe = (fn) => { try { return fn(); } catch (e) { return { error: e.message }; } };
const at = '2026-11-10T13:29:51.755Z';
const review = { accuracy: 74.1, reviewedAt: at, rating: 1205, opponentRating: 1435 };
const archive = { provider: 'chesscom', username: 'orenzbit' };

// 1. Server keeps what the account must remember.
const server = safe(() => sanitizeAppState({ archiveReviews: { g1: review, bad: { accuracy: 50, reviewedAt: at, rating: 99999, opponentRating: 'x' } }, usernames: { chesscom: 'orenzbit' }, archive, puzzleBestStreak: 7 })) || {};
check('server keeps a review\'s ratings (not only accuracy)', server.archiveReviews?.g1?.rating === 1205 && server.archiveReviews?.g1?.opponentRating === 1435, JSON.stringify(server.archiveReviews?.g1));
check('server drops impossible ratings but keeps the review', server.archiveReviews?.bad?.accuracy === 50 && server.archiveReviews?.bad?.rating === undefined && server.archiveReviews?.bad?.opponentRating === undefined, JSON.stringify(server.archiveReviews?.bad));
check('server keeps which game list the account loaded (provider + username)', JSON.stringify(server.archive) === JSON.stringify(archive), JSON.stringify(server.archive));
check('server rejects a bad game-list source', safe(() => sanitizeAppState({ archive: { provider: 'evil', username: 'x' } }))?.archive === undefined);
check('server keeps the puzzle best streak', server.puzzleBestStreak === 7, String(server.puzzleBestStreak));

// 2. A partial save from an older screen (the review save sends no list source) must not erase it.
const kept = safe(() => mergeAppStateData(server, { archiveReviews: {}, usernames: { chesscom: 'orenzbit' }, puzzleBestStreak: 3 })) || {};
check('a later save without the list source keeps the stored list source', JSON.stringify(kept.archive) === JSON.stringify(archive), JSON.stringify(kept.archive));
check('a lower puzzle best streak never overwrites a higher one', kept.puzzleBestStreak === 7, String(kept.puzzleBestStreak));
check('a later save keeps the stored review ratings', kept.archiveReviews?.g1?.rating === 1205, JSON.stringify(kept.archiveReviews?.g1));

// 3. The browser side merges the same way on sign-in (fresh device: empty local state).
const merged = safe(() => mergeAccountState(normalizeAccountState({}), server)) || {};
check('sign-in on a fresh device restores the review ratings', merged.archiveReviews?.g1?.rating === 1205 && merged.archiveReviews?.g1?.opponentRating === 1435, JSON.stringify(merged.archiveReviews?.g1));
check('sign-in on a fresh device restores the game list source', JSON.stringify(merged.archive) === JSON.stringify(archive), JSON.stringify(merged.archive));
check('sign-in on a fresh device restores the puzzle best streak', merged.puzzleBestStreak === 7, String(merged.puzzleBestStreak));

// 4. The app wires it: remember the source, reload the list on sign-in, save ratings, show them.
check('loading the archive records its source for the account', /setArchiveSource\(\{provider:archiveProvider,username:currentUsername\}\)/.test(main));
check('the account save sends the list source and puzzle best streak', /appState=\{version:1,archiveReviews,[^}]*\},archive:archiveSource[^;]*puzzleBestStreak/.test(main));
check('sign-in reloads the stored game list when none is shown', /merged\.archive\?\.username&&!archiveGames\.length[^;]*fetchArchiveGames\(merged\.archive\.provider,merged\.archive\.username,100\)/.test(main));
check('a finished review saves the player\'s and opponent\'s ratings', /\[activeArchiveGame\.id\]:\{accuracy,reviewedAt:[^}]*,rating:[^}]*opponentRating:/.test(main));
check('the archive card shows the saved rating', /archive-accuracy-badge[^;]*archiveReviews\[g\.id\]\.rating/.test(main));
check('a new puzzle best streak is handed to the account sync', /veyra-puzzle-best/.test(puzzles) && /addEventListener\('veyra-puzzle-best'/.test(main));

if (failed) { console.log(`FAIL: ${failed} persistence check(s) failed.`); process.exit(1); }
console.log('PASS: games, ratings and puzzle best streak are stored with the account and restored on sign-in.');
