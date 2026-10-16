// Human check endpoint (bot protection) using ALTCHA (MIT, self-hosted proof-of-work).
//   GET  /api/human?action=challenge -> signed challenge for the widget
//   POST /api/human {payload}        -> verifies the solution, sets the signed __Host-human cookie
// Everything is verified on the server. No third-party service is contacted and no visitor data leaves this site.
import crypto from 'node:crypto';
import { createChallenge, verifySolution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { HUMAN_COOKIE, HUMAN_TTL_SECONDS, botSecret, botSubKey, json, makeHumanToken, rateLimit, sameOrigin } from './_lib.mjs';

const ALGORITHM = 'PBKDF2/SHA-256';
// Difficulty: the visitor's browser needs on average ~3,000 x 2,000 PBKDF2 rounds (about 1-3 seconds on a normal device).
// Raise COST or the counter range to make it harder for bots, lower it if real visitors on slow phones wait too long.
const COST = 2_000;
const COUNTER_MIN = 1_500;
const COUNTER_MAX = 4_500;
const CHALLENGE_TTL_SECONDS = 300;

const hits = new Map();
const usedChallenges = new Map(); // best-effort replay guard (per warm instance)

function altchaSecrets(secret) {
  return {
    hmacSignatureSecret: botSubKey('altcha-signature', secret).toString('hex'),
    hmacKeySignatureSecret: botSubKey('altcha-key', secret).toString('hex'),
  };
}

function clientIp(event) {
  return String(event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown').trim();
}

function rememberUsed(signature, expiresAtMs) {
  const now = Date.now();
  for (const [key, until] of usedChallenges) if (until <= now) usedChallenges.delete(key);
  if (usedChallenges.size > 5000) return false; // refuse instead of growing without bound
  usedChallenges.set(signature, expiresAtMs);
  return true;
}

function decodePayload(raw) {
  if (raw && typeof raw === 'object') return raw;
  const text = String(raw || '').trim();
  if (!text || text.length > 20000) return null;
  try {
    return JSON.parse(text.startsWith('{') ? text : Buffer.from(text, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export async function handler(event) {
  const secret = botSecret();
  if (!secret) return json(503, { ok: false, error: 'BOT_CHECK_NOT_CONFIGURED' }, { 'cache-control': 'no-store' });

  const method = event.httpMethod || 'GET';
  if (!rateLimit(hits, clientIp(event), 60, 15 * 60 * 1000)) {
    return json(429, { ok: false, error: 'rate_limited' }, { 'retry-after': '900', 'cache-control': 'no-store' });
  }
  const secrets = altchaSecrets(secret);

  if (method === 'GET') {
    const challenge = await createChallenge({
      algorithm: ALGORITHM,
      cost: COST,
      counter: crypto.randomInt(COUNTER_MIN, COUNTER_MAX),
      deriveKey,
      expiresAt: Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS,
      ...secrets,
    });
    return json(200, challenge, { 'cache-control': 'no-store' });
  }

  if (method === 'POST') {
    if (!sameOrigin(event)) return json(403, { ok: false, error: 'forbidden' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
    const payload = decodePayload(body.payload);
    if (!payload?.challenge || !payload?.solution) return json(400, { ok: false, error: 'invalid_payload' });
    const signature = String(payload.challenge.signature || '');
    if (!signature || usedChallenges.has(signature)) return json(403, { ok: false, error: 'challenge_rejected' }, { 'cache-control': 'no-store' });
    let result;
    try {
      result = await verifySolution({
        challenge: payload.challenge,
        solution: payload.solution,
        deriveKey,
        ...secrets,
      });
    } catch {
      return json(403, { ok: false, error: 'challenge_rejected' }, { 'cache-control': 'no-store' });
    }
    if (!result?.verified || !rememberUsed(signature, Date.now() + CHALLENGE_TTL_SECONDS * 1000)) {
      return json(403, { ok: false, error: 'challenge_rejected' }, { 'cache-control': 'no-store' });
    }
    const { token } = makeHumanToken(secret);
    return json(200, { ok: true }, {
      // SameSite=Lax (not Strict) so a link from an e-mail does not trigger the check again.
      'set-cookie': `${HUMAN_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${HUMAN_TTL_SECONDS}`,
      'cache-control': 'no-store',
    });
  }

  return json(405, { ok: false, error: 'method_not_allowed' });
}
