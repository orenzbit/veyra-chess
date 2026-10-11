// Automated checks for the bot protection (human check): npm run check:human
// No browser needed. It plays both sides: a "bot" that cannot solve the challenge and a "human" that can.
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

process.env.BOT_CHALLENGE_SECRET = crypto.randomBytes(32).toString('base64url');
delete process.env.SITE_GATE_PASSWORD;

const lib = await import('../netlify/functions/_lib.mjs');
const { handler } = await import('../netlify/functions/human.mjs');
const authSource = await readFile('netlify/functions/auth.mjs', 'utf8');
const adminSource = await readFile('netlify/functions/admin-auth.mjs', 'utf8');
const gateSource = await readFile('netlify/edge-functions/gate.ts', 'utf8');

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${!ok && detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

const ORIGIN = 'https://example.test';
let ipCounter = 0;
const nextIp = () => `203.0.113.${(ipCounter += 1)}`;
function event(method, { body, cookie, origin = ORIGIN, ip = nextIp(), query = '' } = {}) {
  return {
    httpMethod: method,
    headers: { origin, cookie: cookie || '', 'x-nf-client-connection-ip': ip },
    rawUrl: `${ORIGIN}/api/human${query}`,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
const parse = (res) => JSON.parse(res.body || '{}');
const cookieFrom = (res) => String(res.headers?.['set-cookie'] || '').split(';')[0];

// 1. Fails closed without a secret
{
  const saved = process.env.BOT_CHALLENGE_SECRET;
  delete process.env.BOT_CHALLENGE_SECRET;
  const res = await handler(event('GET'));
  check('without BOT_CHALLENGE_SECRET the endpoint answers 503 (fails closed)', res.statusCode === 503);
  check('without BOT_CHALLENGE_SECRET no cookie is ever valid', lib.requireHuman({ headers: { cookie: '__Host-human=x.y.z' } }) === false);
  process.env.BOT_CHALLENGE_SECRET = saved;
}

// 2. A human gets a challenge, solves it, gets a cookie
const challengeRes = await handler(event('GET', { query: '?action=challenge' }));
const challenge = parse(challengeRes);
check('challenge is issued', challengeRes.statusCode === 200 && challenge.signature && challenge.parameters);
check('challenge is never cached', /no-store/.test(challengeRes.headers['cache-control'] || ''));

const solution = await solveChallenge({ challenge, deriveKey, timeout: 60000 });
check('a real solver can solve the challenge', Boolean(solution));
const payload = { challenge, solution };
const okRes = await handler(event('POST', { body: { payload: Buffer.from(JSON.stringify(payload)).toString('base64') } }));
const setCookie = String(okRes.headers?.['set-cookie'] || '');
check('valid solution is accepted', okRes.statusCode === 200 && parse(okRes).ok === true, okRes.body);
check('cookie is __Host- prefixed, HttpOnly, Secure, Path=/', /^__Host-human=/.test(setCookie) && /HttpOnly/.test(setCookie) && /Secure/.test(setCookie) && /Path=\//.test(setCookie) && !/Domain=/i.test(setCookie));
check('cookie is accepted by requireHuman()', lib.requireHuman({ headers: { cookie: cookieFrom(okRes) } }) === true);

// 3. A bot is rejected
const replay = await handler(event('POST', { body: { payload } }));
check('replaying a used solution is rejected', replay.statusCode === 403);

const fresh = parse(await handler(event('GET')));
const freshSolution = await solveChallenge({ challenge: fresh, deriveKey, timeout: 60000 });
const flipped = freshSolution.derivedKey.slice(0, -1) + (freshSolution.derivedKey.endsWith('0') ? '1' : '0');
const wrong = await handler(event('POST', { body: { payload: { challenge: fresh, solution: { ...freshSolution, derivedKey: flipped } } } }));
check('a made-up derived key (no real work done) is rejected', wrong.statusCode === 403);
const noKey = await handler(event('POST', { body: { payload: { challenge: fresh, solution: { counter: freshSolution.counter } } } }));
check('a solution without the derived key is rejected', noKey.statusCode === 403);

const forged = JSON.parse(JSON.stringify(fresh));
forged.parameters.cost = 1;
const forgedRes = await handler(event('POST', { body: { payload: { challenge: forged, solution: freshSolution } } }));
check('a challenge with weakened parameters is rejected (signature)', forgedRes.statusCode === 403);

const selfMade = await handler(event('POST', { body: { payload: { challenge: { parameters: {}, signature: 'abc' }, solution: { counter: 1 } } } }));
check('a self-made challenge is rejected', selfMade.statusCode === 403);
check('garbage payload is rejected', (await handler(event('POST', { body: { payload: 'not-json' } }))).statusCode === 400);
check('missing payload is rejected', (await handler(event('POST', { body: {} }))).statusCode === 400);

const crossSite = await handler(event('POST', { origin: 'https://evil.test', body: { payload } }));
check('cross-site POST is rejected', crossSite.statusCode === 403);

{
  const ip = '198.51.100.7';
  let last;
  for (let i = 0; i < 61; i += 1) last = await handler(event('GET', { ip }));
  check('more than 60 requests from one IP in 15 min are rate limited', last.statusCode === 429);
}

// 4. Cookie tampering
{
  const token = lib.makeHumanToken().token;
  const [exp, nonce, sig] = token.split('.');
  check('fresh token verifies', lib.verifyHumanToken(token) === true);
  check('tampered signature is rejected', lib.verifyHumanToken(`${exp}.${nonce}.${sig.slice(0, -2)}AA`) === false);
  check('extended expiry is rejected', lib.verifyHumanToken(`${Number(exp) + 99999}.${nonce}.${sig}`) === false);
  const expired = `${Math.floor(Date.now() / 1000) - 5}.${nonce}.${crypto.createHmac('sha256', lib.botSubKey('cookie')).update(`${Math.floor(Date.now() / 1000) - 5}.${nonce}`).digest('base64url')}`;
  check('expired token is rejected', lib.verifyHumanToken(expired) === false);
  check('token signed with another secret is rejected', lib.verifyHumanToken(lib.makeHumanToken('some-other-secret-value').token) === false);
  check('the ALTCHA signing key differs from the cookie key', !lib.botSubKey('altcha-signature').equals(lib.botSubKey('cookie')));
}

// 5. Wiring (source checks)
check('auth.mjs requires the human cookie for POST actions', /requireHuman\(event\)/.test(authSource) && authSource.indexOf('requireHuman(event)') > authSource.indexOf('originOk(event)'));
check('admin-auth.mjs requires the human cookie for login', /requireHuman\(event\)/.test(adminSource));
check('gate.ts checks the human cookie before the password gate', gateSource.indexOf('verifyHuman(humanSecret') > -1 && gateSource.indexOf('verifyHuman(humanSecret') < gateSource.indexOf("Deno.env.get('SITE_GATE_PASSWORD')"));
check('gate.ts lets /api/human through so a visitor can get the cookie', gateSource.includes("url.pathname==='/api/human'"));
check('no Google or other third-party captcha is referenced', !/google|recaptcha|hcaptcha|turnstile/i.test(gateSource + (await readFile('netlify/functions/human.mjs', 'utf8'))));

// 5b. Anonymous write endpoints refuse a call without the human cookie even when the edge gate is bypassed
for (const name of ['telemetry', 'adaptive']) {
  const mod = await import(`../netlify/functions/${name}.mjs`);
  const noCookie = await mod.handler({ httpMethod: 'POST', headers: { origin: ORIGIN, 'x-nf-client-connection-ip': nextIp() }, rawUrl: `${ORIGIN}/api/${name}`, body: JSON.stringify({ type: 'app_open' }) });
  check(`${name}.mjs refuses a call without the human cookie (edge gate bypassed)`, noCookie.statusCode === 403 && JSON.parse(noCookie.body).error === 'HUMAN_CHECK_REQUIRED', noCookie.body);
}

// 5c. Supply chain and app behaviour
{
  const widgetHash = crypto.createHash('sha256').update(await readFile('public/vendor/altcha/altcha.i18n.min.js')).digest('hex');
  check('vendored ALTCHA widget is byte-identical to altcha@3.3.0 (dist/main/altcha.i18n.min.js)', widgetHash === '6274613eb63f019f256327a371155710f17b1ff7d2b5cfcc8b8fa50e8dc056bc', widgetHash);
  check('bootstrap.js reloads the page when the human check expired while the app was open', (await readFile('public/bootstrap.js', 'utf8')).includes('HUMAN_CHECK_REQUIRED'));
}

// 6. The real edge gate (gate.ts) against tokens made by the Node side
const [major, minor] = process.versions.node.split('.').map(Number);
if (major > 22 || (major === 22 && minor >= 18)) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
  const gate = (await import(pathToFileURL(resolve('netlify/edge-functions/gate.ts')).href)).default;
  const context = { next: async () => new Response('APP', { status: 200 }) };
  const get = (path, headers = {}) => new Request(`${ORIGIN}${path}`, { headers: { accept: 'text/html', ...headers } });
  const humanCookie = cookieFrom(okRes);

  let res = await gate(get('/'), context);
  check('gate: visitor without cookie gets the human check page (403)', res.status === 403 && (await res.text()).includes('altcha-widget'));
  res = await gate(get('/api/auth', { accept: 'application/json' }), context);
  check('gate: API call without cookie gets JSON 403', res.status === 403 && (await res.json()).error === 'HUMAN_CHECK_REQUIRED');
  res = await gate(get('/', { cookie: humanCookie }), context);
  check('gate: cookie made by the Node side is accepted by the edge (no password set)', res.status === 200);
  res = await gate(get('/', { cookie: '__Host-human=1.abc.def' }), context);
  check('gate: forged cookie is rejected', res.status === 403);
  res = await gate(get('/api/human?action=challenge'), context);
  check('gate: /api/human is reachable without a cookie', res.status === 200);
  res = await gate(get('/vendor/human-check.js'), context);
  check('gate: the check page assets are reachable without a cookie', res.status === 200);

  process.env.SITE_GATE_PASSWORD = 'unit-test-password';
  res = await gate(get('/', { cookie: humanCookie }), context);
  check('gate: with a password set, a human still has to enter the password (401)', res.status === 401);
  const form = new FormData();
  form.set('password', 'unit-test-password');
  res = await gate(new Request(`${ORIGIN}/gate`, { method: 'POST', body: form, headers: { origin: ORIGIN } }), context);
  check('gate: password attempts without the human cookie are blocked (403)', res.status === 403);
  const form2 = new FormData();
  form2.set('password', 'unit-test-password');
  res = await gate(new Request(`${ORIGIN}/gate`, { method: 'POST', body: form2, headers: { origin: ORIGIN, cookie: humanCookie } }), context);
  check('gate: human + correct password is let in (302)', res.status === 302);
  delete process.env.SITE_GATE_PASSWORD;

  delete process.env.BOT_CHALLENGE_SECRET;
  res = await gate(get('/'), context);
  check('gate: without BOT_CHALLENGE_SECRET the site is closed (503), not open', res.status === 503);
} else {
  console.log(`SKIP: edge gate runtime checks need Node 22.18+ (this is ${process.versions.node}).`);
}

if (failures) {
  console.error(`\nFAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log('\nPASS: human check (bot protection) works as designed.');
