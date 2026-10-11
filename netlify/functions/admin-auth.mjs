// NOTE TO SELF (Claude): admin auth is SERVER-SIDE ONLY. The browser sends a password; this function checks it
// against ADMIN_PASSWORD_HASH (PBKDF2) and maps it to the single ADMIN_EMAIL from env. The browser never picks the identity.
// The admin cookie (__Host-admin_session) is separate from the normal user session, so the owner can use the app as a
// regular user and as admin at the same time. Rate limit uses x-nf-client-connection-ip (set by Netlify, not spoofable)
// plus a global cap. Do NOT change this to trust x-forwarded-for. Do NOT move any admin check to the client.
import { ADMIN_EMAIL, cookie, json, makeSession, parseCookies, rateLimit, requireHuman, sameOrigin, verifyPassword, verifySession } from './_lib.mjs';

const attempts = new Map();

export async function handler(event) {
  const method = event.httpMethod || 'GET';
  if (!sameOrigin(event)) return json(403, { ok: false, error: 'forbidden' });

  if (method === 'GET') {
    const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
    const session = verifySession(cookies['__Host-admin_session']);
    if (!session || session.email.toLowerCase() !== ADMIN_EMAIL) return json(200, { ok: true, authenticated: false });
    return json(200, { ok: true, authenticated: true, email: session.email, role: 'admin', expiresAt: session.exp * 1000 });
  }

  if (method === 'POST') {
    // Defense in depth: admin login also needs the human-check cookie (set via /api/human).
    if (!requireHuman(event)) return json(403, { ok: false, error: 'human_check_required' });
    const ip = (event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown').trim();
    if (!rateLimit(attempts, ip, 10, 15 * 60 * 1000) || !rateLimit(attempts, '__global__', 30, 15 * 60 * 1000)) return json(429, { ok: false, error: 'too_many_attempts' }, { 'retry-after': '900' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
    // The browser cannot choose the admin identity. The server maps the
    // password to the single operator account configured in environment variables.
    const password = String(body.password || '');
    const configuredHash = process.env.ADMIN_PASSWORD_HASH || '';
    const sessionSecret = process.env.ADMIN_SESSION_SECRET || '';
    if (!configuredHash || !sessionSecret || !ADMIN_EMAIL) return json(503, { ok: false, error: 'admin_auth_not_configured' });
    if (!verifyPassword(password, configuredHash)) return json(401, { ok: false, error: 'invalid_credentials' });
    const session = makeSession(ADMIN_EMAIL, sessionSecret);
    return json(200, { ok: true, authenticated: true, email: ADMIN_EMAIL, role: 'admin', expiresAt: session.exp * 1000 }, {
      'set-cookie': cookie('__Host-admin_session', session.token, 86400),
      'cache-control': 'no-store',
    });
  }

  if (method === 'DELETE') {
    return json(200, { ok: true, authenticated: false }, {
      'set-cookie': cookie('__Host-admin_session', '', 0),
      'cache-control': 'no-store',
    });
  }

  return json(405, { ok: false, error: 'method_not_allowed' });
}
