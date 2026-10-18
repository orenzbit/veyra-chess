import { clientIp, json, rateLimit, sameOrigin, strictSameOrigin, supabaseRequest } from './_lib.mjs';
import { currentSession } from './auth.mjs';
import { RATE_LIMIT_PER_MIN, MAX_BODY_BYTES, puzzlesEnabledFor } from './lib/puzzle-config.mjs';
import { loadSeeds } from './lib/puzzle-kits.mjs';
import {
  ApiError, getJobStatus, getPuzzleState, postCheckpoint, postDna, postKit, postRefill, postRemove,
} from './lib/puzzle-service.mjs';

const NO_STORE = { 'cache-control': 'no-store' };
const requests = new Map();
let seedCache = null;

/** Builds the handler with injectable dependencies so tests can run without Netlify, cookies or Supabase. */
export function createHandler(deps = {}) {
  const session = deps.currentSession || currentSession;
  const db = deps.db || supabaseRequest;
  const now = deps.now || Date.now;
  const env = deps.env || process.env;
  const getSeeds = deps.loadSeeds || (async () => (seedCache ||= await loadSeeds()));

  return async function handler(event) {
    const fail = (status, error, extra = {}) => json(status, { ok: false, error, ...extra }, NO_STORE);
    try {
      if (!sameOrigin(event)) return fail(403, 'forbidden');
      const method = event.httpMethod;
      if (method !== 'GET' && method !== 'POST') return fail(405, 'method_not_allowed');
      if (method === 'POST' && !strictSameOrigin(event)) return fail(403, 'forbidden');
      if (Buffer.byteLength(String(event.body || ''), 'utf8') > MAX_BODY_BYTES) return fail(413, 'too_large');
      const user = session(event);
      if (!user?.user_id) return fail(401, 'UNAUTHENTICATED');
      if (!puzzlesEnabledFor(user.user_id, env)) return fail(404, 'DISABLED');
      if (!rateLimit(requests, `${clientIp(event)}|${user.user_id}`, RATE_LIMIT_PER_MIN, 60 * 1000)) {
        return json(429, { ok: false, error: 'rate_limited' }, { ...NO_STORE, 'retry-after': '60' });
      }
      const q = event.queryStringParameters || {};
      const action = String(q.action || '');
      let body = {};
      if (method === 'POST') {
        try { body = event.body ? JSON.parse(event.body) : {}; } catch { return fail(400, 'bad_request', { field: 'json' }); }
      }
      const ctx = { db, userId: String(user.user_id), nowMs: now(), seeds: await getSeeds() };
      let result;
      if (method === 'GET' && action === 'state') result = await getPuzzleState(ctx);
      else if (method === 'GET' && action === 'job') result = await getJobStatus(ctx, q.id);
      else if (method === 'POST' && action === 'checkpoint') result = await postCheckpoint(ctx, body);
      else if (method === 'POST' && action === 'kit') result = await postKit(ctx, body);
      else if (method === 'POST' && action === 'dna') result = await postDna(ctx, body);
      else if (method === 'POST' && action === 'refill') result = await postRefill(ctx);
      else if (method === 'POST' && action === 'remove') result = await postRemove(ctx, body);
      else return fail(400, 'bad_request', { field: 'action' });
      const status = action === 'dna' || (action === 'refill' && result.started) ? 202 : 200;
      return json(status, result, NO_STORE);
    } catch (error) {
      if (error instanceof ApiError) return fail(error.status, error.error, { ...(error.field ? { field: error.field } : {}), ...(error.jobId ? { jobId: error.jobId } : {}) });
      if (error?.status === 429) return fail(429, 'rate_limited');
      return fail(503, 'sync_unavailable');
    }
  };
}

export const handler = createHandler();
