import { json, requireAdmin, sameOrigin, supabaseRequest } from './_lib.mjs';

const allowed = new Set(['name', 'title', 'elo', 'tier', 'flavor', 'piece', 'openingsAsWhite', 'openingsAsBlack', 'gambits']);

export async function handler(event) {
  if (!sameOrigin(event)) return json(403, { ok: false, error: 'forbidden' });
  if (!requireAdmin(event)) return json(401, { ok: false, error: 'admin_required' });
  const method = event.httpMethod || 'GET';
  if (method === 'GET') {
    try {
      const rows = await supabaseRequest('bot_overrides?select=slug,payload,updated_at&order=slug.asc');
      return json(200, { ok: true, overrides: rows || [] });
    } catch (error) {
      return json(200, { ok: true, overrides: [], storage: 'offline' });
    }
  }
  if (method === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
    const slug = String(body.slug || '').trim();
    const source = body.payload && typeof body.payload === 'object' ? body.payload : {};
    if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) return json(400, { ok: false, error: 'invalid_slug' });
    const payload = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(source, key)) payload[key] = source[key];
    }
    if (payload.name != null && (typeof payload.name !== 'string' || payload.name.trim().length < 1 || payload.name.length > 80)) return json(400, { ok: false, error: 'invalid_name' });
    if (payload.title != null && (typeof payload.title !== 'string' || payload.title.length > 120)) return json(400, { ok: false, error: 'invalid_title' });
    if (payload.flavor != null && (typeof payload.flavor !== 'string' || payload.flavor.length > 200)) return json(400, { ok: false, error: 'invalid_flavor' });
    if (payload.piece != null && (typeof payload.piece !== 'string' || payload.piece.length > 8)) return json(400, { ok: false, error: 'invalid_piece' });
    if (payload.elo != null && (!Number.isInteger(payload.elo) || payload.elo < 0 || payload.elo > 4000)) return json(400, { ok: false, error: 'invalid_elo' });
    if (payload.tier != null && (!Number.isInteger(payload.tier) || payload.tier < 1 || payload.tier > 10)) return json(400, { ok: false, error: 'invalid_tier' });
    for (const key of ['openingsAsWhite','openingsAsBlack','gambits']) {
      if (payload[key] != null && (!Array.isArray(payload[key]) || payload[key].length > 100)) return json(400, { ok: false, error: `invalid_${key}` });
      if (Array.isArray(payload[key]) && payload[key].some(v => typeof v !== 'object' || v === null)) return json(400, { ok: false, error: `invalid_${key}` });
    }
    try {
      const rows = await supabaseRequest('bot_overrides?on_conflict=slug', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify([{ slug, payload }]),
      });
      return json(200, { ok: true, row: rows?.[0] || null });
    } catch (error) {
      return json(503, { ok: false, error: 'storage_not_configured', detail: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined });
    }
  }
  return json(405, { ok: false, error: 'method_not_allowed' });
}
