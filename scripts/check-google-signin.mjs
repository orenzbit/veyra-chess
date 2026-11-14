// Google sign-in (behind GOOGLE_SIGNIN_ENABLED): npm run check:google-signin
// No network: a fake Supabase (Auth + REST) answers like the real one; the real auth.mjs handler runs.
// Rules checked: flag off = no Google at all; PKCE + state; existing Google account signs in; a Google
// login on an email that already has a password account is refused and unlinked (no linking by email
// alone); a new Google user gets NO session until approval + 18+ + terms; then a session is minted.
import crypto from 'node:crypto';

process.env.SUPABASE_URL = 'https://fake-project.supabase.test';
process.env.SUPABASE_ANON_KEY = 'anon-key-not-a-user-token';
process.env.SUPABASE_SECRET_KEY = 'service-key-for-tests';
process.env.AUTH_SESSION_SECRET = crypto.randomBytes(32).toString('base64url');
process.env.BOT_CHALLENGE_SECRET = crypto.randomBytes(32).toString('base64url');
process.env.SITE_URL = 'https://veyra.example.test';
delete process.env.RESEND_API_KEY;
delete process.env.GOOGLE_SIGNIN_ENABLED;

const { makeHumanToken } = await import('../netlify/functions/_lib.mjs');
const { handler, currentSession } = await import('../netlify/functions/auth.mjs');

let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${!ok && detail ? ` (${detail})` : ''}`); if (!ok) failures += 1; };

// Fake Supabase. `next` is the user the next PKCE exchange returns.
const db = { profiles: new Set(), calls: [], next: null, codes: new Map(), access: new Map(), unlink: () => reply(200, 1), verifyAs: null };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
let seq = 0;
const tokens = (user) => ({ access_token: `access-${++seq}`, refresh_token: `refresh-${seq}`, token_type: 'bearer', user });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url)); const body = init.body ? JSON.parse(init.body) : {};
  const call = { method: init.method || 'GET', path: u.pathname, search: u.search, body };
  db.calls.push(call);
  if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'pkce') {
    const entry = db.codes.get(body.auth_code);
    if (!entry) return reply(400, { msg: 'invalid flow state' });
    const ok = crypto.createHash('sha256').update(String(body.code_verifier || '')).digest('base64url') === entry.challenge;
    return ok ? reply(200, tokens(entry.user)) : reply(400, { msg: 'code challenge does not match previously saved code verifier' });
  }
  if (u.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
  if (u.pathname === '/auth/v1/admin/generate_link') return reply(200, { properties: { hashed_token: `hash-for-${body.email}` } });
  if (u.pathname === '/auth/v1/verify') return reply(200, tokens(db.verifyAs || { id: db.next?.id, email: body.token_hash.replace('hash-for-', '') }));
  if (u.pathname === '/auth/v1/admin/users') return reply(500, { msg: 'a Google signup must not create a second user' });
  if (u.pathname === '/rest/v1/rpc/auth_unlink_identity') return db.unlink();
  if (u.pathname === '/rest/v1/user_profiles' && call.method === 'GET') {
    const id = (u.searchParams.get('user_id') || '').replace('eq.', '');
    return reply(200, db.profiles.has(id) ? [{ user_id: id }] : []);
  }
  if (u.pathname === '/rest/v1/user_profiles' && call.method === 'POST') { db.profiles.add(body.user_id); return new Response(null, { status: 201 }); }
  if (u.pathname === '/rest/v1/signup_access_codes' && call.method === 'GET') {
    const id = (u.searchParams.get('id') || '').replace('eq.', '');
    return reply(200, db.access.has(id) ? [db.access.get(id)] : []);
  }
  if (u.pathname.startsWith('/rest/v1/')) return new Response(null, { status: 201 });
  return reply(404, { msg: `unexpected ${u.pathname}` });
};

const human = `__Host-human=${makeHumanToken().token}`;
let ip = 0;
const ev = (method, { query = {}, cookie = '', body } = {}) => ({
  httpMethod: method, rawUrl: `${process.env.SITE_URL}/api/auth`, queryStringParameters: query,
  headers: { origin: process.env.SITE_URL, cookie: [human, cookie].filter(Boolean).join('; '), 'x-nf-client-connection-ip': `203.0.113.${(ip += 1) % 250}` },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const cookiesOf = (res) => [res.headers?.['set-cookie'], ...(res.multiValueHeaders?.['set-cookie'] || [])].flat().filter(Boolean).map(String);
const pick = (res, name) => cookiesOf(res).find((c) => c.startsWith(`${name}=`)) || '';
const pair = (c) => c.split(';')[0];
const SESSION = '__Host-tabia_session';
// Same sealing as auth.mjs (AES-256-GCM, key = sha256(AUTH_SESSION_SECRET)): the operator-approved invite token.
const seal = (payload) => { const key = crypto.createHash('sha256').update(process.env.AUTH_SESSION_SECRET).digest(); const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key, iv); const enc = Buffer.concat([c.update(JSON.stringify(payload)), c.final()]); return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url'); };

// 1. Flag off: nothing Google exists.
let status = JSON.parse((await handler(ev('GET', { query: { action: 'status' } }))).body);
check('flag off: status says googleSignIn false', status.googleSignIn === false);
check('flag off: google-start is 404', (await handler(ev('GET', { query: { action: 'google-start' } }))).statusCode === 404);
check('flag off: google-callback is 404', (await handler(ev('GET', { query: { action: 'google-callback', code: 'x' } }))).statusCode === 404);

process.env.GOOGLE_SIGNIN_ENABLED = 'true';
status = JSON.parse((await handler(ev('GET', { query: { action: 'status' } }))).body);
check('flag on: status says googleSignIn true', status.googleSignIn === true);

// 2. Start: PKCE (S256) + state, short-lived HttpOnly cookie.
async function start() {
  const res = await handler(ev('GET', { query: { action: 'google-start' } }));
  const to = new URL(res.headers.location);
  const back = new URL(to.searchParams.get('redirect_to'));
  return { res, to, back, flow: pair(pick(res, '__Host-veyra_google')), state: back.searchParams.get('gs'), challenge: to.searchParams.get('code_challenge') };
}
const s1 = await start();
check('start redirects to Supabase /authorize?provider=google', s1.res.statusCode === 302 && s1.to.origin === process.env.SUPABASE_URL && s1.to.pathname === '/auth/v1/authorize' && s1.to.searchParams.get('provider') === 'google');
check('start uses PKCE S256', s1.to.searchParams.get('code_challenge_method') === 's256' && /^[A-Za-z0-9_-]{43}$/.test(s1.challenge || ''));
check('callback URL is on SITE_URL, not the request Host', s1.back.origin === process.env.SITE_URL && s1.back.searchParams.get('action') === 'google-callback');
const flowCookie = pick(s1.res, '__Host-veyra_google');
check('flow cookie is HttpOnly, Secure, SameSite=Lax, 10 min', /HttpOnly/.test(flowCookie) && /Secure/.test(flowCookie) && /SameSite=Lax/.test(flowCookie) && /Max-Age=600/.test(flowCookie));

const callback = (s, code, user, gs = s.state) => { db.codes.set(code, { challenge: s.challenge, user }); return handler(ev('GET', { query: { action: 'google-callback', code, gs }, cookie: s.flow })); };

// 3. Wrong state / no flow cookie.
let res = await callback(s1, 'code-a', { id: 'u-x', email: 'x@example.test', identities: [{ provider: 'google' }] }, 'not-the-state');
check('wrong state: refused, no session', /auth=google_expired/.test(res.headers.location) && !pick(res, SESSION));
res = await handler(ev('GET', { query: { action: 'google-callback', code: 'code-a', gs: s1.state } }));
check('no flow cookie: refused, no session', /auth=google_expired/.test(res.headers.location) && !pick(res, SESSION));

// 4. Existing Google account with a Veyra profile signs in.
const GOOGLE_USER = { id: 'aaaaaaaa-1111-4111-8111-111111111111', email: 'g.player@example.test', identities: [{ provider: 'google' }] };
db.profiles.add(GOOGLE_USER.id);
let s = await start();
res = await callback(s, 'code-b', GOOGLE_USER);
const sess = pick(res, SESSION);
check('existing Google account: session cookie, back to the site', res.statusCode === 302 && res.headers.location === `${process.env.SITE_URL}/` && sess && currentSession({ headers: { cookie: pair(sess) } })?.user_id === GOOGLE_USER.id);
check('flow cookie is cleared after use', /Max-Age=0/.test(pick(res, '__Host-veyra_google')));

// 5. Google login on an email that already has a password account: refused + unlinked.
const PASSWORD_USER = { id: 'bbbbbbbb-2222-4222-8222-222222222222', email: 'pw.player@example.test', identities: [{ provider: 'email' }, { provider: 'google' }] };
db.profiles.add(PASSWORD_USER.id);
s = await start(); let mark = db.calls.length;
res = await callback(s, 'code-c', PASSWORD_USER);
const after = db.calls.slice(mark);
check('email already has a password account: no session', !pick(res, SESSION) && /auth=google_email_exists/.test(res.headers.location));
check('...the Supabase session from that login is ended', after.some((c) => c.path === '/auth/v1/logout' && c.search === '?scope=local'));
check('...and the just-linked Google identity is removed', after.some((c) => c.path === '/rest/v1/rpc/auth_unlink_identity' && c.body.p_user_id === PASSWORD_USER.id && c.body.p_provider === 'google'));

// 6. New Google user: no session, only a 30-minute pending marker.
const NEW_USER = { id: 'cccccccc-3333-4333-8333-333333333333', email: 'new.player@example.test', identities: [{ provider: 'google' }] };
db.next = NEW_USER;
s = await start(); mark = db.calls.length;
res = await callback(s, 'code-d', NEW_USER);
const pending = pick(res, '__Host-veyra_google_pending');
check('new Google user: no session cookie', !pick(res, SESSION));
check('new Google user: sent to finish signup, Supabase session ended', /auth=google_complete/.test(res.headers.location) && db.calls.slice(mark).some((c) => c.path === '/auth/v1/logout'));
check('pending marker is HttpOnly/Secure, 30 min', /HttpOnly/.test(pending) && /Secure/.test(pending) && /Max-Age=1800/.test(pending));

// 7. Finishing signup with Google: same approval, 18+ and terms rules as a password signup.
const ROW = 'row-1';
db.access.set(ROW, { id: ROW, email: NEW_USER.email, status: 'code_verified', used_at: new Date().toISOString(), revoked_at: null, signup_completed: false, expires_at: new Date(Date.now() + 600000).toISOString() });
const invite = seal({ kind: 'invite', row_id: ROW, email: NEW_USER.email, exp: Math.floor(Date.now() / 1000) + 600 });
const today = new Date();
const seventeen = `${today.getUTCFullYear() - 17}-01-01`;
const form = (extra) => ({ action: 'signup', google: true, email: NEW_USER.email, username: 'newplayer', fullName: 'New Player', country: 'Israel', acceptTerms: true, language: 'en', accessToken: invite, ...extra });
res = await handler(ev('POST', { body: form({}) }));
check('google signup without the pending marker: refused', res.statusCode === 401 && JSON.parse(res.body).error === 'GOOGLE_SESSION_EXPIRED');
res = await handler(ev('POST', { cookie: pair(pending), body: form({ birthDate: seventeen }) }));
check('google signup at 17: AGE_RESTRICTED, no session', JSON.parse(res.body).error === 'AGE_RESTRICTED' && !pick(res, SESSION));
res = await handler(ev('POST', { cookie: pair(pending), body: form({ birthDate: '1990-05-05', acceptTerms: false }) }));
check('google signup without terms: TERMS_REQUIRED', JSON.parse(res.body).error === 'TERMS_REQUIRED');
res = await handler(ev('POST', { cookie: pair(pending), body: form({ birthDate: '1990-05-05', accessToken: 'forged' }) }));
check('google signup without operator approval: ACCESS_CODE_EXPIRED', JSON.parse(res.body).error === 'ACCESS_CODE_EXPIRED');
mark = db.calls.length;
res = await handler(ev('POST', { cookie: pair(pending), body: form({ birthDate: '1990-05-05' }) }));
const made = db.calls.slice(mark);
const sess2 = pick(res, SESSION);
check('google signup 18+ with approval: session for the Google user', res.statusCode === 200 && currentSession({ headers: { cookie: pair(sess2) } })?.user_id === NEW_USER.id, res.body);
check('...no password and no second user created', !made.some((c) => c.path === '/auth/v1/admin/users') && !made.some((c) => c.path === '/auth/v1/token'));
check('...profile stored for the Google user id', db.profiles.has(NEW_USER.id));
check('...pending marker cleared', /Max-Age=0/.test(pick(res, '__Host-veyra_google_pending')));

// 8. Password signup still requires a 10+ character password.
res = await handler(ev('POST', { body: { ...form({ birthDate: '1990-05-05' }), google: undefined, password: 'short' } }));
check('password signup unchanged: short password rejected', JSON.parse(res.body).error === 'VALIDATION_ERROR');

// 9. The unlink fails: never answer as if the Google identity were removed.
for (const [label, unlink] of [['RPC answers 503', () => reply(503, { message: 'unavailable' })], ['RPC removes 0 rows', () => reply(200, 0)], ['network failure', () => { throw new TypeError('fetch failed'); }]]) {
  db.unlink = unlink;
  s = await start();
  const quiet = console.error; const logged = []; console.error = (...a) => logged.push(a.map(String).join(' '));
  res = await callback(s, `code-u-${label}`, PASSWORD_USER);
  console.error = quiet; db.unlink = () => reply(200, 1);
  check(`unlink fails (${label}): no session and NOT reported as "email exists, identity removed"`, !pick(res, SESSION) && /auth=google_failed/.test(res.headers.location) && !/google_email_exists/.test(res.headers.location), res.headers.location);
  check(`  ...logged as an identity still linked`, logged.some((l) => l.includes('still linked')), logged.join(' | '));
}

// 10. A session cookie is only made for the user the approval was for: token.user.id must equal user_id.
const OTHER = { id: 'dddddddd-4444-4444-8444-444444444444', email: 'someone.else@example.test' };
const NEW2 = { id: 'eeeeeeee-5555-4555-8555-555555555555', email: 'new2.player@example.test', identities: [{ provider: 'google' }] };
db.next = NEW2;
s = await start();
res = await callback(s, 'code-e', NEW2);
const pending2 = pick(res, '__Host-veyra_google_pending');
db.access.set('row-2', { id: 'row-2', email: NEW2.email, status: 'code_verified', used_at: new Date().toISOString(), revoked_at: null, signup_completed: false, expires_at: new Date(Date.now() + 600000).toISOString() });
const invite2 = seal({ kind: 'invite', row_id: 'row-2', email: NEW2.email, exp: Math.floor(Date.now() / 1000) + 600 });
db.verifyAs = OTHER; mark = db.calls.length;
const quiet10 = console.error; console.error = () => {};
res = await handler(ev('POST', { cookie: pair(pending2), body: { ...form({ birthDate: '1990-05-05' }), email: NEW2.email, username: 'newplayer2', accessToken: invite2 } }));
console.error = quiet10; db.verifyAs = null;
check('minted session belongs to another user: no session cookie, refused', !pick(res, SESSION) && res.statusCode === 401 && JSON.parse(res.body).error === 'GOOGLE_SESSION_MISMATCH', `${res.statusCode} ${res.body}`);
check('  ...and that stray Supabase session is ended', db.calls.slice(mark).some((c) => c.path === '/auth/v1/logout'));

if (failures) { console.log(`FAIL: ${failures} Google sign-in check(s) failed.`); process.exit(1); }
console.log('PASS: Google sign-in is off by default, uses PKCE + state, never links by email, and creates no session before approval + 18+ + terms.');
