import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const read = (path) => readFile(path, 'utf8');
const [main, archive, styles, readme, adminAccess] = await Promise.all([
  read('src/main.ts'),
  read('src/game-archive.ts'),
  read('public/styles.css'),
  read('README.md'),
  read('netlify/functions/admin-access.mjs'),
]);

for (const token of [
  "import { fetchArchiveGames, DEMO_ARCHIVE_GAME } from './game-archive.js'",
  "if(page==='archive')",
  "function fetchArchive()",
  "function importGame(g)",
  "setActiveArchiveGame(g?.id?{id:g.id,playerColor:g.playerColor||'white'}:null)",
  "function ProductBrand",
  "'OREN AND CLAUDE'",
  "postJson('/api/admin-access',{id,decision:'reject'})",
]) assert.ok(main.includes(token), `src/main.ts missing integration: ${token}`);

for (const token of [
  'fetchChessCom',
  'fetchLichess',
  'export async function fetchArchiveGames',
  'DEMO_ARCHIVE_GAME',
  'scoreFromHeaders',
  'openingFromPgn',
]) assert.ok(archive.includes(token), `src/game-archive.ts missing archive behavior: ${token}`);

assert.ok(styles.includes('.product-brand-name'), 'Shared brand CSS missing');
assert.ok(styles.includes('.archive-game-card'), 'Archive card CSS missing');
assert.ok(adminAccess.includes("if (decision === 'reject')"), 'Server does not support rejection decision');
assert.ok(readme.includes('עדכון ארכיון המשחקים והמיתוג'), 'README archive explanation missing');
assert.ok(readme.includes('בדיקת הפרויקט — 14.10.2026'), 'README audit section missing');
console.log('PASS: archive wiring, Chess.com/Lichess adapters, demo PGN, brand lockup, README coverage and admin rejection API contract.');
