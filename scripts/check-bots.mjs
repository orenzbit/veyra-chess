import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
const dir='public/data/bots';
const manifest=JSON.parse(await readFile(join(dir,'index.json'),'utf8'));
if(!Array.isArray(manifest) || manifest.length<20 || manifest.length>50) throw new Error(`Expected 20–50 bots, found ${Array.isArray(manifest)?manifest.length:'invalid manifest'}`);
const required=['id','slug','elo','name','title','tier','flavor','piece','openingsAsWhite','openingsAsBlack','gambits'];
const elos=new Set(), names=new Set(), slugs=new Set();
for(const b of manifest){
  for(const k of required) if(!(k in b)) throw new Error(`Missing ${k} for ${b.name||'unknown'}`);
  if(elos.has(b.elo)) throw new Error(`Duplicate Elo ${b.elo}`);
  if(names.has(b.name)) throw new Error(`Duplicate bot name ${b.name}`);
  if(typeof b.slug!=='string'||!/^[a-z0-9-]{2,80}$/.test(b.slug)) throw new Error(`Invalid slug for ${b.name}`);
  if(slugs.has(b.slug)) throw new Error(`Duplicate bot slug ${b.slug}`);
  elos.add(b.elo); names.add(b.name); slugs.add(b.slug);
  for(const k of ['openingsAsWhite','openingsAsBlack','gambits']) if(!Array.isArray(b[k])) throw new Error(`${b.name}: ${k} must be array`);
}
const files=(await readdir(dir)).filter(f=>f.endsWith('.json')&&f!=='index.json');
if(files.length!==manifest.length) throw new Error(`Expected ${manifest.length} runtime bot files, found ${files.length}`);
const historicalIds=['bobby','noa','dani','maya','yuval'];
const historicalBots=manifest.filter(b=>historicalIds.includes(b.id));
if(historicalBots.length!==historicalIds.length) throw new Error('The first five historical bots are missing');
const eras=new Set(), regions=new Set();
for(const b of historicalBots){
  for(const key of ['era','region','historicalProfile','openingStyle']) if(typeof b[key]!=='string'||!b[key].trim()) throw new Error(`${b.name}: missing historical field ${key}`);
  if(!Array.isArray(b.banter)||b.banter.length<3||b.banter.some(line=>typeof line!=='string'||!line.trim())) throw new Error(`${b.name}: expected at least three banter lines`);
  if(!Array.isArray(b.openingsAsWhite)||!b.openingsAsWhite.length||!Array.isArray(b.openingsAsBlack)||!b.openingsAsBlack.length) throw new Error(`${b.name}: missing color-specific opening repertoire`);
  if(eras.has(b.era)) throw new Error(`Duplicate historical era ${b.era}`);
  if(regions.has(b.region)) throw new Error(`Duplicate historical region ${b.region}`);
  eras.add(b.era); regions.add(b.region);
}
for(const f of files){
  const runtime=JSON.parse(await readFile(join(dir,f),'utf8'));
  const id=f.replace(/\.json$/,'');
  if(historicalIds.includes(id)){
    const b=manifest.find(x=>x.id===id);
    if(runtime.slug!==b.slug||runtime.era!==b.era||runtime.region!==b.region) throw new Error(`${f}: runtime metadata does not match manifest`);
  }
}
console.log(`PASS: ${manifest.length} bot definitions, ${files.length} runtime files, and five distinct historical profiles validated.`);
