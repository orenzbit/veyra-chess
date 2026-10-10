import { readFile } from 'node:fs/promises';
const checks=[
  ['package.json',()=>readFile('package.json','utf8')],
  ['netlify.toml',()=>readFile('netlify.toml','utf8')],
  ['gate.ts',()=>readFile('netlify/edge-functions/gate.ts','utf8')],
  ['release status',()=>readFile('RELEASE_AUDIT_STATUS.md','utf8')],
];
for(const [name,fn] of checks) await fn();
const src=await readFile('src/main.ts','utf8');
if(/Stockfish|stockfish/.test(src)) throw new Error('Stockfish reference detected in src/main.ts');
if(!src.includes("/data/bots/index.json")) throw new Error('Bot manifest loading missing');
console.log('PASS: release structure checks completed.');
