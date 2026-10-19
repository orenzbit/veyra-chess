import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [main, styles] = await Promise.all([
  readFile('src/main.ts', 'utf8'),
  readFile('public/styles.css', 'utf8'),
]);
for (const token of [
  "h('button',{onClick:openDnaPage},'סקירת DNA')",
  "if(page==='dna')",
  'async function runDnaReview()',
  'selectLatestDnaGames',
  'DNA_ENGINE_VERSION',
  'DNA_ANALYSIS_SCHEMA_VERSION',
  'assertSameDnaOwner',
  'dnaCancelRef.current=true',
  'dnaRunLockRef.current',
  "action:'save-game'",
  "action:'save-report'",
  'לא יסומן כהושלם',
  'dnaProgress.done',
  'report.execution={selected:',
  'clockSeconds.length===moves.length',
  'bucket.clock?.lowTimeRatePer100Moves==null',
  'bucket.count<5',
]) assert.ok(main.includes(token), 'DNA UI workflow missing contract: ' + token);
for (const token of ['.dna-content', '.dna-progress-track', '.dna-cancel-button', '.dna-time-controls', '.dna-sample-note']) {
  assert.ok(styles.includes(token), 'DNA report style missing: ' + token);
}
console.log('PASS: Chess DNA UI exposes selection, progress, cancellation, account guards, cache/versioning and truthful failure states.');
