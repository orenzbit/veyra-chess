// Regression checks for the signed-in session: npm run check:auth-session
// No network: a fake Supabase Auth (GoTrue) answers like the real one, so the session check and
// the token-refresh path run through the real netlify/functions/auth.mjs handler.
import crypto from 'node:crypto';

process.env.SUPABASE_URL = 'https://fake-project.supabase.test';
process.env.SUPABASE_ANON_KEY = 'anon-key-not-a-user-token';
process.env.SUPABASE_SECRET_KEY = 'service-key-for-tests';
process.env.AUTH_SESSION_SECRET = crypto.randomBytes(32).toString('base64url');
process.env.BOT_CHALLENGE_SECRET = crypto.randomBytes(32).toString('base64url');
delete process.env.RESEND_API_KEY;

const { makeHumanToken } = await import('../netlify/functions/_lib.mjs');
const { handler, currentSession } = await import('../netlify/functions/auth.mjs');

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${!ok && detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

// Fake GoTrue: only a live user access token reads /user; the anon key is not a user token.
const auth = { live: new Set(), refresh: new Map(), seq: 0, calls: [] };
function issue() {
  const n = (auth.seq += 1);
  const access = `user-access-${n}`;
  const refresh = `user-refresh-${n}`;
  auth.live.add(access);
  auth.refresh.set(refresh, access);
  return { access_token: access, refresh_token: refresh, token_type: 'bearer', expires_in: 3600, user: USER };
}
const USER = { id: '11111111-2222-4333-8444-555555555555', email: 'player@example.test', user_metadata: { username: 'player' }, email_confirmed_at: '2026-01-01T00:00:00Z' };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  const headers = new Headers(init.headers || {});
  const bearer = String(headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const call = { path: u.pathname, grant: u.searchParams.get('grant_type'), bearer, apikey: headers.get('apikey') };
  auth.calls.push(call);
  if (call.apikey !== process.env.SUPABASE_ANON_KEY) return reply(401, { msg: 'No API key found in request' });
  if (u.pathname === '/auth/v1/user') {
    return auth.live.has(bearer) ? reply(200, USER) : reply(403, { msg: 'invalid claim: missing sub claim' });
  }
  if (u.pathname === '/auth/v1/token' && call.grant === 'password') {
    const body = JSON.parse(init.body || '{}');
    return body.password === 'correct-horse-battery' ? reply(200, issue()) : reply(400, { msg: 'Invalid login credentials' });
  }
  if (u.pathname === '/auth/v1/token' && call.grant === 'refresh_token') {
    const { refresh_token } = JSON.parse(init.body || '{}');
    if (!auth.refresh.has(refresh_token)) return reply(400, { msg: 'Invalid Refresh Token: Refresh Token Not Found' });
    auth.refresh.delete(refresh_token); // Supabase rotates refresh tokens: each one works once.
    return reply(200, issue());
  }
  return reply(404, { msg: `unexpected ${u.pathname}` });
};

const ORIGIN = 'https://example.test';
let ip = 0;
const human = `__Host-human=${makeHumanToken().token}`;
const event = (method, { body, cookie = '', query = {} } = {}) => ({
  httpMethod: method,
  rawUrl: `${ORIGIN}/api/auth`,
  headers: { origin: ORIGIN, cookie: [human, cookie].filter(Boolean).join('; '), 'x-nf-client-connection-ip': `198.51.100.${(ip += 1)}` },
  queryStringParameters: query,
  body: body === undefined ? undefined : JSON.stringify(body),
});
const sessionCookieFrom = (res) => String(res.headers?.['set-cookie'] || '').split(';')[0];
const session = (cookie) => handler(event('GET', { cookie, query: { action: 'session' } }));
const parse = (res) => JSON.parse(res.body || '{}');
const since = (n) => auth.calls.slice(n);

// 1. Login still authenticates with the anon key and returns a session cookie.
let mark = auth.calls.length;
const login = await handler(event('POST', { body: { action: 'login', email: USER.email, password: 'correct-horse-battery' } }));
const cookie1 = sessionCookieFrom(login);
const loginCall = since(mark).find(c => c.grant === 'password');
check('login answers 200 with a session cookie', login.statusCode === 200 && cookie1.startsWith('__Host-tabia_session='), `status ${login.statusCode}`);
check('login request to Supabase still carries the anon key as Authorization', loginCall?.bearer === process.env.SUPABASE_ANON_KEY, `bearer ${loginCall?.bearer}`);
const tokens1 = currentSession({ headers: { cookie: cookie1 } });

// 2. The session check after a page refresh sends the USER's access token (the PR #114 bug).
mark = auth.calls.length;
const s1 = await session(cookie1);
const userCall = since(mark).find(c => c.path === '/auth/v1/user');
check('session check sends the user access token to /auth/v1/user', userCall?.bearer === tokens1?.access_token, `bearer ${userCall?.bearer}`);
check('session check after refresh reports authenticated: true', parse(s1).authenticated === true && parse(s1).user?.id === USER.id, s1.body);
check('a valid session needs no token refresh', !since(mark).some(c => c.grant === 'refresh_token'));

// 3. Repeated page refreshes keep the user signed in.
let cookie = sessionCookieFrom(s1) || cookie1;
let stays = true;
for (let i = 0; i < 3; i += 1) {
  const r = await session(cookie);
  stays &&= parse(r).authenticated === true;
  cookie = sessionCookieFrom(r) || cookie;
}
check('three more page refreshes stay authenticated', stays);

// 4. Expired access token: the server refreshes once, rotates both tokens and stays signed in.
auth.live.delete(currentSession({ headers: { cookie } })?.access_token);
mark = auth.calls.length;
const s2 = await session(cookie);
const refreshCall = since(mark).find(c => c.grant === 'refresh_token');
const rotated = currentSession({ headers: { cookie: sessionCookieFrom(s2) } });
check('expired access token triggers one refresh_token grant', since(mark).filter(c => c.grant === 'refresh_token').length === 1);
check('refresh request carries the anon key (no user token needed)', refreshCall?.bearer === process.env.SUPABASE_ANON_KEY, `bearer ${refreshCall?.bearer}`);
check('after refresh the user is still authenticated', parse(s2).authenticated === true, s2.body);
check('refresh rotates access and refresh tokens in the new cookie', rotated && rotated.access_token !== tokens1?.access_token && rotated.refresh_token !== tokens1?.refresh_token && auth.live.has(rotated.access_token));
const afterRefreshUser = since(mark).filter(c => c.path === '/auth/v1/user').at(-1);
check('the post-refresh /user call uses the NEW access token', afterRefreshUser?.bearer === rotated?.access_token, `bearer ${afterRefreshUser?.bearer}`);

// 5. The rotated cookie keeps working; the second expiry refreshes again.
const s3 = await session(sessionCookieFrom(s2));
auth.live.delete(rotated?.access_token);
const s4 = await session(sessionCookieFrom(s3) || sessionCookieFrom(s2));
check('rotated cookie works and a second expiry refreshes again', parse(s3).authenticated === true && parse(s4).authenticated === true);

// 6. Fail closed.
const stale = await session(cookie1); // its refresh token was already rotated away and its access token expired
auth.live.clear(); auth.refresh.clear();
const revoked = await session(sessionCookieFrom(s4));
check('a reused (already rotated) refresh token is refused', parse(stale).authenticated === false);
const revokedCookie = String(revoked.headers?.['set-cookie'] || '');
check('revoked access and refresh tokens give authenticated: false (no live cookie set)', parse(revoked).authenticated === false && (!revokedCookie || /Max-Age=0\b/i.test(revokedCookie)), revokedCookie);
mark = auth.calls.length;
const none = await session('');
const forged = await session('__Host-tabia_session=' + Buffer.from('not-a-real-cookie-value-123456789').toString('base64url'));
check('no cookie / forged cookie give authenticated: false without calling Supabase', parse(none).authenticated === false && parse(forged).authenticated === false && since(mark).length === 0);

if (failures) {
  console.error(`FAIL: ${failures} auth session check(s) failed.`);
  process.exit(1);
}
console.log('PASS: login, session check after refresh, token refresh/rotation and fail-closed session paths.');
