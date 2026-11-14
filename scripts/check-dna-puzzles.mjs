// check-dna-puzzles: a saved DNA report starts the personal-puzzle job (and says so in Hebrew).
import assert from 'node:assert/strict';
import { startPuzzlesAfterDna, dnaPuzzleStatus } from '../src/dna-puzzles.ts';
const res = (status, body) => ({ status, json: async () => body });
let calls = [];
const f = (map) => async (u, i) => { calls.push([u, i && i.body]); return map(u); };
calls = [];
assert.equal(await startPuzzlesAfterDna(f((u) => u.includes('action=dna') ? res(202, { ok: true, jobId: 'a1b2' }) : res(202, {}))), 'started');
assert.equal(calls.length, 2); assert.match(calls[0][0], /action=dna/); assert.deepEqual(JSON.parse(calls[0][1]), { source: 'auto', limit: 40 });
assert.match(calls[1][0], /puzzle-refill-background/); assert.deepEqual(JSON.parse(calls[1][1]), { jobId: 'a1b2' });
assert.equal(await startPuzzlesAfterDna(f(() => res(409, { ok: false, error: 'job_active' }))), 'already_running');
assert.equal(await startPuzzlesAfterDna(f(() => res(404, { ok: false, error: 'DISABLED' }))), 'disabled');
assert.equal(await startPuzzlesAfterDna(f(() => res(429, { ok: false, error: 'daily_cap' }))), 'daily_cap');
assert.equal(await startPuzzlesAfterDna(async () => { throw new Error('offline'); }), 'failed');
assert.equal(await startPuzzlesAfterDna(f(() => res(500, {}))), 'failed');
for (const o of ['started', 'already_running', 'daily_cap', 'failed']) assert.match(dnaPuzzleStatus(o), /[\u0590-\u05FF]/);
assert.equal(dnaPuzzleStatus('disabled'), '');
console.log('check-dna-puzzles: 12/12 PASS');
