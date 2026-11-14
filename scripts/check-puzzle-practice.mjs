// "אימון אישי" practice: a wrong try does not spoil the answer, a correct move gets a "נכון!" that stays,
// "נסה שוב" keeps the same puzzle, and the place in the kit survives leaving the page.
// Before this fix: one wrong move printed the answer, a solve jumped to the next puzzle after 1 s
// (which looked like "נסה שוב" skipping ahead), and leaving the page restarted the kit at 1.
// Browser version: scripts/check-puzzle-practice-browser.mjs (needs Playwright). Run after `tsc -p tsconfig.json`.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { PuzzleData, sessionKey } = await import(pathToFileURL(join(root, 'dist', 'src', 'puzzle', 'data.js')).href);
const view = await readFile(join(root, 'src', 'puzzle', 'personal-view.ts'), 'utf8');
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${ok ? '' : ' ' + detail}`); if (!ok) failed++; };
const safe = (fn) => { try { return fn(); } catch (e) { return { error: e.message }; } };

const mem = new Map();
const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const make = (userId) => new PuzzleData({ userId, api: {}, storage, uuid: () => 'u' });
const a = make('user-a');
safe(() => a.writeSession('kit-1', 4, 3, false));
check('the place in a kit is stored for this user', typeof sessionKey === 'function' && mem.has(sessionKey('user-a')), JSON.stringify([...mem.keys()]));
const back = safe(() => make('user-a').readSession('kit-1'));
check('coming back to the same kit restores the place and the score', back && back.idx === 4 && back.solved === 3 && back.answered === false, JSON.stringify(back));
check('a new kit starts from the beginning', safe(() => a.readSession('kit-2')) === null);
check('another user does not get this user\'s place', safe(() => make('user-b').readSession('kit-1')) === null);
mem.set(sessionKey ? sessionKey('user-a') : 'x', '{"kitId":"kit-1","idx":2,"solved":99}');
check('a corrupt score is clamped', safe(() => a.readSession('kit-1'))?.solved === 3);
mem.set(sessionKey ? sessionKey('user-a') : 'x', 'not json');
check('unreadable storage is ignored', safe(() => a.readSession('kit-1')) === null);

const onMove = view.slice(view.indexOf('function onMove('), view.indexOf('function retry('));
check('a correct move does not jump to the next puzzle by itself', /verdict === 'correct'/.test(onMove) && !/setTimeout\(next/.test(onMove));
check('a correct move says "נכון!"', /text: j\.viaAlt \? 'נכון! [^']*' : 'נכון!'/.test(onMove));
check('the first wrong move says "try again" and does not reveal the answer', /misses >= 1 \? 'לא מדויק\. המהלך הנכון: ' \+ sanFor\(cur\.fen, cur\.solution\[0\]\) : 'לא המהלך הזה\. נסה שוב\.'/.test(onMove));
check('the answer is one tap away ("הצג פתרון")', /onClick: reveal \}, 'הצג פתרון'/.test(view));
check('"נסה שוב" keeps the same puzzle', /function retry\(\) \{ setFb\(null\); setLocked\(false\);[^}]*\}/.test(view) && !/function retry\(\)[^\n]*setIdx/.test(view));
check('the kit place is restored on load and saved as it changes', /data\.readSession\(kitId\)/.test(view) && /data\.writeSession\(kitId, idx, solved, answered\.current\)/.test(view));

if (failed) { console.log(`FAIL: ${failed} puzzle practice check(s) failed.`); process.exit(1); }
console.log('PASS: puzzle practice keeps the puzzle on a miss, shows "נכון!", and keeps its place.');
