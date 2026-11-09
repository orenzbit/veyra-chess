// Real logout checks: npm run check:auth-logout
// No network: a fake Supabase (Auth sessions + the auth_session_active RPC) behaves like the real one,
// measured against local Supabase (GoTrue v2.197): logout deletes the session, refresh tokens die with it,
// and an access token JWT stays signature-valid until exp, so the server must check the session itself.
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const TEST_PASSWORD = randomUUID(); // generated per run, never a fixed string

process.env.SUPABASE_URL = 'https://fake-project.supabase.test';
process.env.SUPABASE_ANON_KEY = 'anon-key-not-a-user-token';
process.env.SUPABASE_SECRET_KEY = 'service-key-for-tests';
process.env.AUTH_SESSION_SECRET = crypto.randomBytes(32).toString('base64url');
process.env.BOT_CHALLENGE_SECRET = crypto.randomBytes(32).toString('base64url');
delete process.env.RESEND_API_KEY;

const { makeHumanToken } = await import('../netlify/functions/_lib.mjs');
const authModule = await import('../netlify/functions/auth.mjs');
const { handler: auth, currentSession } = authModule;
const { handler: sync } = await import('../netlify/functions/sync.mjs');
const schema = await readFile('public/data/supabase-schema.sql', 'utf8');

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${!ok && detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

const USER = { id: '11111111-2222-4333-8444-555555555555', email: 'player@example.test', user_metadata: {} };
const sb = { sessions: new Map(), access: new Map(), refresh: new Map(), expired: new Set(), calls: [], rpcDown: false, authDown: null };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function tokens(sessionId) {
  const access = `${b64({ alg: 'HS256' })}.${b64({ sub: USER.id, session_id: sessionId, exp: Math.floor(Date.now() / 1000) + 3600, n: crypto.randomUUID() })}.sig`;
  const refresh = crypto.randomUUID();
  sb.access.set(access, sessionId);
  sb.refresh.set(refresh, sessionId);
  return { access_token: access, refresh_token: refresh, user: USER };
}
const reply = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  const bearer = String(new Headers(init.headers || {}).get('authorization') || '').replace(/^Bearer\s+/i, '');
  const body = init.body ? JSON.parse(init.body) : {};
  sb.calls.push({ path: u.pathname, scope: u.searchParams.get('scope'), grant: u.searchParams.get('grant_type'), bearer });
  if (sb.authDown && u.pathname.startsWith('/auth/v1/')) { if (sb.authDown === 'network') throw new TypeError('fetch failed'); return reply(sb.authDown, { msg: 'upstream unavailable' }); }
  const liveAccess = (t) => sb.access.has(t) && !sb.expired.has(t) && sb.sessions.has(sb.access.get(t));
  if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
    const id = crypto.randomUUID(); sb.sessions.set(id, USER.id); return reply(200, tokens(id));
  }
  if (u.pathname === '/auth/v1/token') {
    const id = sb.refresh.get(body.refresh_token);
    if (!id || !sb.sessions.has(id)) return reply(400, { error_code: 'refresh_token_not_found' });
    sb.refresh.delete(body.refresh_token); return reply(200, tokens(id)); // same session id after refresh
  }
  if (u.pathname === '/auth/v1/user') return liveAccess(bearer) ? reply(200, USER) : reply(403, { error_code: 'session_not_found' });
  if (u.pathname === '/auth/v1/logout') {
    if (!liveAccess(bearer)) return reply(401, { msg: 'invalid JWT' });
    const id = sb.access.get(bearer), scope = u.searchParams.get('scope') || 'global';
    for (const s of [...sb.sessions.keys()]) if (scope === 'global' || (scope === 'local' ? s === id : s !== id)) sb.sessions.delete(s);
    return reply(204);
  }
  if (u.pathname === '/rest/v1/rpc/auth_session_active') {
    if (bearer !== process.env.SUPABASE_SECRET_KEY) return reply(401, { message: 'permission denied' });
    return sb.rpcDown ? reply(503, { message: 'unavailable' }) : reply(200, sb.sessions.has(body.p_session_id));
  }
  if (u.pathname.startsWith('/rest/v1/')) return reply(200, []);
  return reply(404, { msg: `unexpected ${u.pathname}` });
};

const ORIGIN = 'https://example.test';
let ip = 0;
const human = `__Host-human=${makeHumanToken().token}`;
const ev = (method, { body, cookie = '', query = {}, path = '/api/auth' } = {}) => ({
  httpMethod: method, rawUrl: `${ORIGIN}${path}`, queryStringParameters: query,
  headers: { origin: ORIGIN, host: 'example.test', cookie: [human, cookie].filter(Boolean).join('; '), 'x-nf-client-connection-ip': `198.51.100.${(ip += 1)}` },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const cookieOf = (res) => String(res.headers?.['set-cookie'] || '').split(';')[0];
const login = async () => cookieOf(await auth(ev('POST', { body: { action: 'login', email: USER.email, password: TEST_PASSWORD } })));
const session = async (cookie) => JSON.parse((await auth(ev('GET', { cookie, query: { action: 'session' } }))).body).authenticated;
const syncStatus = async (cookie) => (await sync(ev('GET', { cookie, path: '/api/sync' }))).statusCode;
const logout = (cookie) => auth(ev('POST', { cookie, body: { action: 'logout' } }));

const live = authModule.liveSession;
check('auth.mjs exports liveSession (server-side session check)', typeof live === 'function');

// 1. Logout ends this device's Supabase session (scope=local) and clears the cookie.
const deviceA = await login(), deviceB = await login();
check('two devices signed in, both reach /api/sync', (await syncStatus(deviceA)) === 200 && (await syncStatus(deviceB)) === 200);
const copied = deviceA; // someone copied device A's cookie before logout
let mark = sb.calls.length;
const out = await logout(deviceA);
const logoutCall = sb.calls.slice(mark).find(c => c.path === '/auth/v1/logout');
check('logout answers 200 and clears the cookie', out.statusCode === 200 && /Max-Age=0/.test(out.headers['set-cookie']));
check('logout revokes the Supabase session with the user token, scope=local', logoutCall?.scope === 'local' && logoutCall?.bearer === currentSession({ headers: { cookie: copied } })?.access_token, JSON.stringify(logoutCall));

// 2. The copied cookie is dead everywhere, even though its access token JWT has not expired.
check('copied cookie after logout: /api/auth?action=session is false', (await session(copied)) === false);
check('copied cookie after logout: /api/sync answers 401', (await syncStatus(copied)) === 401);
const reuse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', body: JSON.stringify({ refresh_token: currentSession({ headers: { cookie: copied } })?.refresh_token }) });
check('copied cookie after logout: its refresh token is refused', reuse.status === 400);

// 3. scope=local: the other device stays signed in.
check('other device still signed in (session + /api/sync)', (await session(deviceB)) === true && (await syncStatus(deviceB)) === 200);

// 4. A refreshed session keeps working: the session id survives token refresh.
const tokB = currentSession({ headers: { cookie: deviceB } });
sb.expired.add(tokB.access_token);
const refreshed = await auth(ev('GET', { cookie: deviceB, query: { action: 'session' } }));
const deviceB2 = cookieOf(refreshed) || deviceB;
check('after an access-token refresh, /api/sync still answers 200', JSON.parse(refreshed.body).authenticated === true && (await syncStatus(deviceB2)) === 200);

// 5. Logout with an expired access token refreshes once, then still revokes the session.
const deviceC = await login();
sb.expired.add(currentSession({ headers: { cookie: deviceC } }).access_token);
mark = sb.calls.length;
await logout(deviceC);
const seq = sb.calls.slice(mark).map(c => c.grant || c.path.replace('/auth/v1/', ''));
check('expired access token at logout: refresh, then logout', seq.includes('refresh_token') && seq.lastIndexOf('logout') > seq.indexOf('refresh_token'), seq.join(','));
check('expired-token logout leaves the session revoked', (await syncStatus(deviceC)) === 401);

// 6. Fail closed.
const deviceD = await login();
sb.rpcDown = true;
const quiet = console.error; const logged = []; console.error = (...a) => logged.push(a.join(' '));
const down = await syncStatus(deviceD);
console.error = quiet; sb.rpcDown = false;
check('session check unavailable -> 401 (fail closed) and logged server-side', down === 401 && logged.some(l => l.includes('session check failed')));
const noSid = { headers: { cookie: deviceD.replace(/=.*/, '=') } };
check('no cookie -> no live session', live ? (await live(noSid)) === null : false);

// 7. Schema: the RPC exists, reads auth.sessions as definer, and only the server key may call it.
check('schema defines public.auth_session_active as security definer', /create or replace function public\.auth_session_active\(p_session_id uuid\)[\s\S]*security definer[\s\S]*auth\.sessions/i.test(schema));
check('schema revokes the RPC from browser roles and grants service_role', /revoke all on function public\.auth_session_active\(uuid\) from public, anon, authenticated;/i.test(schema) && /grant execute on function public\.auth_session_active\(uuid\) to service_role;/i.test(schema));

// 8. Logout must not claim success when the Supabase session could not be revoked.
//    Decision: answer 503 LOGOUT_UNAVAILABLE and keep the cookie, so browser and server still agree
//    (signed in) and the user can retry; a session Supabase already ended counts as signed out.
for (const failure of ['network', 503, 429]) {
  const deviceE = await login();
  sb.authDown = failure;
  const quietE = console.error; const loggedE = []; console.error = (...a) => loggedE.push(a.join(' '));
  const failed = await logout(deviceE);
  console.error = quietE; sb.authDown = null;
  const failedBody = JSON.parse(failed.body || '{}');
  check(`Auth ${failure === 'network' ? 'unreachable (network failure)' : `answers ${failure}`} during logout -> 503, ok:false, no success claimed`, failed.statusCode === 503 && failedBody.ok === false && failedBody.error === 'LOGOUT_UNAVAILABLE', `${failed.statusCode} ${failed.body}`);
  check(`  ...and the cookie is NOT cleared, the session is still live, and the failure is logged`, !failed.headers?.['set-cookie'] && (await syncStatus(deviceE)) === 200 && loggedE.some(l => l.includes('could not revoke')), String(failed.headers?.['set-cookie']));
  const retry = await logout(deviceE);
  check(`  ...a retry once Auth is back answers 200, clears the cookie and kills the session`, retry.statusCode === 200 && /Max-Age=0/.test(retry.headers['set-cookie']) && (await syncStatus(deviceE)) === 401);
}
const deviceF = await login();
sb.sessions.delete(sb.access.get(currentSession({ headers: { cookie: deviceF } }).access_token)); // ended elsewhere (global sign-out)
const already = await logout(deviceF);
check('session Supabase already ended -> logout answers 200 and clears the cookie', already.statusCode === 200 && /Max-Age=0/.test(already.headers['set-cookie']), `${already.statusCode}`);
const client = await readFile('src/main.ts', 'utf8');
check('client: a failed logout keeps the user signed in and says so (no local sign-out on !ok)', /onLogout:async\(\)=>\{const r=await postJson\('\/api\/auth',\{action:'logout'\}\);if\(isNetworkFailure\(r\)\)\{[^}]*\}if\(!r\.ok\)\{alert\([^;]*\);return;\}/.test(client));

if (failures) { console.error(`FAIL: ${failures} logout check(s) failed.`); process.exit(1); }
console.log('PASS: logout revokes the Supabase session (scope=local), copied cookies stop working, other devices stay signed in, fail closed, and a failed revoke is never reported as a logout.');
