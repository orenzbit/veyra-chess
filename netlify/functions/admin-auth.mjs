// NOTE TO SELF (Claude): admin auth is SERVER-SIDE ONLY. The browser sends a password; this function checks it
// against ADMIN_PASSWORD_HASH (PBKDF2) and maps it to the single ADMIN_EMAIL from env. The browser never picks the identity.
// The admin cookie (__Host-admin_session) is separate from the normal user session, so the owner can use the app as a
// regular user and as admin at the same time. Rate limit uses x-nf-client-connection-ip (set by Netlify, not spoofable)
// plus a global cap. Do NOT change this to trust x-forwarded-for. Do NOT move any admin check to the client.
import { ADMIN_EMAIL, clientIp, cookie, json, makeSession, parseCookies, rateLimit, sameOrigin, strictSameOrigin, verifyPassword, verifySession } from './_lib.mjs';

const attempts = new Map();
const noStore = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const MAX_LOGIN_BODY_BYTES = 4096;

export async function handler(event) {
  const method = event.httpMethod || 'GET';
  if (!sameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, noStore);

  if (method === 'GET') {
    const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
    const session = verifySession(cookies['__Host-admin_session']);
    if (!ADMIN_EMAIL || !session || session.email.toLowerCase() !== ADMIN_EMAIL) return json(200, { ok: true, authenticated: false }, noStore);
    return json(200, { ok: true, authenticated: true, email: session.email, role: 'admin', expiresAt: session.exp * 1000 }, noStore);
  }

  if (method === 'POST') {
    if (!strictSameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, noStore);
    const ip = clientIp(event);
    if (!rateLimit(attempts, `ip:${ip}`, 5, 15 * 60 * 1000) || !rateLimit(attempts, '__global__', 20, 15 * 60 * 1000)) return json(429, { ok: false, error: 'too_many_attempts' }, { ...noStore, 'retry-after': '900' });
    if (String(event.body || '').length > MAX_LOGIN_BODY_BYTES) return json(413, { ok: false, error: 'too_large' }, noStore);
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }, noStore); }
    // The password hash, administrator identity, and signing secret exist only in server environment variables.
    const password = typeof body.password === 'string' ? body.password : '';
    const configuredHash = process.env.ADMIN_PASSWORD_HASH || '';
    const sessionSecret = process.env.ADMIN_SESSION_SECRET || '';
    if (!configuredHash || !sessionSecret || !ADMIN_EMAIL) return json(503, { ok: false, error: 'admin_auth_not_configured' }, noStore);
    if (!password || password.length > 1024 || !verifyPassword(password, configuredHash)) return json(401, { ok: false, error: 'invalid_credentials' }, noStore);
    const session = makeSession(ADMIN_EMAIL, sessionSecret);
    return json(200, { ok: true, authenticated: true, email: ADMIN_EMAIL, role: 'admin', expiresAt: session.exp * 1000 }, {
      ...noStore,
      'set-cookie': cookie('__Host-admin_session', session.token, 12 * 60 * 60),
    });
  }

  if (method === 'DELETE') {
    if (!strictSameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, noStore);
    return json(200, { ok: true, authenticated: false }, {
      ...noStore,
      'set-cookie': cookie('__Host-admin_session', '', 0),
    });
  }

  return json(405, { ok: false, error: 'method_not_allowed' });
}
