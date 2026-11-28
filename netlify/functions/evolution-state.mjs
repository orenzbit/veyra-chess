import { clientIp, json, rateLimit, sameOrigin, strictSameOrigin, supabaseRequest } from './_lib.mjs';
import { liveSession } from './auth.mjs';
import { ownerSession } from './lib/admin-owner.mjs';

const RATE = new Map();
const MAX_BODY_BYTES = 200 * 1024;
const MAX_STATE_BYTES = 180 * 1024;
const NO_STORE = { 'cache-control': 'no-store' };

function parseBody(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return { __tooLarge: true };
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function validSnapshotPayload(snap) {
  return Boolean(
    snap && typeof snap === 'object' &&
    typeof snap.version === 'string' && snap.version.trim() &&
    snap.positionBook && typeof snap.positionBook === 'object' &&
    Object.keys(snap.positionBook).length > 0 &&
    snap.holdout && typeof snap.holdout === 'object' &&
    Number.isFinite(Number(snap.holdout.top1Accuracy)) &&
    Number.isFinite(Number(snap.holdout.top3Accuracy)) &&
    Number.isFinite(Number(snap.holdout.positionsTested))
  );
}

async function handleGetPublicOren() {
  try {
    const rows = await supabaseRequest(
      'public_oren_bot_versions?slug=eq.orenzbit&select=slug,active_version,active_payload,past_payload,quality_gate,updated_at&limit=1'
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    const bot = row ? {
      slug: row.slug,
      activeVersion: row.active_version,
      activeSnapshot: row.active_payload,
      pastSnapshot: row.past_payload || null,
      qualityGate: row.quality_gate || null,
      updatedAt: row.updated_at || null,
    } : null;
    return json(200, { ok: true, bot, source: row ? 'server' : 'static-baseline' }, { 'cache-control': 'private, max-age=30' });
  } catch {
    return json(200, { ok: true, bot: null, source: 'static-baseline' }, NO_STORE);
  }
}

async function handleGetMine(event) {
  const session = await liveSession(event);
  if (!session?.user_id) return json(401, { ok: false, error: 'auth_required' }, NO_STORE);
  try {
    const rows = await supabaseRequest(
      `user_evolution_state?user_id=eq.${encodeURIComponent(session.user_id)}&select=state_json,revision,last_scan_ts,updated_at&limit=1`
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    return json(200, {
      ok: true,
      userId: session.user_id,
      isOwner: Boolean(ownerSession(event)),
      state: row?.state_json || null,
      revision: Number(row?.revision || 0),
      lastScanTs: Number(row?.last_scan_ts || 0),
      updatedAt: row?.updated_at || null,
    }, NO_STORE);
  } catch (err) {
    return json(503, { ok: false, error: 'storage_unavailable', detail: String(err?.message || '') }, NO_STORE);
  }
}

async function handleSaveMine(session, body) {
  const nextState = body.state;
  if (!nextState || typeof nextState !== 'object') return json(400, { ok: false, error: 'invalid_state' }, NO_STORE);
  if (Buffer.byteLength(JSON.stringify(nextState), 'utf8') > MAX_STATE_BYTES) {
    return json(413, { ok: false, error: 'state_too_large' }, NO_STORE);
  }
  const incomingScanTs = Number(nextState.lastScanTimestampMs || 0);
  const incomingRev = Number(body.revision || 1);
  try {
    const existingRows = await supabaseRequest(
      `user_evolution_state?user_id=eq.${encodeURIComponent(session.user_id)}&select=revision,last_scan_ts,state_json&limit=1`
    );
    const existing = Array.isArray(existingRows) ? existingRows[0] : null;
    const existingScanTs = Number(existing?.last_scan_ts || 0);
    if (existing && incomingScanTs > 0 && existingScanTs > 0 && incomingScanTs < existingScanTs) {
      return json(409, {
        ok: false, error: 'stale_scan_order',
        serverRevision: Number(existing.revision || 1), serverLastScanTs: existingScanTs, state: existing.state_json,
      }, NO_STORE);
    }
    const nextRevision = Math.max(incomingRev, Number(existing?.revision || 0) + 1);
    const nowIso = new Date().toISOString();
    await supabaseRequest('user_evolution_state?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: session.user_id,
        state_json: nextState,
        revision: nextRevision,
        last_scan_ts: Math.max(incomingScanTs, existingScanTs),
        updated_at: nowIso,
      }),
    });
    return json(200, { ok: true, revision: nextRevision, updatedAt: nowIso }, NO_STORE);
  } catch (err) {
    return json(503, { ok: false, error: 'save_failed', detail: String(err?.message || '') }, NO_STORE);
  }
}

async function handlePublishPublicOren(event, session, body) {
  const owner = ownerSession(event);
  if (!owner || owner.user_id !== session.user_id) return json(403, { ok: false, error: 'owner_only' }, NO_STORE);
  const { activeSnapshot, pastSnapshot, qualityGate } = body;
  if (!qualityGate || qualityGate.approved !== true) return json(400, { ok: false, error: 'quality_gate_not_approved' }, NO_STORE);
  if (!validSnapshotPayload(activeSnapshot)) return json(400, { ok: false, error: 'invalid_snapshot' }, NO_STORE);

  const sanitizedActive = { ...activeSnapshot, id: 'orenzbit', slug: 'orenzbit', name: 'אורן (בוט ציבורי)', isPublicOrenBot: true, isAdaptivePersonalBot: true };
  const sanitizedPast = validSnapshotPayload(pastSnapshot)
    ? { ...pastSnapshot, id: 'orenzbit-past', slug: 'orenzbit-past', name: 'אורן מלפני חודש (ציבורי)', isPublicOrenBot: true, isAdaptivePersonalBot: true }
    : null;
  try {
    const nowIso = new Date().toISOString();
    await supabaseRequest('public_oren_bot_versions?on_conflict=slug', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        slug: 'orenzbit', active_version: String(sanitizedActive.version),
        active_payload: sanitizedActive, past_payload: sanitizedPast,
        quality_gate: qualityGate, published_by: owner.user_id, updated_at: nowIso,
      }),
    });
    return json(200, { ok: true, slug: 'orenzbit', activeVersion: sanitizedActive.version, updatedAt: nowIso }, NO_STORE);
  } catch (err) {
    return json(503, { ok: false, error: 'publish_failed', detail: String(err?.message || '') }, NO_STORE);
  }
}

export async function handler(event) {
  const method = event?.httpMethod || 'GET';
  if (method !== 'GET' && method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' }, NO_STORE);
  if (!sameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, NO_STORE);
  const ip = clientIp(event || { headers: {} });
  if (!rateLimit(RATE, `ip:${ip}:${method}`, method === 'POST' ? 40 : 90, 60 * 1000) ||
      !rateLimit(RATE, '__global__', 600, 60 * 1000)) {
    return json(429, { ok: false, error: 'rate_limited' }, { ...NO_STORE, 'retry-after': '60' });
  }
  if (method === 'GET') {
    const action = String(event?.queryStringParameters?.action || 'public-oren').trim();
    if (action === 'public-oren') return handleGetPublicOren();
    if (action === 'mine') return handleGetMine(event);
    return json(400, { ok: false, error: 'unknown_action' }, NO_STORE);
  }
  if (!strictSameOrigin(event)) return json(403, { ok: false, error: 'forbidden' }, NO_STORE);
  const body = parseBody(event?.body);
  if (body?.__tooLarge) return json(413, { ok: false, error: 'payload_too_large' }, NO_STORE);
  if (!body || typeof body.action !== 'string') return json(400, { ok: false, error: 'invalid_body' }, NO_STORE);
  const session = await liveSession(event);
  if (!session?.user_id) return json(401, { ok: false, error: 'auth_required' }, NO_STORE);
  if (body.action === 'save-mine') return handleSaveMine(session, body);
  if (body.action === 'publish-public-oren') return handlePublishPublicOren(event, session, body);
  return json(400, { ok: false, error: 'unknown_action' }, NO_STORE);
}
