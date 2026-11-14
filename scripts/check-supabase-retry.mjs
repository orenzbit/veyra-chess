// supabaseRequest retries once, and only once, when a pooled socket was closed under it (no response at all).
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'http://db.test'; process.env.SUPABASE_SECRET_KEY = 'k';
const { supabaseRequest, isStaleSocketError } = await import('../netlify/functions/_lib.mjs');
const stale = () => Object.assign(new TypeError('fetch failed'), { cause: { code: 'UND_ERR_SOCKET' } });
const ok = () => new Response('[{"a":1}]', { status: 200 });
let n = 0; globalThis.fetch = async () => { n++; if (n === 1) throw stale(); return ok(); };
assert.deepEqual(await supabaseRequest('t?x=1'), [{ a: 1 }]); assert.equal(n, 2, 'stale socket: one retry');
n = 0; globalThis.fetch = async () => { n++; throw stale(); };
await assert.rejects(supabaseRequest('t'), /fetch failed/); assert.equal(n, 2, 'never more than one retry');
n = 0; globalThis.fetch = async () => { n++; throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }); };
await assert.rejects(supabaseRequest('t')); assert.equal(n, 1, 'other network errors are not retried');
n = 0; globalThis.fetch = async () => { n++; return new Response('{"m":"x"}', { status: 409 }); };
await assert.rejects(supabaseRequest('t'), (e) => e.status === 409); assert.equal(n, 1, 'HTTP errors are not retried');
assert.equal(isStaleSocketError(new Error('x')), false);
console.log('check-supabase-retry: 9/9 PASS');
