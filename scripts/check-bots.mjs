import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'public/data/bots';
const manifest = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'));
if (!Array.isArray(manifest) || manifest.length < 2) throw new Error(`Expected at least 2 bots, found ${Array.isArray(manifest) ? manifest.length : 'invalid manifest'}`);
const required = ['id','slug','elo','name','title','tier','stage','flavor','piece','era','region','persona','historicalNote','style','styleLabel','openingEraNote','quips','openingsAsWhite','openingsAsBlack','gambits'];
const ids=new Set(),slugs=new Set(),elos=new Set(),names=new Set(),regions=new Set(),eras=new Set();
for(const b of manifest){
  for(const key of required)if(!(key in b))throw new Error(`Missing ${key} for ${b.name||'unknown'}`);
  if(!/^[a-z0-9-]{2,80}$/.test(b.id)||b.slug!==b.id)throw new Error(`Invalid id/slug for ${b.name}`);
  if(ids.has(b.id)||slugs.has(b.slug))throw new Error(`Duplicate id/slug for ${b.name}`);
  if(!Number.isInteger(b.elo)||b.elo<100||b.elo>4000||elos.has(b.elo))throw new Error(`Invalid or duplicate Elo for ${b.name}`);
  if(names.has(b.name))throw new Error(`Duplicate bot name ${b.name}`);
  if(!Number.isInteger(b.tier)||b.tier<0||b.tier>3)throw new Error(`Invalid tier for ${b.name}`);
  if(!['beginner','advanced','expert','grandmaster'].includes(b.stage))throw new Error(`Invalid stage for ${b.name}`);
  if(!['tactical','positional','attacking','defensive','endgame','universal'].includes(b.style))throw new Error(`Invalid style for ${b.name}`);
  if(!Array.isArray(b.quips)||b.quips.length<3||b.quips.some(line=>typeof line!=='string'||!line.trim()))throw new Error(`Invalid quips for ${b.name}`);
  if(regions.has(b.region))throw new Error(`Duplicate region ${b.region}`);
  if(eras.has(b.era))throw new Error(`Duplicate era ${b.era}`);
  ids.add(b.id);slugs.add(b.slug);elos.add(b.elo);names.add(b.name);regions.add(b.region);eras.add(b.era);
  for(const key of ['openingsAsWhite','openingsAsBlack','gambits']){
    if(!Array.isArray(b[key])||(key!=='gambits'&&!b[key].length))throw new Error(`${b.name}: ${key} must be an array${key==='gambits'?'':' with at least one entry'}`);
    for(const line of b[key])if(!line||typeof line.name!=='string'||typeof line.moves!=='string'||!line.moves.trim())throw new Error(`${b.name}: invalid opening in ${key}`);
  }
}
const files=(await readdir(dir)).filter(file=>file.endsWith('.json')&&file!=='index.json');
if(files.length!==manifest.length)throw new Error(`Expected ${manifest.length} runtime files, found ${files.length}`);
for(const b of manifest){
 const file=`${b.slug}.json`;
 if(!files.includes(file))throw new Error(`Missing runtime file ${file}`);
 const runtime=JSON.parse(await readFile(join(dir,file),'utf8'));
 if(runtime.id!==b.id||runtime.slug!==b.slug||runtime.elo!==b.elo||runtime.name!==b.name)throw new Error(`Runtime file mismatch for ${b.name}`);
}
for(const file of files)JSON.parse(await readFile(join(dir,file),'utf8'));
console.log('PASS: ' + manifest.length + ' bot definitions, unique identities/regions/eras, stages, quips, repertoires and runtime files validated.');
