import { clientIp, json, rateLimit, requireHuman, strictSameOrigin, supabaseRequest, visitorId, withVisitorCookie } from './_lib.mjs';

const requests = new Map();
const MAX_BODY_BYTES = 4096;
const allowedPrinciples = new Set(['hanging_piece', 'missed_tactic', 'king_safety', 'opening', 'endgame', 'piece_activity', 'center', 'calculation', 'time_pressure', 'unknown']);

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  if (!strictSameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, { 'cache-control': 'no-store' });
  if (!requireHuman(event)) return json(403, { ok: false, error: 'HUMAN_CHECK_REQUIRED' });
  const ip = clientIp(event);
  if (!rateLimit(requests, ip, 30, 60 * 1000) || !rateLimit(requests, '__global__', 300, 60 * 1000)) return json(429, { ok: false, error: 'rate_limited' }, { 'cache-control': 'no-store', 'retry-after': '60' });
  if (String(event.body || '').length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
  const principle = String(body.principle || 'unknown');
  const phase = String(body.phase || 'unknown').slice(0, 40);
  const severity = Number(body.severity || 0);
  if (!allowedPrinciples.has(principle)) return json(400, { ok: false, error: 'invalid_principle' });
  const id = visitorId(event);
  try {
    if (process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      await supabaseRequest('adaptive_signals', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([{ visitor_id: id, principle, phase, severity: Math.max(0, Math.min(1000, Number.isFinite(severity) ? severity : 0)) }]),
      });
    }
    return withVisitorCookie(json(200, { ok: true, stored: Boolean(process.env.SUPABASE_URL) }), id);
  } catch {
    return withVisitorCookie(json(200, { ok: true, stored: false }), id);
  }
}
