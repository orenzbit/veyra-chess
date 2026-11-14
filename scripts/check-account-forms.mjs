// Account form fixes (play-findings #7, #8, #22, #40): source checks on src/main.ts.
// scripts/check-account-browser.mjs runs the same flows in Chromium.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync('src/main.ts', 'utf8');
let failed = 0;
function test(name, fn) { try { fn(); console.log(`PASS: ${name}`); } catch (e) { failed += 1; console.error(`FAIL: ${name}\n  ${String(e.message).slice(0, 300)}`); } }
const auth = src.slice(src.indexOf('function AuthPage'), src.indexOf('function validEmailClient'));
test('VALIDATION_ERROR has a Hebrew message', () => assert.match(auth, /VALIDATION_ERROR:mode==='signup'\?\(en\?'[^']+':'חלק מהפרטים חסרים או לא תקינים/));
test('signup checks the fields before sending: password length and terms named in Hebrew', () => {
  assert.match(src, /function signupProblem\(/);
  assert.match(src, /password\.length<10\) return en\?'[^']+':'הסיסמה צריכה לפחות 10 תווים\.'/);
  assert.match(src, /if\(!acceptTerms\) return/);
  assert.match(auth, /const missing=mode==='signup'\?signupProblem\(/);
});
test('the approval countdown also ticks after the code is verified', () => assert.match(auth, /if\(\(accessStage!=='code'&&accessStage!=='verified'\)\|\|!expiresAt\) return;/));
test('Enter in the password field submits', () => assert.match(auth, /type:'password'[^}]*onKeyDown:e=>\{if\(e\.key==='Enter'&&!busy\)\{e\.preventDefault\(\);submit\(\);\}\}/));
test('logout and account delete clear the user data kept on this browser', () => {
  const keys = src.match(/const USER_LOCAL_KEYS=\[([^\]]+)\]/);
  assert.ok(keys, 'USER_LOCAL_KEYS');
  for (const k of ["'chesscom_username'", "'lichess_username'", "'veyra_archive_reviews_v1'", 'BOT_PROGRESS_KEY', "'veyra_progress_v1'", 'ADAPTIVE_OPT_IN_KEY']) assert.ok(keys[1].includes(k), k);
  const reset = "clearUserLocalData();setUsername('');setLichessUsername('');setArchiveReviews({});";
  assert.match(src, new RegExp('onLogout:async\\(\\)=>\\{[^}]*\\}?[^]*?' + reset.replace(/[()[\]{}.*+?^$|]/g, '\\$&')));
  assert.equal(src.split(reset).length - 1, 2, 'both logout and delete reset');
});
if (failed) { console.error(`${failed} account form check(s) failed.`); process.exit(1); }
console.log('Account form checks passed.');
