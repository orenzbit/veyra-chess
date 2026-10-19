import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/game-archive.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { fetchArchiveGames } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /^https:\/\/lichess\.org\/api\/games\/user\/TestUser\?/);
    assert.equal(options.headers.Accept, 'application/x-chess-pgn');
    return new Response([
      '[Event "Casual Blitz game"]',
      '[Site "https://lichess.org/abc123"]',
      '[Date "2026.10.18"]',
      '[White "TestUser"]',
      '[Black "Opponent"]',
      '[Result "1-0"]',
      '[TimeControl "180+2"]',
      '',
      '1. e4 e5 2. Nf3 Nc6 1-0',
    ].join('\n'), { status: 200 });
  };
  const result = await fetchArchiveGames('lichess', 'TestUser');
  assert.equal(result.games.length, 1);
  assert.equal(result.games[0].source, 'lichess');
  assert.equal(result.games[0].playerColor, 'white');
  assert.equal(result.games[0].opponent, 'Opponent');
  assert.equal(result.games[0].result, 'win');
  assert.equal(result.games[0].date, '2026-10-18');
  assert.equal(result.games[0].timeControlLabel, '3+2');
  assert.equal(result.games[0].url, 'https://lichess.org/abc123');

  globalThis.fetch = async () => new Response('not found', { status: 404 });
  await assert.rejects(() => fetchArchiveGames('lichess', 'MissingUser'), /לא נמצא ב-Lichess/);

  globalThis.fetch = async () => new Response('slow down', { status: 429 });
  await assert.rejects(() => fetchArchiveGames('lichess', 'TestUser'), /הגבילה זמנית/);

  await assert.rejects(() => fetchArchiveGames('lichess', 'bad user'), /תווים לא צפויים/);
  await assert.rejects(() => fetchArchiveGames('lichess', ''), /הכנס שם משתמש/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('PASS: archive provider contract and failure handling.');
