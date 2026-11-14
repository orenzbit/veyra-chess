// Analyze it yourself after Logout: npm run check:analyze-yourself-logout (also run from check:chess-dna)
// A cookie copied before Logout must not reach list, start or score afterwards. No network: the same fake
// Supabase as scripts/check-auth-logout.mjs (Auth sessions + the auth_session_active RPC), plus one stored
// Chess DNA game. The handler under test is the shipped export with its real session check (nothing injected).
import crypto, { randomUUID } from 'node:crypto';
const TEST_PASSWORD = randomUUID(); // generated per run, never a fixed string

process.env.SUPABASE_URL = 'https://fake-project.supabase.test';
process.env.SUPABASE_ANON_KEY = 'anon-key-not-a-user-token';
process.env.SUPABASE_SECRET_KEY = 'service-key-for-tests';
process.env.AUTH_SESSION_SECRET = crypto.randomBytes(32).toString('base64url');
process.env.BOT_CHALLENGE_SECRET = crypto.randomBytes(32).toString('base64url');
process.env.ANALYZE_YOURSELF_ENABLED = 'true';
delete process.env.RESEND_API_KEY;

const { makeHumanToken } = await import('../netlify/functions/_lib.mjs');
const { handler: auth } = await import('../netlify/functions/auth.mjs');
const { handler: analyze } = await import('../netlify/functions/analyze-yourself.mjs');
const { hashPgn } = await import('../netlify/functions/chess-dna.mjs');

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${!ok && detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

const USER = { id: '11111111-2222-4333-8444-555555555555', email: 'player@example.test', user_metadata: {} };
const PGN = '[Event "Test"]\n[White "A"]\n[Black "B"]\n[WhiteElo "1650"]\n[BlackElo "?"]\n\n1. e4 e5 2. Ke2 Qh4 3. Ke1 Qxe4+ 4. Qe2 *';
const FP = hashPgn(PGN);
const STORED = ['book', 'book', 'blunder', 'great', 'mistake', 'best', 'forced'];
const ROW = { fingerprint: FP, game_json: { date: '2026-10-01', timeClass: 'blitz', playerColor: 'white', plies: 7,
  analysis: { moves: STORED.map((classification, index) => ({ index, classification })) } } };

const sb = { sessions: new Map(), access: new Map(), refresh: new Map(), dnaReads: [] };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function tokens(sessionId) {
  const access = `${b64({ alg: 'HS256' })}.${b64({ sub: USER.id, session_id: sessionId, exp: Math.floor(Date.now() / 1000) + 3600, n: crypto.randomUUID() })}.sig`;
  const refresh = crypto.randomUUID();
  sb.access.set(access, sessionId); sb.refresh.set(refresh, sessionId);
  return { access_token: access, refresh_token: refresh, user: USER };
}
const reply = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  const bearer = String(new Headers(init.headers || {}).get('authorization') || '').replace(/^Bearer\s+/i, '');
  const body = init.body ? JSON.parse(init.body) : {};
  const liveAccess = (t) => sb.access.has(t) && sb.sessions.has(sb.access.get(t));
  if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
    const id = crypto.randomUUID(); sb.sessions.set(id, USER.id); return reply(200, tokens(id));
  }
  if (u.pathname === '/auth/v1/token') {
    const id = sb.refresh.get(body.refresh_token);
    if (!id || !sb.sessions.has(id)) return reply(400, { error_code: 'refresh_token_not_found' });
    sb.refresh.delete(body.refresh_token); return reply(200, tokens(id));
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
    return reply(200, sb.sessions.has(body.p_session_id));
  }
  if (u.pathname === '/rest/v1/user_chess_dna_games') {
    sb.dnaReads.push(u.search);
    if (u.searchParams.get('user_id') !== `eq.${USER.id}`) return reply(200, []);
    const select = u.searchParams.get('select') || '';
    return reply(200, [select === 'fingerprint,game_json' ? ROW
      : { fingerprint: FP, date: ROW.game_json.date, timeClass: ROW.game_json.timeClass, playerColor: ROW.game_json.playerColor, plies: ROW.game_json.plies }]);
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
const logout = (cookie) => auth(ev('POST', { cookie, body: { action: 'logout' } }));

const AY = '/api/analyze-yourself';
const GUESSES = STORED.map(c => (c === 'book' || c === 'forced') ? null : 'good');
const actions = {
  list: (cookie) => analyze(ev('GET', { cookie, path: AY, query: { action: 'list', fingerprints: FP } })),
  start: (cookie) => analyze(ev('POST', { cookie, path: AY, body: { action: 'start', fingerprint: FP, pgn: PGN } })),
  score: (cookie) => analyze(ev('POST', { cookie, path: AY, body: { action: 'score', fingerprint: FP, pgn: PGN, guesses: GUESSES, eloGuess: { white: 1500, black: 1500 } } })),
};
const statuses = async (cookie) => Object.fromEntries(await Promise.all(Object.entries(actions).map(async ([name, run]) => [name, (await run(cookie)).statusCode])));

const deviceA = await login(), deviceB = await login();
check('two devices signed in', Boolean(deviceA && deviceB && deviceA !== deviceB));
const before = await statuses(deviceA);
check('before Logout: list, start and score answer 200 for device A', Object.values(before).every(s => s === 200), JSON.stringify(before));

const copied = deviceA; // someone copied device A's cookie before Logout
const out = await logout(deviceA);
check('Logout answers 200', out.statusCode === 200, String(out.statusCode));

const after = await statuses(copied);
for (const name of Object.keys(actions)) {
  check(`copied cookie after Logout: ${name} answers 401`, after[name] === 401, `got ${after[name]}`);
}
const readsBefore = sb.dnaReads.length;
await statuses(copied);
check('copied cookie after Logout: no stored game is read', sb.dnaReads.length === readsBefore, `${sb.dnaReads.length - readsBefore} reads`);

const other = await statuses(deviceB);
check('other device (not logged out) still gets 200 on list, start and score', Object.values(other).every(s => s === 200), JSON.stringify(other));

if (failures) { console.error(`FAIL: ${failures} analyze-yourself logout check(s) failed.`); process.exit(1); }
console.log('PASS: analyze-yourself refuses a cookie copied before Logout (list, start, score = 401); other devices keep working.');
