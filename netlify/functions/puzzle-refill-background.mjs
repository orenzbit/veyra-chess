// Background function (the "-background" suffix gives it up to 15 minutes). Netlify answers the caller with
// 202 immediately; everything below runs afterwards. The user always comes from the session cookie.
import { sameOrigin, strictSameOrigin, supabaseRequest, json } from './_lib.mjs';
import { currentSession } from './auth.mjs';
import { puzzlesEnabledFor } from './lib/puzzle-config.mjs';
import { loadEngine } from './lib/engine-node.mjs';
import { runJob } from './lib/puzzle-jobs.mjs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createHandler(deps = {}) {
  const session = deps.currentSession || currentSession;
  const db = deps.db || supabaseRequest;
  const env = deps.env || process.env;
  const getEngine = deps.loadEngine || loadEngine;
  const run = deps.runJob || runJob;
  return async function handler(event) {
    if (event.httpMethod !== 'POST' || !sameOrigin(event) || !strictSameOrigin(event)) return json(403, { ok: false, error: 'forbidden' });
    const user = session(event);
    if (!user?.user_id) return json(401, { ok: false, error: 'UNAUTHENTICATED' });
    if (!puzzlesEnabledFor(user.user_id, env)) return json(404, { ok: false, error: 'DISABLED' });
    let jobId = '';
    try { jobId = String(JSON.parse(event.body || '{}').jobId || ''); } catch { /* handled below */ }
    if (!UUID_RE.test(jobId)) return json(400, { ok: false, error: 'bad_request' });
    const engine = await getEngine();
    const result = await run({ db, engine, userId: String(user.user_id), jobId });
    return json(200, { ok: true, outcome: result.outcome });
  };
}

export const handler = createHandler();
