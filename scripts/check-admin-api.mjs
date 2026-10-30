// Admin API contract: server-side identity, access-code decisions, and the DELETE regression.
// Netlify functions are plain ESM and take a plain event object, so both handlers can be
// exercised in Node with a mocked Supabase REST endpoint and a real signed admin session.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.ADMIN_EMAIL = 'Owner@Example.com';
process.env.ADMIN_SESSION_SECRET = 'admin-session-secret';
process.env.AUTH_SESSION_SECRET = 'auth-session-secret';
process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'service-role-key';
process.env.BOT_CHALLENGE_SECRET = 'human-secret';
process.env.ADMIN_PASSWORD_HASH = '';

const { hashPassword } = await import('../netlify/functions/_lib.mjs');
process.env.ADMIN_PASSWORD_HASH = hashPassword('correct horse battery staple', { iterations: 100000 });

const adminAccess = (await import('../netlify/functions/admin-access.mjs')).handler;
const adminAuth = (await import('../netlify/functions/admin-auth.mjs')).handler;

const ORIGIN = 'https://veyra.example';
const ADMIN = 'owner@example.com';
const ROW = '11111111-2222-3333-4444-555555555555';

const b64url = (value) => Buffer.from(value).toString('base64url');
const adminCookie = (email = ADMIN, secret = process.env.ADMIN_SESSION_SECRET, ttl = 3600) => {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const nonce = crypto.randomUUID();
  const payload = `${b64url(email)}.${exp}.${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `__Host-admin_session=${payload}.${sig}`;
};
const humanCookie = (() => {
  const subKey = crypto.createHmac('sha256', 'human-secret').update('veyra-human|cookie').digest();
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const nonce = crypto.randomUUID();
  return `__Host-human=${exp}.${nonce}.${Buffer.from(crypto.createHmac('sha256', subKey).update(`${exp}.${nonce}`).digest()).toString('base64url')}`;
})();

let eventCounter = 0;
const event = ({ method = 'GET', path = '/api/admin-access', cookie = '', body, origin = ORIGIN, ip } = {}) => ({
  httpMethod: method,
  rawUrl: ORIGIN + path,
  body,
  headers: {
    origin,
    'x-nf-client-connection-ip': ip || `198.51.100.${++eventCounter}`,
    ...(cookie ? { cookie } : {}),
  },
});
const bodyOf = (result) => JSON.parse(result.body);

// --- Supabase mock ---------------------------------------------------------------------
let calls = [];
let pendingRows = [{ id: ROW, email: 'player@example.com', status: 'pending' }];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url).replace('https://supabase.test/rest/v1/', '');
  try {
    calls.push({ target, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null, headers: options.headers || {} });
    const key = options.headers?.apikey || options.headers?.get?.('apikey');
    assert.equal(key, 'service-role-key');
    if (target.startsWith('signup_access_codes?select=id,email,status')) return new Response(JSON.stringify(pendingRows), { status: 200 });
    if (target.startsWith('signup_access_codes?select=id,email,status,created_at')) return new Response(JSON.stringify([{ ...pendingRows[0], created_at: '2026-10-19T00:00:00.000Z' }]), { status: 200 });
    if (options.method === 'PATCH') return new Response('', { status: 200 });
    return new Response('not found', { status: 404 });
  } catch (error) {
    console.error('MOCK FAILURE', target, error.message);
    throw error;
  }
};

const resetRateLimits = async () => { /* module state persists by design; tests use distinct IPs */ };

try {
  // 1. Identity comes from the signed server cookie, never from the request body.
  let result = await adminAccess(event());
  assert.equal(result.statusCode, 401);
  result = await adminAccess(event({ cookie: adminCookie('someone-else@example.com') }));
  assert.equal(result.statusCode, 401);
  result = await adminAccess(event({ cookie: adminCookie(ADMIN, 'wrong-secret') }));
  assert.equal(result.statusCode, 401);
  result = await adminAccess(event({ cookie: adminCookie(ADMIN, process.env.ADMIN_SESSION_SECRET, -30) }));
  assert.equal(result.statusCode, 401);
  console.log('PASS: admin access requires a valid, unexpired session for the configured admin email.');

  // 2. Listing pending requests is read-only and marked no-store.
  calls = [];
  result = await adminAccess(event({ cookie: adminCookie() }));
  assert.equal(result.statusCode, 200);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(bodyOf(result).requests.length, 1);
  assert.ok(calls.every((call) => call.method === 'GET'), 'listing must not write');
  assert.match(calls[0].target, /status=eq\.pending/);
  console.log('PASS: pending access requests are listed without writes.');

  // 3. Rejecting a request updates the DB row (regression: the UI used to send DELETE).
  calls = [];
  result = await adminAccess(event({ method: 'POST', cookie: adminCookie(), body: JSON.stringify({ id: ROW, decision: 'reject' }) }));
  assert.equal(result.statusCode, 200);
  assert.equal(bodyOf(result).decision, 'reject');
  assert.equal(bodyOf(result).code, undefined, 'reject must not mint a code');
  const patch = calls.find((call) => call.method === 'PATCH');
  assert.ok(patch, 'reject must PATCH the row');
  assert.match(patch.target, new RegExp(`id=eq\\.${ROW}`));
  assert.match(patch.target, /status=eq\.pending/);
  assert.equal(patch.body.status, 'rejected');
  assert.ok(patch.body.rejected_at && patch.body.rejected_by === ADMIN && patch.body.revoked_at);
  console.log('PASS: rejecting an access request persists status=rejected for that row.');

  // 4. The old DELETE call is a clear 405 (no silent no-op in the UI).
  calls = [];
  result = await adminAccess(event({ method: 'DELETE', cookie: adminCookie() }));
  assert.equal(result.statusCode, 405);
  assert.equal(bodyOf(result).error, 'method_not_allowed');
  assert.equal(calls.length, 0, 'DELETE must not touch storage');
  console.log('PASS: DELETE on /api/admin-access returns 405 (the historical UI bug cannot recur silently).');

  // 5. Approving mints a 6-digit code bound to the row email and a 12-minute TTL.
  calls = [];
  result = await adminAccess(event({ method: 'POST', cookie: adminCookie(), body: JSON.stringify({ id: ROW, decision: 'approve' }) }));
  assert.equal(result.statusCode, 200);
  const approved = bodyOf(result);
  assert.match(approved.code, /^\d{6}$/);
  assert.equal(approved.email, 'player@example.com');
  const ttl = Date.parse(approved.expiresAt) - Date.now();
  assert.ok(ttl > 11 * 60 * 1000 && ttl <= 12 * 60 * 1000 + 5000, `unexpected TTL ${ttl}`);
  const approvePatch = calls.find((call) => call.method === 'PATCH');
  assert.equal(approvePatch.body.status, 'approved');
  assert.equal(approvePatch.body.rejected_at, null);
  const expectedHash = crypto.createHmac('sha256', process.env.AUTH_SESSION_SECRET)
    .update(`tabia-access|player@example.com|${approved.code}`).digest('hex');
  assert.equal(approvePatch.body.code_hash, expectedHash, 'code must be bound to the row email');
  console.log('PASS: approving mints an email-bound 6-digit code with a 12-minute TTL.');

  // 6. A second approval of the same (already decided) row is refused.
  pendingRows = [{ id: ROW, email: 'player@example.com', status: 'approved' }];
  result = await adminAccess(event({ method: 'POST', cookie: adminCookie(), body: JSON.stringify({ id: ROW }) }));
  assert.equal(result.statusCode, 409);
  assert.equal(bodyOf(result).error, 'request_already_decided');
  pendingRows = [{ id: ROW, email: 'player@example.com', status: 'pending' }];
  console.log('PASS: already-decided requests cannot be approved or rejected twice.');

  // 7. Validation, origin and payload limits.
  result = await adminAccess(event({ method: 'POST', cookie: adminCookie(), body: '{"id":"nope"}' }));
  assert.equal(result.statusCode, 400);
  result = await adminAccess(event({ method: 'POST', cookie: adminCookie(), body: '{}' }));
  assert.equal(result.statusCode, 400);
  result = await adminAccess(event({ method: 'POST', cookie: adminCookie(), origin: 'https://evil.example', body: JSON.stringify({ id: ROW }) }));
  assert.equal(result.statusCode, 403);
  result = await adminAccess(event({ method: 'POST', cookie: adminCookie(), body: JSON.stringify({ id: ROW, pad: 'x'.repeat(9000) }) }));
  assert.equal(result.statusCode, 413);
  result = await adminAccess(event({ method: 'PUT', cookie: adminCookie() }));
  assert.equal(result.statusCode, 405);
  console.log('PASS: admin access rejects bad ids, cross-origin POST, oversized bodies and unsupported methods.');

  // --- Admin login --------------------------------------------------------------------
  // 8. Login is server-side only and independent of the browser identity.
  result = await adminAuth(event({ path: '/api/admin-auth' }));
  assert.equal(result.statusCode, 200);
  assert.equal(bodyOf(result).authenticated, false);

  const login = (body, extraHeaders = {}, ip = '198.51.100.20') => adminAuth({
    httpMethod: 'POST',
    rawUrl: ORIGIN + '/api/admin-auth',
    body,
    headers: { origin: ORIGIN, 'x-nf-client-connection-ip': ip, ...extraHeaders },
  });

  result = await login(JSON.stringify({ password: 'correct horse battery staple' }));
  assert.equal(result.statusCode, 403, 'login must require the human check');
  assert.equal(bodyOf(result).error, 'HUMAN_CHECK_REQUIRED');

  result = await login(JSON.stringify({ password: 'correct horse battery staple' }), { cookie: humanCookie, origin: 'https://evil.example' }, '198.51.100.21');
  assert.equal(result.statusCode, 403, 'login must be same-origin');

  result = await login(JSON.stringify({ password: 'wrong' }), { cookie: humanCookie }, '198.51.100.22');
  assert.equal(result.statusCode, 401);
  assert.equal(bodyOf(result).error, 'invalid_credentials');

  result = await login(JSON.stringify({ password: 'correct horse battery staple' }), { cookie: humanCookie }, '198.51.100.23');
  assert.equal(result.statusCode, 200);
  const sessionCookie = result.headers['set-cookie'];
  assert.match(sessionCookie, /__Host-admin_session=/);
  assert.match(sessionCookie, /HttpOnly/);
  assert.match(sessionCookie, /SameSite=Strict/);
  console.log('PASS: admin login requires the human check and same-origin POST, and issues a hardened session cookie.');

  // 9. The minted cookie is accepted by the admin API and rejected for other identities.
  const sessionValue = /__Host-admin_session=([^;]+)/.exec(sessionCookie)[1];
  result = await adminAccess(event({ cookie: `__Host-admin_session=${sessionValue}` }));
  assert.equal(result.statusCode, 200);
  result = await adminAccess(event({ cookie: `__Host-admin_session=${adminCookie('intruder@example.com')}` }));
  assert.equal(result.statusCode, 401);
  console.log('PASS: the issued session works for the admin API and is bound to ADMIN_EMAIL.');

  // 10. Login attempts are throttled per IP.
  let throttled = false;
  for (let i = 0; i < 8 && !throttled; i++) {
    const attempt = await login(JSON.stringify({ password: 'wrong' }), { cookie: humanCookie }, '203.0.113.50');
    throttled = attempt.statusCode === 429;
  }
  assert.equal(throttled, true, 'repeated admin login attempts must be rate limited');
  console.log('PASS: repeated admin login attempts are rate limited (429).');
} finally {
  globalThis.fetch = originalFetch;
}
await resetRateLimits();

console.log('PASS: admin API contract suite completed.');
