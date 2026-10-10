import { readFile } from 'node:fs/promises';

const files = [
  'public/manifest.webmanifest',
  'public/download.html',
  'public/credits.html',
  'public/sw.js',
  'public/data/supabase-schema.sql',
  'netlify/edge-functions/gate.ts',
  'netlify/functions/admin-auth.mjs',
  'netlify/functions/admin-bots.mjs',
  'netlify/functions/admin-stats.mjs',
  'netlify/functions/adaptive.mjs',
  'netlify/functions/telemetry.mjs',
  'netlify/functions/bots.mjs',
];
for (const file of files) await readFile(file, 'utf8');
const src = await readFile('src/main.ts','utf8');
if (!src.includes("orennzb@gmail.com")) throw new Error('Support email missing from app');
if (!src.includes("page==='adaptive'")) throw new Error('Adaptive page missing');
if (!src.includes("page==='admin'")) throw new Error('Admin page missing');
if (!src.includes("page==='windows'")) throw new Error('Windows page missing');
if (!src.includes('BOT_PROGRESS_KEY')) throw new Error('Bot progression missing');
const gate=await readFile('netlify/edge-functions/gate.ts','utf8');
if (!gate.includes('HMAC')) throw new Error('Signed gate token missing');
if (gate.includes('site_gate=1')) throw new Error('Weak static gate cookie remains');
const schema=await readFile('public/data/supabase-schema.sql','utf8');
for (const table of ['telemetry_events','adaptive_signals','bot_overrides']) {
  if(!schema.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS missing for ${table}`);
}
console.log('PASS: product surfaces, admin/adaptive/windows scaffolding, support email, signed gate, and RLS schema are present.');
