import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { deflateSync } from 'node:zlib';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const checkOnly = process.argv.includes('--check');
const inputPath = resolve(arg('input', 'artifacts/legends-tournament/games.jsonl'));
const summaryPath = resolve(arg('summary', 'artifacts/legends-tournament/summary.json'));
const phase = arg('phase', 'pre-merge');
assert.ok(['pre-merge', 'post-merge'].includes(phase), 'phase must be pre-merge or post-merge');
if (checkOnly) {
  const readme = await readFile(resolve('README.md'), 'utf8');
  assert.ok(readme.includes(`<!-- legends-tournament:${phase}:start -->`) && readme.includes(`<!-- legends-tournament:${phase}:end -->`), 'README gallery markers are missing');
  for (const releasePhase of ['pre-merge', 'post-merge']) assert.ok(readme.includes(`<!-- legends-release-status:${releasePhase}:start -->`) && readme.includes(`<!-- legends-release-status:${releasePhase}:end -->`), 'README release status markers are missing for ' + releasePhase);
  console.log('PASS: tournament evidence renderer and README markers are available.');
  process.exit(0);
}
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
assert.equal(summary.status, 'passed', 'Refusing to publish images for a tournament that did not pass');
assert.equal(summary.failedGames, 0, 'Tournament has failed games');
assert.equal(summary.adjudicatedGames, 0, 'Tournament contains capped games');
const games = (await readFile(inputPath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
assert.equal(games.length, summary.expectedGames, 'Tournament game count is incomplete');
assert.ok(games.every((game) => game.status === 'completed' && game.finalFen && game.playedAt && game.pgn), 'Every game needs a timestamp, final position and PGN');

const root = resolve('docs/tournaments', phase);
const imagesDir = resolve(root, 'images');
const pgnDir = resolve(root, 'pgn');
if (checkOnly) {
  const sample = games[0];
  assert.ok(sample.white?.name && sample.black?.name && sample.result && sample.reason, 'Game metadata is incomplete');
  console.log('PASS: tournament evidence contract is ready; real tournament artifacts are required to generate the gallery.');
  process.exit(0);
}
await rm(root, { recursive: true, force: true });
await mkdir(imagesDir, { recursive: true });
await mkdir(pgnDir, { recursive: true });

const WIDTH = 160;
const HEIGHT = 160;
const SQ = 20;
const COLORS = { light: [238, 216, 181], dark: [181, 136, 99], white: [248, 246, 236], black: [28, 30, 35], ink: [20, 22, 25], paper: [244, 244, 244] };
const FONT = {
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  Q: ['01110','10001','10001','10101','10010','01101','00001'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
};
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([name, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, name, data, crc]);
}
function renderFen(fen, target) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  const pixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = (y * WIDTH + x) * 3;
    pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2];
  };
  const rect = (x, y, w, h, color) => {
    for (let py = y; py < y + h; py += 1) for (let px = x; px < x + w; px += 1) pixel(px, py, color);
  };
  const circle = (cx, cy, radius, fill, stroke) => {
    for (let y = -radius; y <= radius; y += 1) for (let x = -radius; x <= radius; x += 1) {
      const d = x * x + y * y;
      if (d <= radius * radius) pixel(cx + x, cy + y, d >= (radius - 1) * (radius - 1) ? stroke : fill);
    }
  };
  const board = fen.split(' ')[0].split('/');
  assert.equal(board.length, 8, `Invalid FEN board: ${fen}`);
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) rect(file * SQ, rank * SQ, SQ, SQ, (rank + file) % 2 === 0 ? COLORS.light : COLORS.dark);
  }
  for (let rank = 0; rank < 8; rank += 1) {
    let file = 0;
    for (const token of board[rank]) {
      if (/^[1-8]$/.test(token)) { file += Number(token); continue; }
      assert.ok('pnbrqkPNBRQK'.includes(token), `Invalid FEN piece: ${token}`);
      const x = file * SQ; const y = rank * SQ;
      const white = token === token.toUpperCase();
      const cx = x + SQ / 2; const cy = y + SQ / 2;
      circle(cx, cy, 8, white ? COLORS.white : COLORS.black, white ? COLORS.ink : COLORS.paper);
      const glyph = FONT[token.toUpperCase()];
      const ink = white ? COLORS.ink : COLORS.paper;
      const scale = 2; const gw = 5 * scale; const gh = 7 * scale;
      for (let gy = 0; gy < glyph.length; gy += 1) {
        for (let gx = 0; gx < glyph[gy].length; gx += 1) {
          if (glyph[gy][gx] === '1') rect(Math.round(cx - gw / 2) + gx * scale, Math.round(cy - gh / 2) + gy * scale, scale, scale, ink);
        }
      }
      file += 1;
    }
    assert.equal(file, 8, `Invalid FEN rank: ${board[rank]}`);
  }
  const scan = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const start = y * (WIDTH * 3 + 1);
    scan[start] = 0;
    pixels.copy(scan, start + 1, y * WIDTH * 3, (y + 1) * WIDTH * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0); ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(scan)), pngChunk('IEND', Buffer.alloc(0))]);
  return writeFile(target, png);
}
function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const rel = (path) => relative(process.cwd(), path).split(sep).join('/');
const gallery = [];
gallery.push(`### ${phase === 'pre-merge' ? 'Pre-merge' : 'Post-merge'} tournament: ${games.length} games`, '');
gallery.push(`Verified run started: ${summary.startedAt}`, `Verified run finished: ${summary.finishedAt}`, '');
for (const game of games) {
  const id = String(game.gameIndex).padStart(4, '0');
  const pngPath = resolve(imagesDir, `game-${id}.png`);
  const pgnPath = resolve(pgnDir, `game-${id}.pgn`);
  await renderFen(game.finalFen, pngPath);
  await writeFile(pgnPath, game.pgn + (game.pgn.endsWith('\n') ? '' : '\n'));
  const pngRel = rel(pngPath);
  const pgnRel = rel(pgnPath);
  gallery.push(
    '<details>',
    `<summary>Game ${game.gameIndex} · ${escapeHtml(game.playedAt)} · White: ${escapeHtml(game.white.name)} · Black: ${escapeHtml(game.black.name)} · Result: ${escapeHtml(game.result)}</summary>`,
    '',
    `![Final board, game ${game.gameIndex}](${pngRel})`,
    '',
    `- **Date/time:** ${escapeHtml(game.playedAt)}`,
    `- **White:** ${escapeHtml(game.white.name)} (${escapeHtml(game.white.id)})`,
    `- **Black:** ${escapeHtml(game.black.name)} (${escapeHtml(game.black.id)})`,
    `- **Result:** ${escapeHtml(game.result)}`,
    `- **Termination:** ${escapeHtml(game.reason)}`,
    `- **Plies:** ${game.plies}`,
    `- **Full PGN:** [game-${id}.pgn](${pgnRel})`,
    '',
    '</details>',
    '',
  );
}
const markerStart = `<!-- legends-tournament:${phase}:start -->`;
const markerEnd = `<!-- legends-tournament:${phase}:end -->`;
const readmePath = resolve('README.md');
let readme = await readFile(readmePath, 'utf8');
const start = readme.indexOf(markerStart);
const end = readme.indexOf(markerEnd);
assert.ok(start >= 0 && end > start, `README is missing the ${phase} tournament markers`);
const heading = phase === 'pre-merge' ? '### Pre-merge tournament' : '### Post-merge tournament';
const replacement = [markerStart, heading, '', ...gallery, markerEnd].join('\n');
readme = readme.slice(0, start) + replacement + readme.slice(end + markerEnd.length);
const releaseStartMarker = `<!-- legends-release-status:${phase}:start -->`;
const releaseEndMarker = `<!-- legends-release-status:${phase}:end -->`;
const releaseStart = readme.indexOf(releaseStartMarker);
const releaseEnd = readme.indexOf(releaseEndMarker);
assert.ok(releaseStart >= 0 && releaseEnd > releaseStart, `README is missing the ${phase} release status markers`);
const repository = process.env.GITHUB_REPOSITORY || 'orenzbit/veyra-chess';
const runId = process.env.GITHUB_RUN_ID || '';
const commitSha = process.env.GITHUB_SHA || 'unknown';
const runLink = runId ? `[GitHub Actions run](https://github.com/${repository}/actions/runs/${runId})` : 'local run (no GitHub Actions URL)';
const releaseLines = [
  releaseStartMarker,
  `### ${phase === 'pre-merge' ? 'Pre-merge' : 'Post-merge'} verification status`,
  '',
  `- **Result:** ${summary.status}`,
  `- **Commit checked by this workflow:** ${commitSha}`,
  `- **Workflow evidence:** ${runLink}`,
  `- **Bots in the manifest:** ${summary.botCount}`,
  `- **Games completed:** ${summary.completedGames}/${summary.expectedGames}`,
  `- **Failed games:** ${summary.failedGames}`,
  `- **Ply-cap interruptions:** ${summary.adjudicatedGames}`,
  `- **Time control:** ${summary.timeControlSeconds} seconds per side, no increment`,
  `- **Started:** ${summary.startedAt}`,
  `- **Finished:** ${summary.finishedAt}`,
  `- **Tal included:** ${summary.talIncluded}`,
  '',
  releaseEndMarker,
];
readme = readme.slice(0, releaseStart) + releaseLines.join('\n') + readme.slice(releaseEnd + releaseEndMarker.length);
await writeFile(readmePath, readme);
await writeFile(resolve(root, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(`Rendered ${games.length} final-board PNGs and PGNs; updated README ${phase} gallery and release status.`);
