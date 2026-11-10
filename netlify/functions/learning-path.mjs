import { json } from './_lib.mjs';

// Feature flag for the Learn path (courses page and its nav entry). Off unless LEARNING_PATH_ENABLED=true.
// Progress itself rides the account's app state (/api/sync), so this endpoint only answers whether the feature is on.
// dnaPlan: the "What to do next" steps from the user's Chess DNA report, off unless DNA_PLAN_ENABLED=true too.
export function createHandler(deps = {}) {
  const env = deps.env || process.env;
  return async function handler(event) {
    if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'method_not_allowed' }, { 'cache-control': 'no-store' });
    if (String(env.LEARNING_PATH_ENABLED || '').toLowerCase() !== 'true') return json(404, { ok: false, error: 'DISABLED' }, { 'cache-control': 'no-store' });
    return json(200, { ok: true, enabled: true, dnaPlan: String(env.DNA_PLAN_ENABLED || '').toLowerCase() === 'true' }, { 'cache-control': 'no-store' });
  };
}

export const handler = createHandler();
