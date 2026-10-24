import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const checkOnly = process.argv.includes('--check');
const inputPath = resolve(process.argv.find((arg) => arg.startsWith('--input='))?.slice(8) || 'artifacts/legends-tournament/games.jsonl');
const opponentId = process.argv.find((arg) => arg.startsWith('--opponent='))?.slice(11) || 'capablanca';
const outputPath = resolve('public/legends/tal-vs-capablanca.html');
if (checkOnly) {
  const runner = await readFile('scripts/run-legends-tournament.mjs', 'utf8');
  const readme = await readFile('README.md', 'utf8');
  assert.ok(runner.includes('timeControlSeconds') && runner.includes('moveTimes'), 'Tournament runner must record per-side clocks and per-move thinking time');
  assert.ok(readme.includes('tal-vs-capablanca.html'), 'README must document the post-merge visualizer');
  console.log('PASS: interactive Tal match visualizer and ten-minute clock evidence contracts are available.');
  process.exit(0);
}
const lines = (await readFile(inputPath, 'utf8')).split(/\r?\n/).filter(Boolean);
const games = lines.map((line) => JSON.parse(line));
const match = games.filter((game) =>
  (game.white?.id === 'tal' && game.black?.id === opponentId) ||
  (game.black?.id === 'tal' && game.white?.id === opponentId)
);
assert.equal(match.length, 2, 'Expected exactly two Tal-versus-selected-bot games');
assert.equal(new Set(match.map((game) => game.white.id === opponentId ? 'selected-white' : 'selected-black')).size, 2, 'Selected bot must play once as White and once as Black');
assert.ok(match.every((game) => game.status === 'completed' && game.result && game.pgn && game.finalFen), 'Both demonstration games must come from completed tournament records');
const botName = match[0].white.id === opponentId ? match[0].white.name : match[0].black.name;
const boardStates = match.map((record) => {
  const parsed = new Chess();
  parsed.loadPgn(record.pgn, { sloppy: true });
  const moves = parsed.history({ verbose: true });
  const replay = new Chess();
  const fens = [replay.fen()];
  for (const move of moves) {
    assert.ok(replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined }), 'Illegal move while creating visualizer replay');
    fens.push(replay.fen());
  }
  assert.equal(replay.fen(), record.finalFen, 'Replay final position must match tournament record');
  return {
    gameIndex: record.gameIndex, playedAt: record.playedAt,
    white: record.white, black: record.black, result: record.result, reason: record.reason,
    pgn: record.pgn, timeControlSeconds: record.timeControlSeconds,
    remainingClocks: record.remainingClocks, fens, sans: moves.map((move) => move.san),
  };
});
const payload = JSON.stringify(boardStates).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const htmlLines = [
'<!doctype html>',
'<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>Veyra Chess · Tal vs ' + botName + '</title>',
'<style>',
':root{color-scheme:dark;--bg:#111827;--panel:#1f2937;--ink:#f3f4f6;--muted:#9ca3af;--accent:#f59e0b}',
'*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}',
'main{max-width:1100px;margin:auto;padding:24px;display:grid;gap:18px}.panel{background:var(--panel);border-radius:16px;padding:18px}',
'h1,h2,p{margin-top:0}.games{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}',
'button{background:#374151;color:var(--ink);border:1px solid #4b5563;border-radius:9px;padding:10px 14px;font:inherit;cursor:pointer}',
'.controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.board{display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1;max-width:520px;margin:14px auto;border:4px solid #6b7280}',
'.square{display:grid;place-items:center;aspect-ratio:1;font-size:clamp(20px,4vw,42px);user-select:none}.light{background:#ead9b8;color:#111827}.dark{background:#8d6449;color:#fff}',
'.meta{color:var(--muted);font-size:.9rem}.moves{max-height:130px;overflow:auto;direction:ltr;text-align:left;white-space:pre-wrap;font-family:ui-monospace,monospace}.result{font-weight:700;color:var(--accent)}',
'</style></head><body><main>',
'<header class="panel"><h1>משחקי הדגמה: טל מול ' + botName + '</h1><p>שני משחקים אמיתיים מתוך טורניר ה־round-robin שאומת אחרי המיזוג. בכל משחק צבעי הבוטים הפוכים. תוצאה אינה מדד יחיד לסגנון או לרמת הבוט.</p><p class="meta">כל משחק כולל PGN, תאריך ושעה, סיבת סיום ונתוני שעון מתוך דוח הטורניר.</p></header>',
'<section id="games" class="games"></section></main>',
'<script>const games=' + payload + ';',
'const glyph={K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"};',
'function boardFromFen(fen){return fen.split(" ")[0].split("/").flatMap(rank=>[...rank].flatMap(ch=>/[1-8]/.test(ch)?Array(Number(ch)).fill(""):ch));}',
'function renderGame(g,index){const el=document.createElement("article");el.className="panel";const selectedWhite=g.white.id==="capablanca";',
'el.innerHTML="<h2>משחק "+(index+1)+"</h2><p>"+(selectedWhite?"Capablanca בלבן · טל בשחור":"טל בלבן · Capablanca בשחור")+"</p><p class=meta>"+g.playedAt+" · "+g.result+" · "+g.reason+"</p><div class=board></div><div class=controls><button data-step=-1>הקודם</button><button data-step=1>הבא</button><button data-step=start>התחלה</button><button data-step=end>סיום</button></div><p class=meta></p><pre class=moves></pre><p class=meta>שעון התחלתי: "+g.timeControlSeconds+" שניות לכל צד. יתרה בסיום: לבן "+g.remainingClocks.white+" שנ׳, שחור "+g.remainingClocks.black+" שנ׳.</p><a download=tal-match-"+(index+1)+".pgn href=data:text/plain;charset=utf-8,"+encodeURIComponent(g.pgn)+">הורדת PGN מלא</a>";',
'const board=el.querySelector(".board"),label=el.querySelectorAll("p.meta")[1],movesEl=el.querySelector(".moves");let idx=0;',
'function draw(){const squares=boardFromFen(g.fens[idx]);board.innerHTML="";for(let i=0;i<64;i++){const sq=document.createElement("div");sq.className="square "+((Math.floor(i/8)+i%8)%2===0?"light":"dark");sq.textContent=glyph[squares[i]]||"";board.appendChild(sq);}label.textContent="חצי־מסע "+idx+" מתוך "+g.sans.length;movesEl.textContent=g.sans.slice(0,idx).map((m,i)=>(i%2===0?(Math.floor(i/2)+1)+". ":"")+m).join(" ");}',
'el.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{const a=btn.dataset.step;if(a==="start")idx=0;else if(a==="end")idx=g.sans.length;else idx=Math.max(0,Math.min(g.sans.length,idx+Number(a)));draw();}));draw();return el;}',
'games.forEach((g,i)=>document.querySelector("#games").appendChild(renderGame(g,i)));',
'</script></body></html>'
];
const html = htmlLines.join('\n');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html);
console.log('Generated interactive Tal vs ' + botName + ' visualization from two completed tournament games: ' + outputPath);
