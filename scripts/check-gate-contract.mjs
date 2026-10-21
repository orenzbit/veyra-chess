// Edge gate contract: bot check, site password, origin checks, throttling and fail-closed behaviour.
// The function is TypeScript for Deno, so it is transpiled and run against a small Deno shim.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const env = {};
globalThis.Deno = { env: { get: (key) => env[key] } };

const source = await readFile('netlify/edge-functions/gate.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const gate = (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))).default;

const ORIGIN = 'https://veyra.example';
let nextCalls = 0;
const context = { next: async () => { nextCalls += 1; return new Response('app', { status: 200 }); } };

// Minimal Request stand-in: Node's Request drops Origin/Referer, which the gate must see.
const request = (path, { method = 'GET', headers = {}, body } = {}) => {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return {
    url: ORIGIN + path,
    method,
    headers: { get: (name) => (name ? normalized[String(name).toLowerCase()] ?? null : null) },
    formData: async () => new URLSearchParams(body || ''),
  };
};

const b64url = (buffer) => Buffer.from(buffer).toString('base64url');
const sign = (secret, payload) => b64url(crypto.createHmac('sha256', secret).update(payload).digest());
const b64ToBytes = (value) => Buffer.from(value, 'base64url');

// Mirrors makeHumanToken()/verifyHuman() in the app: cookie sig uses domain-separated sub-key.
const humanCookie = (secret = 'human-secret', ttl = 3600) => {
  const subKey = crypto.createHmac('sha256', secret).update('veyra-human|cookie').digest();
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const nonce = crypto.randomUUID();
  return `__Host-human=${exp}.${nonce}.${sign(subKey, `${exp}.${nonce}`)}`;
};

const gateCookie = (secret = 'gate-secret', ttl = 3600) => {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const nonce = crypto.randomUUID();
  return `__Host-site_gate=${exp}.${nonce}.${sign(secret, `${exp}.${nonce}`)}`;
};

const jsonBody = async (response) => JSON.parse(await response.text());

// 1. Public static assets bypass the gate.
nextCalls = 0;
let response = await gate(request('/styles.css'), context);
assert.equal(response.status, 200);
assert.equal(nextCalls, 1);
response = await gate(request('/assets/app.js'), context);
assert.equal(response.status, 200);
console.log('PASS: static assets bypass the private gate.');

// 2. Missing bot secret is a hard failure (503), never an open gate.
env.BOT_CHALLENGE_SECRET = '';
response = await gate(request('/'), context);
assert.equal(response.status, 503);
assert.match(await response.text(), /BOT_CHALLENGE_SECRET/);
console.log('PASS: missing BOT_CHALLENGE_SECRET fails closed.');

// 3. Missing site password must fail closed as well (no `context.next()`).
env.BOT_CHALLENGE_SECRET = 'human-secret';
nextCalls = 0;
response = await gate(request('/', { headers: { cookie: humanCookie() } }), context);
assert.equal(response.status, 503);
assert.match(await response.text(), /SITE_GATE_PASSWORD/);
assert.equal(nextCalls, 0, 'missing SITE_GATE_PASSWORD must not serve the app');
console.log('PASS: missing SITE_GATE_PASSWORD fails closed instead of opening the site.');

// 4. Human check required for API and HTML requests.
response = await gate(request('/api/sync'), context);
assert.equal(response.status, 403);
assert.equal((await jsonBody(response)).error, 'HUMAN_CHECK_REQUIRED');
response = await gate(request('/', { headers: { accept: 'text/html' } }), context);
assert.equal(response.status, 403);
assert.match(response.headers.get('content-type'), /text\/html/);
console.log('PASS: requests without a human cookie get 403 (JSON for API, page for HTML).');

// 5. API payload ceiling is enforced before serverless execution.
response = await gate(request('/api/sync', { method: 'PUT', headers: { cookie: humanCookie(), 'content-length': String(500 * 1024) } }), context);
assert.equal(response.status, 413);
console.log('PASS: oversized API payloads are rejected at the edge (413).');

// 6. Password gate: configured secret + human cookie + no gate cookie -> 401 page.
env.SITE_GATE_PASSWORD = 'gate-secret';
response = await gate(request('/', { headers: { cookie: humanCookie() } }), context);
assert.equal(response.status, 401);
assert.match(await response.text(), /before entering|לפני הכניסה/);
console.log('PASS: human-verified visitors without a gate cookie still see the password page.');

// 7. Forged / expired gate cookies are rejected.
response = await gate(request('/', { headers: { cookie: `${humanCookie()}; __Host-site_gate=1.2.3` } }), context);
assert.equal(response.status, 401);
response = await gate(request('/', { headers: { cookie: `${humanCookie()}; ${gateCookie('wrong-secret')}` } }), context);
assert.equal(response.status, 401);
response = await gate(request('/', { headers: { cookie: `${humanCookie()}; ${gateCookie('gate-secret', -10)}` } }), context);
assert.equal(response.status, 401);
console.log('PASS: forged, wrong-key and expired gate cookies are rejected.');

// 8. Valid gate cookie opens the app.
nextCalls = 0;
response = await gate(request('/', { headers: { cookie: `${humanCookie()}; ${gateCookie()}` } }), context);
assert.equal(response.status, 200);
assert.equal(nextCalls, 1);
console.log('PASS: a valid signed gate cookie passes through.');

// 9. /gate form: origin required, wrong password rejected, correct password sets signed cookie.
//    Submitting the form also requires the human check (the gate page is only shown after it).
const form = new URLSearchParams({ password: 'gate-secret' });
const post = (extraHeaders = {}, body = form.toString()) => ({
  method: 'POST',
  headers: { cookie: humanCookie(), 'content-type': 'application/x-www-form-urlencoded', ...extraHeaders },
  body,
});
response = await gate(request('/gate', post()), context);
assert.equal(response.status, 403);
response = await gate(request('/gate', post({ origin: 'https://evil.example' })), context);
assert.equal(response.status, 403);
response = await gate(request('/gate', post({ origin: ORIGIN }, new URLSearchParams({ password: 'nope' }).toString())), context);
assert.equal(response.status, 401);
const good = await gate(request('/gate', post({ origin: ORIGIN })), context);
assert.equal(good.status, 302);
const setCookie = good.headers.get('set-cookie') || '';
assert.match(setCookie, /__Host-site_gate=/);
assert.match(setCookie, /HttpOnly/);
assert.match(setCookie, /Secure/);
assert.match(setCookie, /SameSite=Strict/);
console.log('PASS: /gate requires same-origin POST and issues a hardened signed cookie.');

// 10. Repeated password attempts from one IP are throttled.
let throttled = false;
for (let i = 0; i < 25 && !throttled; i++) {
  const attempt = await gate(request('/gate', post({ origin: ORIGIN, 'x-nf-client-connection-ip': '203.0.113.9' }, new URLSearchParams({ password: 'wrong' }).toString())), context);
  throttled = attempt.status === 429;
}
assert.equal(throttled, true, 'gate password attempts must be rate limited');
console.log('PASS: repeated password attempts are rate limited (429).');

console.log('PASS: edge gate contract suite completed.');
