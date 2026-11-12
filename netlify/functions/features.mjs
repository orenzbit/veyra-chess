import { json } from './_lib.mjs';

// Feature flags the client asks for once at start. Each is off unless its env var is exactly "true" (any case).
// decisiveMoments: the review screen's decisive-moments panel (DECISIVE_MOMENTS_ENABLED).
const FLAGS = { decisiveMoments: 'DECISIVE_MOMENTS_ENABLED' };

export function createHandler(deps = {}) {
  const env = deps.env || process.env;
  return async function handler(event) {
    if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'method_not_allowed' }, { 'cache-control': 'no-store' });
    const flags = Object.fromEntries(Object.entries(FLAGS).map(([key, name]) => [key, String(env[name] || '').toLowerCase() === 'true']));
    return json(200, { ok: true, ...flags }, { 'cache-control': 'no-store' });
  };
}

export const handler = createHandler();
