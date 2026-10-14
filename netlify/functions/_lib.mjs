import crypto from 'node:crypto';

export const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
export const SESSION_SECONDS = 12 * 60 * 60;

export function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    String(header)
      .split(';')
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => {
        const i = v.indexOf('=');
        return i === -1 ? [v, ''] : [v.slice(0, i), v.slice(i + 1)];
      }),
  );
}

export function timingSafeEqualText(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function hashPassword(password, spec = {}) {
  const iterations = Number(spec.iterations || 310000);
  const salt = spec.salt || crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256');
  return `${iterations}.${salt.toString('base64url')}.${hash.toString('base64url')}`;
}

export function verifyPassword(password, encoded) {
  try {
    const [iterationsText, saltText, hashText] = String(encoded || '').split('.');
    const iterations = Number(iterationsText);
    if (!iterations || !saltText || !hashText || iterations < 100000 || iterations > 2000000) return false;
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = crypto.pbkdf2Sync(String(password), salt, iterations, expected.length, 'sha256');
    return timingSafeEqualText(actual.toString('base64url'), expected.toString('base64url'));
  } catch {
    return false;
  }
}

export function makeSession(email, secret = process.env.ADMIN_SESSION_SECRET) {
  if (!secret) throw new Error('ADMIN_SESSION_SECRET missing');
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = crypto.randomBytes(16).toString('base64url');
  const payload = `${Buffer.from(String(email), 'utf8').toString('base64url')}.${exp}.${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, exp };
}

export function verifySession(token, secret = process.env.ADMIN_SESSION_SECRET) {
  try {
    if (!secret || !token) return null;
    const parts = String(token).split('.');
    if (parts.length !== 4) return null;
    const [email, expText, nonce, sig] = parts;
    const exp = Number(expText);
    if (!email || !nonce || !sig || !Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
    const payload = `${email}.${exp}.${nonce}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (!timingSafeEqualText(sig, expected)) return null;
    return { email: Buffer.from(email, 'base64url').toString('utf8'), exp };
  } catch {
    return null;
  }
}

export function requireAdmin(event) {
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  const session = verifySession(cookies['__Host-admin_session']);
  if (!ADMIN_EMAIL || !session || session.email.toLowerCase() !== ADMIN_EMAIL) return null;
  return session;
}

export function sameOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (!origin) return true;
  const rawUrl = event.rawUrl || event.headers?.referer || event.headers?.Referer || '';
  try {
    return new URL(origin).origin === new URL(rawUrl).origin;
  } catch {
    return false;
  }
}

// For state-changing requests, absence of both Origin and Referer is not trusted.
export function strictSameOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const referer = event.headers?.referer || event.headers?.Referer || '';
  const target = event.rawUrl || '';
  try {
    const targetOrigin = new URL(target).origin;
    if (origin) return new URL(origin).origin === targetOrigin;
    if (referer) return new URL(referer).origin === targetOrigin;
    return false;
  } catch {
    return false;
  }
}

// Trust only Netlify's client-IP header; x-forwarded-for can be spoofed by clients.
export function clientIp(event) {
  return String(event.headers?.['x-nf-client-connection-ip'] || event.headers?.['X-Nf-Client-Connection-Ip'] || 'unknown').trim().slice(0, 120) || 'unknown';
}

export function authSessionSecret() {
  const explicit = String(process.env.AUTH_SESSION_SECRET || '').trim();
  if (explicit) return explicit;
  const supabaseSecret = String(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  ).trim();
  return supabaseSecret
    ? crypto.createHash('sha256').update(`tabia-session|${supabaseSecret}`).digest('base64url')
    : '';
}

export function accessCodeHash(email, code) {
  const secret = authSessionSecret();
  if (!secret) throw new Error('AUTH_SESSION_SECRET_UNAVAILABLE');
  return crypto
    .createHmac('sha256', secret)
    .update(`tabia-access|${String(email).trim().toLowerCase()}|${String(code)}`)
    .digest('hex');
}

export function emailDeliveryEnabled() {
  return Boolean(String(process.env.RESEND_API_KEY || '').trim());
}

export async function supabaseRequest(path, options = {}) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!base || !key) throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY is not configured');
  const headers = new Headers(options.headers || {});
  headers.set('apikey', key);
  headers.set('Authorization', `Bearer ${key}`);
  headers.set('content-type', 'application/json');
  const response = await fetch(`${base}/rest/v1/${path.replace(/^\//, '')}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`Supabase ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export function visitorId(event) {
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  return cookies['__Host-visitor'] || crypto.randomUUID();
}

export function withVisitorCookie(result, id, maxAge = 60 * 60 * 24 * 365) {
  const headers = { ...(result.headers || {}) };
  headers['set-cookie'] = cookie('__Host-visitor', id, maxAge);
  return { ...result, headers };
}

export function rateLimit(map, key, limit, windowMs) {
  const now = Date.now();
  let row = map.get(key) || { start: now, count: 0 };
  if (now - row.start >= windowMs) row = { start: now, count: 0 };
  row.count += 1;
  // Refresh insertion order and bound memory growth from high-cardinality IPs.
  map.delete(key);
  map.set(key, row);
  if (map.size > 5000) {
    for (const [oldKey, oldRow] of map) {
      if (now - oldRow.start > windowMs * 2) map.delete(oldKey);
      if (map.size <= 4000) break;
    }
  }
  while (map.size > 10000) map.delete(map.keys().next().value);
  return row.count <= limit;
}
