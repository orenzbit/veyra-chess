import crypto from 'node:crypto';
import { accessCodeHash, clientIp, json, rateLimit, requireAdmin, sameOrigin, strictSameOrigin, supabaseRequest } from './_lib.mjs';

const ACCESS_CODE_TTL_MS = 12 * 60 * 1000;
const requests = new Map();
const MAX_BODY_BYTES = 8192;

function makeAccessCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function handler(event) {
  const method = event.httpMethod || 'GET';
  if (!sameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, { 'cache-control': 'no-store' });
  const ip = clientIp(event);
  if (!rateLimit(requests, `ip:${ip}`, method === 'POST' ? 8 : 30, method === 'POST' ? 15 * 60 * 1000 : 60 * 1000) || !rateLimit(requests, '__global__', 120, 60 * 1000)) return json(429, { ok: false, error: 'rate_limited' }, { 'cache-control': 'no-store', 'retry-after': method === 'POST' ? '900' : '60' });
  if (method === 'POST' && !strictSameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, { 'cache-control': 'no-store' });
  if (method === 'POST' && String(event.body || '').length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' }, { 'cache-control': 'no-store' });
  const adminSession = requireAdmin(event);
  if (!adminSession) return json(401, { ok: false, error: 'admin_required' }, { 'cache-control': 'no-store' });
  const noStore = { 'cache-control': 'no-store' };

  if (method === 'GET') {
    try {
      const rows = await supabaseRequest(
        'signup_access_codes?select=id,email,status,created_at,approved_at,expires_at,attempts,used_at,rejected_at&status=eq.pending&order=created_at.desc&limit=50',
      );
      return json(200, { ok: true, requests: rows || [] }, noStore);
    } catch {
      return json(503, { ok: false, error: 'storage_not_configured' }, noStore);
    }
  }

  if (method === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
    const id = String(body.id || '').trim();
    const decision = body.decision === 'reject' ? 'reject' : 'approve';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { ok: false, error: 'invalid_id' });

    try {
      const rows = await supabaseRequest(`signup_access_codes?select=id,email,status&id=eq.${encodeURIComponent(id)}&limit=1`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return json(404, { ok: false, error: 'request_not_found' });
      if (row.status !== 'pending') return json(409, { ok: false, error: 'request_already_decided' });

      if (decision === 'reject') {
        await supabaseRequest(`signup_access_codes?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'rejected', rejected_at: new Date().toISOString(), rejected_by: adminSession.email, revoked_at: new Date().toISOString() }),
        });
        return json(200, { ok: true, id: row.id, decision: 'reject' }, noStore);
      }

      const code = makeAccessCode();
      const expiresAt = new Date(Date.now() + ACCESS_CODE_TTL_MS).toISOString();
      await supabaseRequest(`signup_access_codes?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminSession.email,
          code_hash: accessCodeHash(row.email, code),
          expires_at: expiresAt,
          attempts: 0,
          revoked_at: null,
          used_at: null,
          rejected_at: null,
          signup_completed: false,
        }),
      });
      return json(200, { ok: true, id: row.id, email: row.email, decision: 'approve', code, expiresAt }, noStore);
    } catch {
      return json(503, { ok: false, error: 'storage_not_configured' }, noStore);
    }
  }

  return json(405, { ok: false, error: 'method_not_allowed' });
}
