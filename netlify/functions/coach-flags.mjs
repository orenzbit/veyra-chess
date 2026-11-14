import { json } from './_lib.mjs';

// The coach's "why?" button on game review (COACH_EXPLAIN_ENABLED): off unless the env var is exactly "true" (any case).
export function createHandler(deps = {}) {
  const env = deps.env || process.env;
  return async function handler(event) {
    if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'method_not_allowed' }, { 'cache-control': 'no-store' });
    return json(200, { ok: true, explain: String(env.COACH_EXPLAIN_ENABLED || '').trim().toLowerCase() === 'true' }, { 'cache-control': 'no-store' });
  };
}

export const handler = createHandler();
