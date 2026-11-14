// Forgot-password flow: netlify/functions/auth.mjs actions 'forgot-password' and 'reset-password' with Supabase and the
// email provider stubbed through globalThis.fetch, plus the page wiring in src/main.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
process.env.SUPABASE_URL = 'https://supa.test'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SECRET_KEY = 'secret';
process.env.AUTH_SESSION_SECRET = 'x'.repeat(40); process.env.BOT_CHALLENGE_SECRET = 'y'.repeat(40); process.env.SITE_URL = 'https://veyra.test';
const { handler } = await import('../netlify/functions/auth.mjs');
const { makeHumanToken, HUMAN_COOKIE } = await import('../netlify/functions/_lib.mjs');
const calls = []; let users = { 'known@example.com': true };
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url); const body = opts.body ? JSON.parse(opts.body) : {}; calls.push({ u, method: opts.method, body, auth: new Headers(opts.headers || {}).get('authorization') });
  const res = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/auth/v1/admin/generate_link')) return users[body.email] ? res(200, { properties: { hashed_token: 'hash123' } }) : res(404, { msg: 'User not found' });
  if (u === 'https://api.resend.com/emails') return res(200, { id: 'mail1' });
  if (u.endsWith('/auth/v1/verify')) return body.token_hash === 'hash123' ? res(200, { access_token: 'user-token', user: { id: 'u1' } }) : res(403, { msg: 'expired' });
  if (u.endsWith('/auth/v1/user')) return res(200, { id: 'u1' });
  return res(500, {});
};
let ip = 0;
const post = (b) => handler({ httpMethod: 'POST', headers: { origin: 'https://veyra.test', host: 'veyra.test', cookie: `${HUMAN_COOKIE}=${makeHumanToken().token}`, 'x-forwarded-for': `10.0.0.${++ip}` }, rawUrl: 'https://veyra.test/api/auth', body: JSON.stringify(b) });
const data = (r) => JSON.parse(r.body || '{}');
let failed = 0;
async function test(name, fn) { try { calls.length = 0; await fn(); console.log(`PASS: ${name}`); } catch (e) { failed += 1; console.error(`FAIL: ${name}\n  ${String(e.message).slice(0, 300)}`); } }

await test('without the email provider the site says so instead of pretending', async () => {
  delete process.env.RESEND_API_KEY;
  const r = await post({ action: 'forgot-password', email: 'known@example.com' });
  assert.equal(r.statusCode, 503); assert.equal(data(r).error, 'EMAIL_NOT_CONFIGURED');
});
process.env.RESEND_API_KEY = 're_test';
await test('forgot-password mails a one-time reset link for a known account', async () => {
  const r = await post({ action: 'forgot-password', email: 'Known@Example.com' });
  assert.equal(r.statusCode, 200, r.body); assert.equal(data(r).ok, true);
  const mail = calls.find(c => c.u === 'https://api.resend.com/emails');
  assert.ok(mail, 'an email was sent'); assert.equal(mail.body.to, 'known@example.com');
  assert.match(mail.body.text, /https:\/\/veyra\.test\/\?reset=hash123/);
  assert.equal(calls.find(c => c.u.endsWith('/admin/generate_link')).auth, 'Bearer secret');
});
await test('an unknown email gets the same answer and no email', async () => {
  const r = await post({ action: 'forgot-password', email: 'nobody@example.com' });
  assert.equal(r.statusCode, 200); assert.equal(data(r).ok, true);
  assert.ok(!calls.some(c => c.u === 'https://api.resend.com/emails'));
});
await test('reset-password sets the new password with the token from the link', async () => {
  const r = await post({ action: 'reset-password', token: 'hash123', password: 'a-new-long-password' });
  assert.equal(r.statusCode, 200, r.body);
  const put = calls.find(c => c.u.endsWith('/auth/v1/user'));
  assert.equal(put.method, 'PUT'); assert.equal(put.auth, 'Bearer user-token'); assert.equal(put.body.password, 'a-new-long-password');
});
await test('a bad or used link and a short password are refused', async () => {
  assert.equal(data(await post({ action: 'reset-password', token: 'old', password: 'a-new-long-password' })).error, 'RESET_LINK_INVALID');
  assert.equal(data(await post({ action: 'reset-password', token: 'hash123', password: 'short' })).error, 'VALIDATION_ERROR');
});
await test('the login form links to the reset page and ?reset= opens it', () => {
  const src = readFileSync('src/main.ts', 'utf8');
  assert.match(src, /function PasswordResetPage\(\{token,onDone\}\)/);
  assert.match(src, /mode==='login'&&onForgot&&h\('button'/);
  assert.match(src, /get\('reset'\)\?'reset':'welcome'/);
  assert.match(src, /setAuthStage\(s=>s==='reset'\?'reset':'welcome'\)/, 'the signed-out session check keeps the reset page');
  assert.match(src, /action:'forgot-password'/); assert.match(src, /action:'reset-password'/);
});
if (failed) { console.error(`${failed} password reset check(s) failed.`); process.exit(1); }
console.log('Password reset checks passed.');
