import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
const dir='public/data/bots';
const manifest=JSON.parse(await readFile(join(dir,'index.json'),'utf8'));
if(!Array.isArray(manifest) || manifest.length!==20) throw new Error(`Expected 20 bots, found ${Array.isArray(manifest)?manifest.length:'invalid manifest'}`);
const required=['elo','name','title','tier','flavor','piece','openingsAsWhite','openingsAsBlack','gambits'];
const elos=new Set(), names=new Set();
for(const b of manifest){
  for(const k of required) if(!(k in b)) throw new Error(`Missing ${k} for ${b.name||'unknown'}`);
  if(elos.has(b.elo)) throw new Error(`Duplicate Elo ${b.elo}`);
  if(names.has(b.name)) throw new Error(`Duplicate bot name ${b.name}`);
  elos.add(b.elo); names.add(b.name);
  for(const k of ['openingsAsWhite','openingsAsBlack','gambits']) if(!Array.isArray(b[k])) throw new Error(`${b.name}: ${k} must be array`);
}
const files=(await readdir(dir)).filter(f=>f.endsWith('.json')&&f!=='index.json');
if(files.length!==20) throw new Error(`Expected 20 runtime bot files, found ${files.length}`);
for(const f of files) JSON.parse(await readFile(join(dir,f),'utf8'));
console.log(`PASS: ${manifest.length} bot definitions and ${files.length} runtime files validated.`);
