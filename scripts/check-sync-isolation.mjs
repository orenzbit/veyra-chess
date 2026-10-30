// Sync isolation contract: the user id must always come from the encrypted session cookie,
// never from the request. Supabase is mocked so this proves the server-side scoping logic;
// it does not replace a live RLS test against an isolated Supabase project.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'service-role-key';
process.env.AUTH_SESSION_SECRET = 'sync-session-secret';

const { handler } = await import('../netlify/functions/sync.mjs');

const ORIGIN = 'https://veyra.example';
const USER_A = 'aaaaaaaa-1111-4111-8111-111111111111';
const USER_B = 'bbbbbbbb-2222-4222-8222-222222222222';
const GAME = 'cccccccc-3333-4333-8333-333333333333';

const b64url = (buffer) => Buffer.from(buffer).toString('base64url');
const sessionCookie = (userId, { ttl = 3600, secret = process.env.AUTH_SESSION_SECRET } = {}) => {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const raw = Buffer.from(JSON.stringify({ user_id: userId, email: `${userId.slice(0, 4)}@example.com`, exp: Math.floor(Date.now() / 1000) + ttl }));
  const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
  return `__Host-tabia_session=${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')}`;
};

let ipCounter = 0;
const event = ({ method = 'GET', query = {}, cookie = sessionCookie(USER_A), body, origin = ORIGIN } = {}) => ({
  httpMethod: method,
  rawUrl: ORIGIN + '/api/sync',
  queryStringParameters: query,
  body,
  headers: {
    origin,
    'x-nf-client-connection-ip': `192.0.2.${++ipCounter}`,
    ...(cookie ? { cookie } : {}),
  },
});
const bodyOf = (result) => JSON.parse(result.body);

// --- Supabase mock ---------------------------------------------------------------------
const originalFetch = globalThis.fetch;
let calls = [];
let storedProgress = { done: { a: 5, b: 2 }, completed: { x: 1 }, bot: 3 };
let failWrites = false;

globalThis.fetch = async (url, options = {}) => {
  const target = String(url).replace('https://supabase.test/rest/v1/', '');
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;
  calls.push({ target, method, body });
  if (failWrites && method !== 'GET') return new Response(JSON.stringify({ message: 'down' }), { status: 500 });
  if (method === 'GET') {
    if (target.startsWith('user_progress?')) return new Response(JSON.stringify([{ data: storedProgress, updated_at: '2026-10-19T00:00:00.000Z' }]), { status: 200 });
    if (target.startsWith('user_app_state?')) return new Response(JSON.stringify([{ data: { version: 1, archiveReviews: {}, usernames: { chesscom: 'a', lichess: '' } }, updated_at: '2026-10-19T00:00:00.000Z' }]), { status: 200 });
    if (target.startsWith('user_games?select=id&')) return new Response(JSON.stringify([]), { status: 200 });
    if (target.startsWith('user_games?select=id,pgn,meta,created_at')) return new Response(JSON.stringify([{ id: GAME, pgn: '1. e4 *', meta: {}, created_at: '2026-10-19T00:00:00.000Z' }]), { status: 200 });
    if (target.startsWith('user_games?')) return new Response(JSON.stringify([{ id: GAME, meta: {}, created_at: '2026-10-19T00:00:00.000Z' }]), { status: 200 });
  }
  return new Response('', { status: 200 });
};

const everyCallScopedToA = () => {
  assert.ok(calls.length > 0, 'expected Supabase calls');
  for (const call of calls) {
    if (!call.target.startsWith('user_')) continue;
    assert.doesNotMatch(call.target, new RegExp(USER_B), `request must never reference another user: ${call.target}`);
    const bodyText = JSON.stringify(call.body || '');
    if (bodyText.includes(USER_B)) throw new Error(`cross-user id leaked into a write: ${bodyText}`);
    if (call.method === 'GET' || call.method === 'DELETE') {
      assert.match(call.target, new RegExp(`user_id=eq\\.${USER_A}`), `unscoped Supabase query: ${call.target}`);
    } else {
      const filtered = call.target.includes(`user_id=eq.${USER_A}`);
      const owned = Array.isArray(call.body) && call.body.every((row) => row.user_id === USER_A);
      assert.ok(filtered || owned, `write is not bound to the session user: ${call.target}`);
    }
  }
};
const expectRejected = async (options, status, error) => {
  calls = [];
  const result = await handler(event(options));
  assert.equal(result.statusCode, status, `${options.method || 'GET'} expected ${status}`);
  if (error) assert.equal(bodyOf(result).error, error);
  assert.equal(calls.length, 0, 'rejected requests must not reach storage');
};

try {
  // 1. Authentication is mandatory and tampering is rejected before any storage call.
  await expectRejected({ cookie: '' }, 401, 'UNAUTHENTICATED');
  await expectRejected({ cookie: sessionCookie(USER_A, { ttl: -60 }) }, 401, 'UNAUTHENTICATED');
  await expectRejected({ cookie: sessionCookie(USER_A, { secret: 'wrong-secret' }) }, 401, 'UNAUTHENTICATED');
  console.log('PASS: sync requires a valid session; missing, expired and tampered cookies are rejected before storage.');

  // 2. Reads are scoped to the session user.
  calls = [];
  const read = await handler(event());
  assert.equal(read.statusCode, 200);
  const readBody = bodyOf(read);
  assert.deepEqual(readBody.progress, storedProgress);
  everyCallScopedToA();
  assert.equal(calls.filter((call) => call.method === 'GET').length, 3);
  console.log('PASS: progress, games and app state reads are scoped to the session user only.');

  // 3. A single game read is scoped by user AND game id.
  calls = [];
  const single = await handler(event({ query: { game: GAME } }));
  assert.equal(single.statusCode, 200);
  assert.equal(bodyOf(single).game.id, GAME);
  everyCallScopedToA();
  assert.match(calls[0].target, new RegExp(`id=eq\\.${GAME}`));
  await expectRejected({ query: { game: 'not-a-uuid' } }, 400, 'bad_id');
  console.log('PASS: single-game reads filter by session user and validate the game id.');

  // 4. Writing progress cannot target another user, even if the body asks for it.
  calls = [];
  const put = await handler(event({ method: 'PUT', body: JSON.stringify({ user_id: USER_B, userId: USER_B, progress: { done: { a: 9, b: 1 }, completed: { y: 4 }, bot: 42 } }) }));
  assert.equal(put.statusCode, 200);
  everyCallScopedToA();
  const progressWrite = calls.find((call) => call.method === 'POST' && call.target.startsWith('user_progress'));
  assert.ok(progressWrite, 'progress upsert missing');
  assert.equal(progressWrite.body[0].user_id, USER_A);
  assert.deepEqual(progressWrite.body[0].data.done, { a: 9, b: 2 }, 'merge must keep the highest counts');
  assert.equal(progressWrite.body[0].data.bot, 19, 'bot progress is clamped to 19');
  console.log('PASS: progress upserts ignore body user ids, stay scoped to the session user, and merge monotonically.');

  // 5. App state writes are sanitized and scoped; bogus review values are dropped.
  calls = [];
  const appState = await handler(event({
    method: 'PUT',
    body: JSON.stringify({
      user_id: USER_B,
      appState: {
        archiveReviews: {
          good: { accuracy: 87.5, reviewedAt: '2026-10-18T10:00:00.000Z' },
          bad: { accuracy: 250, reviewedAt: '2026-10-18T10:00:00.000Z' },
          stale: { accuracy: 70, reviewedAt: 'not-a-date' },
        },
        usernames: { chesscom: 'me', lichess: 'me-too' },
        language: 'en',
        adaptiveOptIn: true,
      },
    }),
  }));
  assert.equal(appState.statusCode, 200);
  everyCallScopedToA();
  const stateWrite = calls.find((call) => call.method === 'POST' && call.target.startsWith('user_app_state'));
  assert.equal(stateWrite.body[0].user_id, USER_A);
  assert.deepEqual(Object.keys(stateWrite.body[0].data.archiveReviews), ['good']);
  assert.equal(stateWrite.body[0].data.language, 'en');
  console.log('PASS: app-state writes are sanitized, scoped to the session user and drop invalid reviews.');

  // 6. Malformed payloads and unsupported shapes are rejected without storage access.
  await expectRejected({ method: 'PUT', body: '{oops' }, 400, 'invalid_json');
  await expectRejected({ method: 'PUT', body: JSON.stringify({ nothing: true }) }, 400, 'missing_sync_data');
  await expectRejected({ method: 'PUT', body: JSON.stringify({ progress: [1, 2, 3] }) }, 400, 'bad_progress');
  await expectRejected({ method: 'PUT', body: JSON.stringify({ appState: [] }) }, 400, 'bad_app_state');
  await expectRejected({ method: 'POST', body: JSON.stringify({ pgn: '' }) }, 400, 'bad_pgn');
  await expectRejected({ method: 'DELETE', query: { game: 'bad' } }, 400, 'bad_id');
  await expectRejected({ method: 'PATCH' }, 405, 'method_not_allowed');
  console.log('PASS: malformed sync payloads and methods are rejected before touching storage.');

  // 7. Saving a game stores it under the session user with a content hash and bounded metadata.
  calls = [];
  const save = await handler(event({
    method: 'POST',
    body: JSON.stringify({ user_id: USER_B, pgn: '1. e4 e5 2. Nf3 *', meta: { white: 'W', black: 'B', result: '1-0', source: 'archive', moves: 99999, extra: 'ignored' } }),
  }));
  assert.equal(save.statusCode, 200);
  everyCallScopedToA();
  const gameWrite = calls.find((call) => call.method === 'POST' && call.target.startsWith('user_games'));
  assert.equal(gameWrite.body[0].user_id, USER_A);
  assert.match(gameWrite.body[0].pgn_hash, /^[0-9a-f]{64}$/);
  assert.equal(gameWrite.body[0].meta.moves, 1000);
  assert.equal(gameWrite.body[0].meta.extra, undefined);
  console.log('PASS: game saves are scoped to the session user, hashed and metadata-bounded.');

  // 8. Deletes filter by user AND id; another user's id in the query is never trusted.
  calls = [];
  const deleted = await handler(event({ method: 'DELETE', query: { game: GAME, user_id: USER_B } }));
  assert.equal(deleted.statusCode, 200);
  const deleteCall = calls.find((call) => call.method === 'DELETE');
  assert.match(deleteCall.target, new RegExp(`user_id=eq\\.${USER_A}`));
  assert.match(deleteCall.target, new RegExp(`id=eq\\.${GAME}`));
  assert.doesNotMatch(deleteCall.target, new RegExp(USER_B));
  console.log('PASS: deletes are scoped to the session user even when the query names another user.');

  // 9. Cross-origin and oversized writes never reach storage.
  await expectRejected({ method: 'PUT', origin: 'https://evil.example', body: JSON.stringify({ progress: {} }) }, 403, 'forbidden');
  const huge = JSON.stringify({ progress: { blob: 'x'.repeat(450 * 1024) } });
  const oversized = await handler(event({ method: 'PUT', body: huge }));
  assert.equal(oversized.statusCode, 413);
  console.log('PASS: cross-origin and oversized sync writes are rejected at the function boundary.');

  // 10. Storage errors surface as a generic 503, not a stack trace or partial data.
  failWrites = true;
  const failed = await handler(event({ method: 'PUT', body: JSON.stringify({ progress: { done: { a: 1 } } }) }));
  assert.equal(failed.statusCode, 503);
  assert.equal(bodyOf(failed).error, 'sync_unavailable');
  assert.doesNotMatch(failed.body, /supabase|service-role|stack/i);
  failWrites = false;
  console.log('PASS: storage failures return a generic 503 without leaking configuration details.');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('PASS: sync isolation contract suite completed.');
