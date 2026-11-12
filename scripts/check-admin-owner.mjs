// The admin area belongs to the site owner's own user account and is hidden from everyone else.
// Every /api/admin-* endpoint answers 404 (not 401/403) unless the signed-in user is on the allowlist
// (ADMIN_USER_EMAILS / ADMIN_USER_IDS, default ADMIN_EMAIL); the app has no visible Admin button.
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';

process.env.ADMIN_EMAIL = 'Owner@Example.com';
process.env.ADMIN_SESSION_SECRET = 'test-admin-secret'; // a test-only value (kept short of the guardian's 20-character secret pattern)
process.env.AUTH_SESSION_SECRET = 'auth-session-secret';
process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'service-role-key';
process.env.BOT_CHALLENGE_SECRET = 'human-secret';
delete process.env.ADMIN_USER_EMAILS; delete process.env.ADMIN_USER_IDS;
const { hashPassword } = await import('../netlify/functions/_lib.mjs');
process.env.ADMIN_PASSWORD_HASH = hashPassword('correct horse battery staple', { iterations: 100000 });
globalThis.fetch = async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });

const handlers = {};
for (const name of ['admin-auth', 'admin-access', 'admin-bots', 'admin-stats']) handlers[name] = (await import(`../netlify/functions/${name}.mjs`)).handler;

const b64url = (v) => Buffer.from(v).toString('base64url');
const adminCookie = (() => { const exp = Math.floor(Date.now() / 1000) + 3600; const payload = `${b64url('owner@example.com')}.${exp}.${crypto.randomUUID()}`; return `__Host-admin_session=${payload}.${crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url')}`; })();
const humanCookie = (() => { const k = crypto.createHmac('sha256', 'human-secret').update('veyra-human|cookie').digest(); const exp = Math.floor(Date.now() / 1000) + 3600; const n = crypto.randomUUID(); return `__Host-human=${exp}.${n}.${crypto.createHmac('sha256', k).update(`${exp}.${n}`).digest('base64url')}`; })();
const userCookie = (user_id, email) => {
  const key = crypto.createHash('sha256').update('auth-session-secret').digest(); const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv); const enc = Buffer.concat([c.update(JSON.stringify({ user_id, email, access_token: 'a', exp: Math.floor(Date.now() / 1000) + 3600 })), c.final()]);
  return `__Host-tabia_session=${Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url')}`;
};
const OWNER = userCookie('u-owner', 'owner@example.com');
const PLAYER = userCookie('u-player', 'player@example.com');
let n = 0;
const call = async (name, { method = 'GET', cookies = [], body } = {}) => {
  const r = await handlers[name]({ httpMethod: method, rawUrl: 'https://veyra.example/api/' + name, body, headers: { origin: 'https://veyra.example', 'x-nf-client-connection-ip': `198.51.100.${++n % 250}`, cookie: cookies.join('; ') } });
  return r.statusCode;
};

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${ok ? '' : ' (' + detail + ')'}`); if (!ok) failed++; };
const names = Object.keys(handlers);

for (const name of names) check(`signed out: /api/${name} answers 404`, (await call(name)) === 404, String(await call(name)));
for (const name of names) { const s = await call(name, { cookies: [PLAYER, adminCookie] }); check(`a normal user, even holding an admin cookie: /api/${name} answers 404`, s === 404, String(s)); }
{ const s = await call('admin-auth', { method: 'POST', cookies: [PLAYER, humanCookie], body: JSON.stringify({ password: 'correct horse battery staple' }) }); check('a normal user with the right admin password still gets 404', s === 404, String(s)); }
for (const name of names) { const s = await call(name, { cookies: [OWNER, adminCookie] }); check(`the owner's account (ADMIN_EMAIL) with the admin password session: /api/${name} answers 200`, s === 200, String(s)); }
{ const s = await call('admin-access', { cookies: [OWNER] }); check('the owner still needs the admin password (second factor): 401 without it', s === 401, String(s)); }
process.env.ADMIN_USER_EMAILS = 'player@example.com';
{ const a = await call('admin-stats', { cookies: [PLAYER, adminCookie] }); const b = await call('admin-stats', { cookies: [OWNER, adminCookie] }); check('ADMIN_USER_EMAILS replaces the default allowlist', a === 200 && b === 404, `${a}/${b}`); }
delete process.env.ADMIN_USER_EMAILS; process.env.ADMIN_USER_IDS = 'u-player';
{ const a = await call('admin-stats', { cookies: [PLAYER, adminCookie] }); check('ADMIN_USER_IDS allowlists by user id', a === 200, String(a)); }
delete process.env.ADMIN_USER_IDS;
{ const hash = process.env.ADMIN_PASSWORD_HASH; delete process.env.ADMIN_PASSWORD_HASH;
  const a = await call('admin-stats', { cookies: [OWNER] }); const b = await call('admin-stats', { cookies: [PLAYER] }); const c = await call('admin-auth', { cookies: [OWNER] });
  check('with no ADMIN_PASSWORD_HASH, the owner account alone opens admin (no password to forget); others still 404', a === 200 && b === 404 && c === 200, `${a}/${b}/${c}`);
  process.env.ADMIN_PASSWORD_HASH = hash; }

const main = await readFile('src/main.ts', 'utf8');
check('no visible Admin button anywhere in the app', !main.includes("'⚙️ Admin'") && !/\['בית','סקירה','בוטים','Adaptive','Windows','Admin'/.test(main));
check('the app does not ask /api/admin-auth for every visitor on open', !/getJson\('\/api\/admin-auth'\)\.then\(r=>\{if\(r\.ok&&r\.data\?\.authenticated\)\{setIsAdmin\(true\);setAdminEmail\(r\.data\.email\|\|''\);\}\}\);\n\s*telemetry\('app_open'/.test(main));
check('admin opens only on the hidden route, signed in, after the server says yes', /location\.hash!==ADMIN_ROUTE\|\|!authUser/.test(main) && /getJson\('\/api\/admin-auth'\)\.then\(r=>\{if\(!r\.ok\)return;/.test(main));
const lib = await readFile('netlify/functions/lib/admin-owner.mjs', 'utf8').catch(() => '');
check('the owner allowlist comes from env only (no email in the code)', lib.includes('ADMIN_USER_EMAILS') && lib.includes('ADMIN_EMAIL') && !/@[a-z0-9-]+\./i.test(lib));

if (failed) { console.log(`FAIL: ${failed} admin owner-only check(s) failed.`); process.exit(1); }
console.log('PASS: admin is hidden (404) for everyone but the allowlisted owner account, with the admin password as a second factor.');
