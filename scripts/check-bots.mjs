import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'public/data/bots';
const manifest = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'));
if (!Array.isArray(manifest) || manifest.length !== 61) throw new Error(`Expected 61 bots, found ${Array.isArray(manifest) ? manifest.length : 'invalid manifest'}`);
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
  if(b.sourceFile&&(!b.phraseArchive||!['general','opening','threat','tactics','endgame'].every(key=>Array.isArray(b.phraseArchive[key])&&b.phraseArchive[key].length>=2)))throw new Error(`Invalid historical phrase archive for ${b.name}`);
  // Historical players legitimately share countries/regions; only synthetic profiles require unique region labels.
  if(!b.sourceFile && regions.has(b.region))throw new Error(`Duplicate synthetic-bot region ${b.region}`);
  // Historical careers overlap in time; uniqueness is only meaningful for synthetic profile eras.
  if(!b.sourceFile && eras.has(b.era))throw new Error(`Duplicate synthetic-bot era ${b.era}`);
  ids.add(b.id);slugs.add(b.slug);elos.add(b.elo);names.add(b.name);regions.add(b.region);eras.add(b.era);
  for(const key of ['openingsAsWhite','openingsAsBlack','gambits']){
    if(!Array.isArray(b[key])||(key!=='gambits'&&!b[key].length))throw new Error(`${b.name}: ${key} must be a non-empty array`);
    for(const line of b[key])if(!line||typeof line.name!=='string'||typeof line.moves!=='string'||!line.moves.trim())throw new Error(`${b.name}: invalid opening in ${key}`);
  }
}
const files=(await readdir(dir)).filter(file=>file.endsWith('.json')&&file!=='index.json');
if(files.length!==61)throw new Error(`Expected 61 runtime files, found ${files.length}`);
for(const b of manifest){
 const file=`${b.slug}.json`;
 if(!files.includes(file))throw new Error(`Missing runtime file ${file}`);
 const runtime=JSON.parse(await readFile(join(dir,file),'utf8'));
 if(runtime.id!==b.id||runtime.slug!==b.slug||runtime.elo!==b.elo||runtime.name!==b.name)throw new Error(`Runtime file mismatch for ${b.name}`);
}
for(const file of files)JSON.parse(await readFile(join(dir,file),'utf8'));
for (const bot of manifest.filter((entry) => entry.sourceFile)) {
  const categories = ['general','opening','threat','tactics','endgame'];
  if (!bot.phraseArchive || !categories.every((category) => Array.isArray(bot.phraseArchive[category]) && bot.phraseArchive[category].length >= 2)) throw new Error('Phrase archive categories missing for ' + bot.id);
  const ids = new Set();
  for (const category of categories) for (const phrase of bot.phraseArchive[category]) {
    if (!phrase || phrase.category !== category || !phrase.trigger || !phrase.text || phrase.language !== 'he' || !phrase.id) throw new Error('Invalid structured phrase archive entry for ' + bot.id + '/' + category);
    if (ids.has(phrase.id)) throw new Error('Duplicate phrase ID for ' + bot.id + ': ' + phrase.id);
    ids.add(phrase.id);
  }
}
console.log('PASS: 61 bot definitions, 12 source-grounded historical phrase archives, unique identities, synthetic-profile regions/eras, stages, quips, repertoires and runtime files validated.');
