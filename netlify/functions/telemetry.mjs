import { clientIp, json, rateLimit, requireHuman, strictSameOrigin, supabaseRequest, visitorId, withVisitorCookie } from './_lib.mjs';

const requests = new Map();
const MAX_BODY_BYTES = 16 * 1024;
const allowedTypes = new Set(['app_open', 'review_started', 'review_completed', 'bot_game_started', 'bot_game_finished', 'adaptive_signal', 'download_windows', 'pwa_install_prompt']);

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  if (!strictSameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, { 'cache-control': 'no-store' });
  if (!requireHuman(event)) return json(403, { ok: false, error: 'HUMAN_CHECK_REQUIRED' });
  const ip = clientIp(event);
  if (!rateLimit(requests, ip, 60, 60 * 1000) || !rateLimit(requests, '__global__', 600, 60 * 1000)) return json(429, { ok: false, error: 'rate_limited' }, { 'cache-control': 'no-store', 'retry-after': '60' });
  if (String(event.body || '').length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
  const type = String(body.type || '').trim();
  if (!allowedTypes.has(type)) return json(400, { ok: false, error: 'invalid_event_type' });
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const cleanPayload = JSON.parse(JSON.stringify(payload, (_k, value) => typeof value === 'string' ? value.slice(0, 500) : value));
  const id = visitorId(event);
  try {
    if (process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      await supabaseRequest('telemetry_events', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([{ visitor_id: id, event_type: type, payload: cleanPayload }]),
      });
    }
    return withVisitorCookie(json(200, { ok: true, stored: Boolean(process.env.SUPABASE_URL) }), id);
  } catch {
    return withVisitorCookie(json(200, { ok: true, stored: false }), id);
  }
}
