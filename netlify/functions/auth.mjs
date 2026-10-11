import crypto from 'node:crypto';
import {
  json,
  cookie,
  parseCookies,
  supabaseRequest,
  authSessionSecret,
  accessCodeHash,
  emailDeliveryEnabled,
  requireHuman,
} from './_lib.mjs';

const SESSION_COOKIE = '__Host-tabia_session';
const MAX_SESSION_AGE = 60 * 60 * 24 * 30;
const TERMS_VERSION = '2026-09-26';
const PRIVACY_VERSION = '2026-09-26';
const MIN_AGE = 18;
const ACCESS_CODE_TTL_MS=12*60*1000;
const ACCESS_CODE_TTL_SECONDS = 12 * 60;
const ACCESS_CODE_MAX_ATTEMPTS=5;
const MANUAL_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATE = new Map();

function originOk(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (!origin) return true;
  const rawUrl = event.rawUrl || event.headers?.referer || event.headers?.Referer || '';
  try {
    return new URL(origin).origin === new URL(rawUrl).origin;
  } catch {
    return false;
  }
}

function tooMany(key, limit = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const row = RATE.get(key) || { start: now, count: 0 };
  if (now - row.start >= windowMs) {
    row.start = now;
    row.count = 0;
  }
  row.count += 1;
  RATE.set(key, row);
  return row.count > limit;
}

function getIp(event) {
  const raw = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for'] || 'unknown';
  return String(raw).split(',')[0].trim().slice(0, 120) || 'unknown';
}

function authBase() {
  return String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
}

function anonKey() {
  return String(process.env.SUPABASE_ANON_KEY || '').trim();
}

function configured() {
  return Boolean(authBase() && anonKey() && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) && authSessionSecret());
}

function encrypt(payload) {
  const secret = crypto.createHash('sha256').update(authSessionSecret()).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
  const raw = Buffer.from(JSON.stringify(payload));
  const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function decrypt(token) {
  try {
    const raw = Buffer.from(String(token || ''), 'base64url');
    if (raw.length < 28) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const secret = crypto.createHash('sha256').update(authSessionSecret()).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', secret, iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function sessionCookie(payload) {
  const exp = Math.floor(Date.now() / 1000) + MAX_SESSION_AGE;
  return `${SESSION_COOKIE}=${encrypt({ ...payload, exp })}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_SESSION_AGE}`;
}

export function currentSession(event) {
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  return decrypt(cookies[SESSION_COOKIE] || '');
}

async function supaAuth(path, options = {}) {
  const base = authBase();
  const key = anonKey();
  if (!base || !key) throw new Error('SUPABASE_AUTH_NOT_CONFIGURED');
  const headers = new Headers(options.headers || {});
  headers.set('apikey', key);
  headers.set('Authorization', `Bearer ${key}`);
  headers.set('content-type', 'application/json');
  const r = await fetch(`${base}/auth/v1/${path.replace(/^\//, '')}`, { ...options, headers });
  const text = await r.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!r.ok) {
    const e = new Error(body?.msg || body?.message || body?.error_description || body?.error || `Auth ${r.status}`);
    e.status = r.status;
    e.body = body;
    throw e;
  }
  return body;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ageFromDate(value) {
  const dob = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const month = now.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

function cleanText(value, max = 120) {
  return String(value || '').trim().slice(0, max);
}

function makeAccessCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function accessToken(rowId, email, exp) {
  return encrypt({ kind: 'invite', row_id: rowId, email, exp });
}

function validInviteToken(token, email) {
  const value = decrypt(token);
  if (!value || value.kind !== 'invite' || !value.row_id || value.email !== email || !value.exp) return null;
  return value;
}

async function resendEmail({ to, subject, html, text }) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  const from = String(process.env.ACCESS_CODE_FROM || 'onboarding@resend.dev').trim();
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  const raw = await r.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }
  if (!r.ok) throw new Error(body?.message || body?.name || `EMAIL_SEND_FAILED_${r.status}`);
  return body;
}

async function recentAccessCount(filterField, filterValue) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const q = `signup_access_codes?select=id&${filterField}=eq.${encodeURIComponent(filterValue)}&created_at=gte.${encodeURIComponent(since)}`;
  const rows = await supabaseRequest(q);
  return Array.isArray(rows) ? rows.length : 0;
}

async function revokeOpenCodes(email) {
  await supabaseRequest(
    `signup_access_codes?email=eq.${encodeURIComponent(email)}&used_at=is.null&revoked_at=is.null`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    },
  ).catch(() => {});
}

export async function handler(event) {
  if (!configured()) return json(503, { configured: false, error: 'AUTH_NOT_CONFIGURED' });

  const method = event.httpMethod || 'GET';
  const ip = getIp(event);
  if (tooMany(ip, 40, 5 * 60 * 1000)) return json(429, { error: 'RATE_LIMIT' });

  if (method === 'GET') {
    const action = new URLSearchParams(event.queryStringParameters || {}).get('action') || 'session';
    if (action === 'status') {
      return json(200, {
        configured: true,
        minimumAge: MIN_AGE,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        manualAccessCode: true,
        emailDelivery: emailDeliveryEnabled(),
        accessCodeTtlSeconds: ACCESS_CODE_TTL_SECONDS,
      }, { 'cache-control': 'no-store' });
    }

    const session = currentSession(event);
    if (!session) return json(200, { authenticated: false });

    try {
      let user;
      try {
        user = await supaAuth('user', { method: 'GET', headers: { Authorization: `Bearer ${session.access_token}` } });
      } catch {
        if (!session.refresh_token) throw new Error('SESSION_EXPIRED');
        const refreshed = await supaAuth('token?grant_type=refresh_token', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        if (!refreshed.access_token) throw new Error('SESSION_EXPIRED');
        session.access_token = refreshed.access_token;
        session.refresh_token = refreshed.refresh_token || session.refresh_token;
        user = await supaAuth('user', { method: 'GET', headers: { Authorization: `Bearer ${session.access_token}` } });
      }
      const result = json(200, { authenticated: true, user: { id: user.id, email: user.email, metadata: user.user_metadata || {} } });
      result.headers['set-cookie'] = sessionCookie(session);
      return result;
    } catch {
      return json(200, { authenticated: false });
    }
  }

  if (!originOk(event)) return json(403, { error: 'BAD_ORIGIN' });
  // Defense in depth: even if this function is called directly, a valid human-check cookie is required.
  if (!requireHuman(event)) return json(403, { error: 'HUMAN_CHECK_REQUIRED' });

  let body;
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: 'INVALID_JSON' }); }
  const action = body.action;

  if (action === 'request-access-code') {
    const email = cleanText(body.email, 200).toLowerCase();
    if (!validEmail(email)) return json(400, { error: 'VALIDATION_ERROR' });
    if (tooMany(`access-email:${email}`, 3, 60 * 60 * 1000) || tooMany(`access-ip:${ip}`, 10, 60 * 60 * 1000)) {
      return json(429, { error: 'ACCESS_RATE_LIMIT' });
    }

    try {
      const [emailRecent, ipRecent] = await Promise.all([
        recentAccessCount('email', email),
        recentAccessCount('requested_ip', ip),
      ]);
      if (emailRecent >= 3 || ipRecent >= 10) return json(429, { error: 'ACCESS_RATE_LIMIT' });
    } catch {}

    await supabaseRequest(
      `signup_access_codes?email=eq.${encodeURIComponent(email)}&status=in.(pending,approved)&signup_completed=eq.false`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'revoked', revoked_at: new Date().toISOString() }),
      },
    ).catch(() => {});

    try {
      const pendingUntil = new Date(Date.now() + MANUAL_REQUEST_TTL_MS).toISOString();
      const placeholder = crypto.randomBytes(32).toString('hex');
      const inserted = await supabaseRequest('signup_access_codes', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          email,
          status: 'pending',
          code_hash: accessCodeHash(email, placeholder),
          expires_at: pendingUntil,
          requested_ip: ip,
        }),
      });
      const row = Array.isArray(inserted) ? inserted[0] : inserted;
      if (!row?.id) throw new Error('ACCESS_REQUEST_STORE_FAILED');

      if (emailDeliveryEnabled()) {
        const lang = body.language === 'en' ? 'en' : 'he';
        const subject = lang === 'en' ? 'Veyra Chess signup approval request' : 'בקשת אישור הרשמה ל־Veyra Chess';
        const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Veyra Chess</h2><p>${lang === 'en' ? 'A new private-beta signup request is waiting for your approval.' : 'בקשת הרשמה חדשה לבטא הפרטית ממתינה לאישור שלך.'}</p><p>${lang === 'en' ? 'Applicant email:' : 'אימייל המבקש:'} <strong>${escapeHtml(email)}</strong></p><p>${lang === 'en' ? 'Open the Admin area to approve or reject the request. A six-digit code is generated only when you approve it.' : 'פתח את אזור ה־Admin כדי לאשר או לדחות את הבקשה. קוד בן 6 ספרות נוצר רק לאחר אישור שלך.'}</p></div>`;
        const text = `Veyra Chess\n${lang === 'en' ? 'New signup approval request' : 'בקשת הרשמה חדשה'}\n${email}\n${lang === 'en' ? 'Approval is required before account creation.' : 'נדרש אישור לפני יצירת החשבון.'}`;
        try {
          await resendEmail({ to: String(process.env.ADMIN_EMAIL || 'orennzb@gmail.com').trim().toLowerCase(), subject, html, text });
        } catch {}
      }

      return json(200, { ok: true, pending: true }, { 'cache-control': 'no-store' });
    } catch {
      return json(503, { error: 'ACCESS_REQUEST_FAILED' });
    }
  }

  if (action === 'verify-access-code') {
    const email = cleanText(body.email, 200).toLowerCase();
    const code = String(body.code || '').trim();
    if (!validEmail(email) || !/^\d{6}$/.test(code)) return json(400, { error: 'ACCESS_CODE_INVALID' });

    try {
      const rows = await supabaseRequest(`signup_access_codes?email=eq.${encodeURIComponent(email)}&status=eq.approved&used_at=is.null&revoked_at=is.null&order=created_at.desc&limit=1`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return json(410, { error: 'ACCESS_CODE_EXPIRED' });
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        await supabaseRequest(`signup_access_codes?id=eq.${encodeURIComponent(row.id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: new Date().toISOString() }),
        }).catch(() => {});
        return json(410, { error: 'ACCESS_CODE_EXPIRED' });
      }
      const attempts = Number(row.attempts || 0);
      if (attempts >= ACCESS_CODE_MAX_ATTEMPTS) return json(429, { error: 'ACCESS_CODE_LOCKED' });

      const expectedHex = accessCodeHash(email, code);
      const actualHex = String(row.code_hash || '');
      const ok = /^[0-9a-f]{64}$/i.test(actualHex) && crypto.timingSafeEqual(Buffer.from(expectedHex, 'hex'), Buffer.from(actualHex, 'hex'));
      if (!ok) {
        const nextAttempts = attempts + 1;
        const update = { attempts: nextAttempts };
        if (nextAttempts >= ACCESS_CODE_MAX_ATTEMPTS) update.revoked_at = new Date().toISOString();
        await supabaseRequest(`signup_access_codes?id=eq.${encodeURIComponent(row.id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(update),
        }).catch(() => {});
        return json(401, { error: nextAttempts >= ACCESS_CODE_MAX_ATTEMPTS ? 'ACCESS_CODE_LOCKED' : 'ACCESS_CODE_INVALID' });
      }

      await supabaseRequest(`signup_access_codes?id=eq.${encodeURIComponent(row.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ used_at: new Date().toISOString(), status: 'code_verified' }),
      });
      const exp = Math.floor(new Date(row.expires_at).getTime() / 1000);
      return json(200, { ok: true, inviteToken: accessToken(row.id, email, exp), expiresAt: row.expires_at }, { 'cache-control': 'no-store' });
    } catch {
      return json(500, { error: 'ACCESS_VERIFY_FAILED' });
    }
  }

  if (action === 'signup') {
    const email = cleanText(body.email, 200).toLowerCase();
    const username = cleanText(body.username, 40);
    const fullName = cleanText(body.fullName, 120);
    const birthDate = cleanText(body.birthDate, 20);
    const country = cleanText(body.country, 80);
    const password = String(body.password || '');
    const consent = body.acceptTerms === true;
    const lang = body.language === 'en' ? 'en' : 'he';
    const invite = validInviteToken(body.accessToken, email);

    if (!invite) return json(401, { error: 'ACCESS_CODE_EXPIRED' });
    if (!validEmail(email) || !username || !fullName || !country || !birthDate || password.length < 10) return json(400, { error: 'VALIDATION_ERROR' });
    const age = ageFromDate(birthDate);
    if (age == null || age < MIN_AGE) return json(400, { error: 'AGE_RESTRICTED' });
    if (!consent) return json(400, { error: 'TERMS_REQUIRED' });

    try {
      const accessRows = await supabaseRequest(`signup_access_codes?id=eq.${encodeURIComponent(invite.row_id)}&email=eq.${encodeURIComponent(email)}&limit=1`);
      const access = Array.isArray(accessRows) ? accessRows[0] : null;
      if (!access || access.status !== 'code_verified' || access.revoked_at || access.signup_completed || !access.used_at || new Date(access.expires_at).getTime() <= Date.now()) return json(401, { error: 'ACCESS_CODE_EXPIRED' });
      const existing = await supabaseRequest(`user_profiles?select=user_id&username=eq.${encodeURIComponent(username)}&limit=1`);
      if (Array.isArray(existing) && existing.length) return json(409, { error: 'USERNAME_TAKEN' });
    } catch {
      return json(500, { error: 'ACCESS_CHECK_FAILED' });
    }

    let createdUserId = null;
    try {
      const siteUrl = String(process.env.SITE_URL || event.headers?.origin || '').replace(/\/$/, '');
      const data = {
        display_name: fullName,
        username,
        country,
        birth_date: birthDate,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        terms_accepted_at: new Date().toISOString(),
      };

      let user;
      const usingEmailVerification = emailDeliveryEnabled();
      if (usingEmailVerification) {
        const signup = await supaAuth(`signup${siteUrl ? `?redirect_to=${encodeURIComponent(siteUrl)}` : ''}`, {
          method: 'POST',
          body: JSON.stringify({ email, password, data }),
        });
        user = signup.user;
      } else {
        // Private-beta fallback: the operator-issued one-time code is the account-verification step.
        const base = authBase();
        const serviceKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        if (!base || !serviceKey) throw new Error('SUPABASE_AUTH_NOT_CONFIGURED');
        const r = await fetch(`${base}/auth/v1/admin/users`, {
          method: 'POST',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ email, password, email_confirm: true, user_metadata: data }),
        });
        const raw = await r.text();
        let created = {};
        try { created = raw ? JSON.parse(raw) : {}; } catch { created = { raw }; }
        if (!r.ok) {
          const e = new Error(created?.msg || created?.message || created?.error_description || created?.error || `Auth ${r.status}`);
          e.status = r.status;
          e.body = created;
          throw e;
        }
        user = created?.user || created;
      }

      createdUserId = user?.id || null;
      if (!createdUserId) return json(400, { error: 'SIGNUP_FAILED' });

      await supabaseRequest('user_profiles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: createdUserId, email, username, full_name: fullName, birth_date: birthDate, country }) });
      await supabaseRequest('user_consents', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: createdUserId, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION, language: lang, accepted_at: new Date().toISOString() }) });
      await supabaseRequest(`signup_access_codes?id=eq.${encodeURIComponent(invite.row_id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ signup_completed: true, status: 'completed' }) });

      if (usingEmailVerification) return json(200, { ok: true, emailVerificationRequired: true, email });

      const token = await supaAuth('token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!token.access_token) return json(200, { ok: true, email });
      return json(200, { ok: true, user: { id: createdUserId, email, metadata: token.user?.user_metadata || data } }, { 'set-cookie': sessionCookie({ access_token: token.access_token, refresh_token: token.refresh_token, user_id: createdUserId, email }) });
    } catch (e) {
      if (createdUserId) {
        const base = authBase();
        const secret = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        if (base && secret) {
          await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(createdUserId)}`, {
            method: 'DELETE',
            headers: { apikey: secret, Authorization: `Bearer ${secret}` },
          }).catch(() => {});
        }
      }
      return json(e.status === 409 ? 409 : 400, { error: e.body?.msg || e.body?.message || e.message || 'SIGNUP_FAILED' });
    }
  }

  if (action === 'resend') {
    const email = cleanText(body.email, 200).toLowerCase();
    if (!validEmail(email)) return json(400, { error: 'VALIDATION_ERROR' });
    try {
      await supaAuth('resend', { method: 'POST', body: JSON.stringify({ type: 'signup', email }) });
      return json(200, { ok: true });
    } catch (e) {
      return json(400, { error: e.body?.msg || e.body?.message || e.message || 'RESEND_FAILED' });
    }
  }

  if (action === 'login') {
    const email = cleanText(body.email, 200).toLowerCase();
    const password = String(body.password || '');
    if (!validEmail(email) || !password) return json(400, { error: 'VALIDATION_ERROR' });
    try {
      const r = await supaAuth('token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!r.access_token) return json(401, { error: 'LOGIN_FAILED' });
      if (emailDeliveryEnabled() && !r.user?.email_confirmed_at) return json(401, { error: 'EMAIL_NOT_VERIFIED' });
      const c = sessionCookie({ access_token: r.access_token, refresh_token: r.refresh_token, user_id: r.user?.id, email: r.user?.email || email });
      return json(200, { ok: true, user: { id: r.user?.id, email: r.user?.email || email, metadata: r.user?.user_metadata || {} } }, { 'set-cookie': c, 'cache-control': 'no-store' });
    } catch (e) {
      const msg = String(e.body?.msg || e.body?.message || e.message || 'LOGIN_FAILED');
      const unverified = /confirm|verified/i.test(msg);
      return json(401, { error: unverified ? 'EMAIL_NOT_VERIFIED' : msg });
    }
  }

  if (action === 'logout') return json(200, { ok: true }, { 'set-cookie': clearCookie() });

  if (action === 'training') {
    const session = currentSession(event);
    if (!session?.user_id) return json(401, { error: 'UNAUTHENTICATED' });
    const eventType = cleanText(body.eventType, 80);
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    if (!eventType) return json(400, { error: 'VALIDATION_ERROR' });
    try {
      await supabaseRequest('user_training_events', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: session.user_id, event_type: eventType, payload }),
      });
      return json(200, { ok: true });
    } catch {
      return json(401, { error: 'UNAUTHENTICATED' });
    }
  }

  if (action === 'delete') {
    const session = currentSession(event);
    if (!session?.user_id) return json(401, { error: 'UNAUTHENTICATED' });
    if (body.confirm !== true) return json(400, { error: 'CONFIRMATION_REQUIRED' });
    try {
      await supabaseRequest(`user_training_events?user_id=eq.${encodeURIComponent(session.user_id)}`, { method: 'DELETE' });
      await supabaseRequest(`user_consents?user_id=eq.${encodeURIComponent(session.user_id)}`, { method: 'DELETE' });
      await supabaseRequest(`user_profiles?user_id=eq.${encodeURIComponent(session.user_id)}`, { method: 'DELETE' });
      const base = authBase();
      const secret = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
      const r = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(session.user_id)}`, { method: 'DELETE', headers: { apikey: secret, Authorization: `Bearer ${secret}` } });
      if (!r.ok) throw new Error('AUTH_DELETE_FAILED');
      return json(200, { ok: true }, { 'set-cookie': clearCookie() });
    } catch {
      return json(500, { error: 'DELETE_FAILED' });
    }
  }

  return json(400, { error: 'UNKNOWN_ACTION' });
}
