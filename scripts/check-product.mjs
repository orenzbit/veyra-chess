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
const adminAuth=await readFile('netlify/functions/admin-auth.mjs','utf8');
const adminLib=await readFile('netlify/functions/_lib.mjs','utf8');
const adminAccess=await readFile('netlify/functions/admin-access.mjs','utf8');
const adminBots=await readFile('netlify/functions/admin-bots.mjs','utf8');
const auth=await readFile('netlify/functions/auth.mjs','utf8');
const sync=await readFile('netlify/functions/sync.mjs','utf8');
const telemetry=await readFile('netlify/functions/telemetry.mjs','utf8');
const adaptive=await readFile('netlify/functions/adaptive.mjs','utf8');
const bots=await readFile('netlify/functions/bots.mjs','utf8');
for (const [source,needles,label] of [
  [adminAuth,["ADMIN_PASSWORD_HASH","ADMIN_SESSION_SECRET","strictSameOrigin","too_many_attempts","12 * 60 * 60"],"server-only admin login controls"],
  [adminLib,["ADMIN_EMAIL || ''","function strictSameOrigin","function clientIp","while (map.size > 10000)"],"server-side identity defaults, trusted IP and bounded rate-limit state"],
  [adminAccess,["rateLimit(requests","strictSameOrigin","MAX_BODY_BYTES"],"admin access throttling and payload limits"],
  [adminBots,["rateLimit(requests","strictSameOrigin","MAX_BODY_BYTES"],"admin bot throttling and payload limits"],
  [auth,["clientIp(event)","16 * 1024","__global__"],"public auth rate and payload limits"],
  [sync,["clientIp(event)","strictSameOrigin(event)","MAX_PROGRESS_BYTES + MAX_PGN_BYTES"],"sync rate, origin and payload limits"],
  [telemetry,["clientIp(event)","strictSameOrigin(event)","MAX_BODY_BYTES","__global__"],"telemetry rate, origin and payload limits"],
  [adaptive,["clientIp(event)","strictSameOrigin(event)","MAX_BODY_BYTES","__global__"],"adaptive rate, origin and payload limits"],
  [bots,["clientIp(event)","rateLimit(requests","method_not_allowed"],"bot API throttling and read-only contract"],
  [gate,["requestRates","Too Many Requests","startsWith('/api/')","content-length"],"edge API throttling before serverless execution"],
]) for (const needle of needles) if (!source.includes(needle)) throw new Error(`Security control missing (${label}): ${needle}`);
const schema=await readFile('public/data/supabase-schema.sql','utf8');
for (const table of ['telemetry_events','adaptive_signals','bot_overrides']) {
  if(!schema.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS missing for ${table}`);
}
console.log('PASS: product surfaces, admin/adaptive/windows scaffolding, support email, signed gate, and RLS schema are present.');
