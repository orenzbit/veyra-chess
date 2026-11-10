// Learn path feature flag: off unless LEARNING_PATH_ENABLED=true. With it off, /api/learning-path answers 404 DISABLED,
// the client never sets learnEnabled, so the nav entry is not rendered and the 'learn' page is not reachable.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHandler } from '../netlify/functions/learning-path.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const get = { httpMethod: 'GET', headers: {} };
const call = async (env, event = get) => { const r = await createHandler({ env })(event); return { status: r.statusCode, body: JSON.parse(r.body), cache: r.headers['cache-control'] }; };

await test('flag off (unset, false, 1, yes): 404 DISABLED', async () => {
  for (const env of [{}, { LEARNING_PATH_ENABLED: 'false' }, { LEARNING_PATH_ENABLED: '1' }, { LEARNING_PATH_ENABLED: 'yes' }]) {
    const r = await call(env);
    assert.equal(r.status, 404, JSON.stringify(env)); assert.equal(r.body.error, 'DISABLED'); assert.equal(r.cache, 'no-store');
  }
});
await test('flag on: 200 enabled', async () => {
  for (const v of ['true', 'TRUE']) { const r = await call({ LEARNING_PATH_ENABLED: v }); assert.equal(r.status, 200); assert.equal(r.body.enabled, true); }
});
await test('only GET', async () => {
  assert.equal((await call({ LEARNING_PATH_ENABLED: 'true' }, { httpMethod: 'POST', headers: {} })).status, 405);
});
await test('client: nav entry and page exist only when the API says enabled', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /const \[learnEnabled,setLearnEnabled\]=useState\(false\);/, 'off until the server says otherwise');
  assert.match(main, /getJson\('\/api\/learning-path'\)\.then\(r=>setLearnEnabled\(r\.ok&&r\.data\?\.enabled===true\)\)/);
  const navs = main.match(/setPage\('learn'\)/g) || [];
  assert.equal(navs.length, 1, 'one nav entry');
  assert.match(main, /learnEnabled&&h\('button',\{onClick:\(\)=>setPage\('learn'\)/, 'the nav entry is behind the flag');
  assert.match(main, /if\(page==='learn'&&learnEnabled\) return h\(LearnPage,/, 'the page is behind the flag');
  assert.equal((main.match(/h\(LearnPage,/g) || []).length, 1, 'LearnPage is rendered only there');
});
await test('local preview mirrors the flag', () => {
  const preview = readFileSync('scripts/local-preview.mjs', 'utf8');
  assert.match(preview, /name === 'learning-path'\) return process\.env\.LEARNING_PATH_ENABLED === 'true'/);
});
console.log(`learn flag: ${passed} passed`);
