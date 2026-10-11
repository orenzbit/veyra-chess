import crypto from 'node:crypto';

export const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'orennzb@gmail.com').trim().toLowerCase();
export const SESSION_DAYS = 30;

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
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
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
  if (!session || session.email.toLowerCase() !== ADMIN_EMAIL) return null;
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
  const row = map.get(key) || { start: now, count: 0 };
  if (now - row.start >= windowMs) {
    row.start = now;
    row.count = 0;
  }
  row.count += 1;
  map.set(key, row);
  return row.count <= limit;
}

// ---------------------------------------------------------------------------
// Human check (bot protection). Server-side only: the browser solves an ALTCHA
// proof-of-work challenge (self-hosted, MIT, no third-party requests), /api/human
// verifies it and sets the signed __Host-human cookie. The edge gate (gate.ts)
// and sensitive functions only trust that cookie. Fails CLOSED when the secret
// is missing. Do NOT add a fallback that skips the check.
// ---------------------------------------------------------------------------
export const HUMAN_COOKIE = '__Host-human';
export const HUMAN_TTL_SECONDS = 86400;

export function botSecret() {
  return String(process.env.BOT_CHALLENGE_SECRET || '').trim();
}

// Domain-separated sub-keys so the cookie key can never be confused with an ALTCHA signing key.
export function botSubKey(label, secret = botSecret()) {
  if (!secret) throw new Error('BOT_CHALLENGE_SECRET missing');
  return crypto.createHmac('sha256', secret).update(`veyra-human|${label}`).digest();
}

export function makeHumanToken(secret = botSecret()) {
  const exp = Math.floor(Date.now() / 1000) + HUMAN_TTL_SECONDS;
  const nonce = crypto.randomBytes(16).toString('base64url');
  const payload = `${exp}.${nonce}`;
  const sig = crypto.createHmac('sha256', botSubKey('cookie', secret)).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, exp };
}

export function verifyHumanToken(token, secret = botSecret()) {
  try {
    if (!secret || !token) return false;
    const parts = String(token).split('.');
    if (parts.length !== 3) return false;
    const [expText, nonce, sig] = parts;
    const exp = Number(expText);
    if (!nonce || !sig || !Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
    const expected = crypto.createHmac('sha256', botSubKey('cookie', secret)).update(`${exp}.${nonce}`).digest('base64url');
    return timingSafeEqualText(sig, expected);
  } catch {
    return false;
  }
}

export function requireHuman(event) {
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  return verifyHumanToken(cookies[HUMAN_COOKIE]);
}
