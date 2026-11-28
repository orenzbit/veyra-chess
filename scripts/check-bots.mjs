import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'public/data/bots';
const manifest = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'));
const historicalIds = new Set([
  'anand', 'marshall', 'anderssen', 'fischer', 'karpov', 'kasparov',
  'morphy', 'nakamura', 'polgarj', 'tal', 'capablanca', 'carlsen',
]);
if (!Array.isArray(manifest) || manifest.length !== 61) {
  throw new Error(`Expected 61 tournament bots, found ${Array.isArray(manifest) ? manifest.length : 'invalid manifest'}`);
}
const required = ['id','slug','elo','name','title','tier','stage','flavor','piece','era','region','persona','historicalNote','style','styleLabel','openingEraNote','quips','openingsAsWhite','openingsAsBlack','gambits'];
const ids = new Set(), slugs = new Set(), elos = new Set(), names = new Set(), regions = new Set(), eras = new Set();
for (const b of manifest) {
  for (const key of required) if (!(key in b)) throw new Error(`Missing ${key} for ${b.name || 'unknown'}`);
  if (!/^[a-z0-9-]{2,80}$/.test(b.id) || b.slug !== b.id) throw new Error(`Invalid id/slug for ${b.name}`);
  if (ids.has(b.id) || slugs.has(b.slug)) throw new Error(`Duplicate id/slug for ${b.name}`);
  if (!Number.isInteger(b.elo) || b.elo < 100 || b.elo > 4000 || elos.has(b.elo)) throw new Error(`Invalid or duplicate Elo for ${b.name}`);
  if (names.has(b.name)) throw new Error(`Duplicate bot name ${b.name}`);
  if (!Number.isInteger(b.tier) || b.tier < 0 || b.tier > 3) throw new Error(`Invalid tier for ${b.name}`);
  if (!['beginner','advanced','expert','grandmaster'].includes(b.stage)) throw new Error(`Invalid stage for ${b.name}`);
  if (!['tactical','positional','attacking','defensive','endgame','universal'].includes(b.style)) throw new Error(`Invalid style for ${b.name}`);
  if (!Array.isArray(b.quips) || b.quips.length < 3 || b.quips.some(line => typeof line !== 'string' || !line.trim())) throw new Error(`Invalid quips for ${b.name}`);
  // Historical players can share countries and eras; uniqueness applies only to synthetic profiles.
  if (!historicalIds.has(b.id)) {
    if (regions.has(b.region)) throw new Error(`Duplicate synthetic region ${b.region}`);
    if (eras.has(b.era)) throw new Error(`Duplicate synthetic era ${b.era}`);
    regions.add(b.region);
    eras.add(b.era);
  }
  ids.add(b.id);
  slugs.add(b.slug);
  elos.add(b.elo);
  names.add(b.name);
  for (const key of ['openingsAsWhite','openingsAsBlack','gambits']) {
    if (!Array.isArray(b[key])) throw new Error(`${b.name}: ${key} must be an array`);
    // Historical PGN-derived profiles do not claim a separate gambit repertoire unless the source supports one.
    if (!b[key].length && !(historicalIds.has(b.id) && key === 'gambits')) {
      throw new Error(`${b.name}: ${key} must be non-empty`);
    }
    for (const line of b[key]) {
      if (!line || typeof line.name !== 'string' || typeof line.moves !== 'string' || !line.moves.trim()) {
        throw new Error(`${b.name}: invalid opening in ${key}`);
      }
    }
  }
}
const missingHistorical = [...historicalIds].filter(id => !ids.has(id));
if (missingHistorical.length) throw new Error(`Missing historical profiles from tournament roster: ${missingHistorical.join(', ')}`);
const files = (await readdir(dir)).filter(file => file.endsWith('.json') && file !== 'index.json');
const indexedFiles = new Set(manifest.map(b => `${b.slug}.json`));
const unindexedFiles = files.filter(file => !indexedFiles.has(file));
if (files.length !== 62 || unindexedFiles.length !== 1 || unindexedFiles[0] !== 'orenzbit.json') {
  throw new Error(`Expected 61 indexed runtime files plus preserved personal profile orenzbit.json; found ${files.length} runtime files and unindexed files: ${unindexedFiles.join(', ') || 'none'}`);
}
for (const b of manifest) {
  const file = `${b.slug}.json`;
  if (!files.includes(file)) throw new Error(`Missing runtime file ${file}`);
  const runtime = JSON.parse(await readFile(join(dir, file), 'utf8'));
  if (runtime.id !== b.id || runtime.slug !== b.slug || runtime.elo !== b.elo || runtime.name !== b.name) {
    throw new Error(`Runtime file mismatch for ${b.name}`);
  }
}
for (const file of files) JSON.parse(await readFile(join(dir, file), 'utf8'));
console.log('PASS: 61 tournament bot definitions, all 12 historical profiles indexed, 62 runtime files parsed; the preserved personal orenzbit.json is excluded from the tournament roster.');
