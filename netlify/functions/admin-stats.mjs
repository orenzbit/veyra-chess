import { json, requireAdmin, sameOrigin, supabaseRequest } from './_lib.mjs';

export async function handler(event) {
  if (!sameOrigin(event)) return json(403, { ok: false, error: 'forbidden' });
  if (!requireAdmin(event)) return json(401, { ok: false, error: 'admin_required' });
  try {
    const [events, signals, overrides] = await Promise.all([
      supabaseRequest('telemetry_events?select=event_type,created_at&order=created_at.desc&limit=1000'),
      supabaseRequest('adaptive_signals?select=principle,phase,severity,created_at&order=created_at.desc&limit=1000'),
      supabaseRequest('bot_overrides?select=slug,updated_at&order=slug.asc'),
    ]);
    const byType = {};
    for (const row of events || []) byType[row.event_type] = (byType[row.event_type] || 0) + 1;
    const byPrinciple = {};
    for (const row of signals || []) byPrinciple[row.principle] = (byPrinciple[row.principle] || 0) + 1;
    return json(200, { ok: true, events: byType, principles: byPrinciple, overrides: overrides || [] });
  } catch {
    return json(200, { ok: true, events: {}, principles: {}, overrides: [], storage: 'offline' });
  }
}
