// Account form checks in Chromium against the local preview (play-findings #7, #8, #22, #40). Needs Playwright (PLAYWRIGHT_MODULE).
// node scripts/check-account-browser.mjs http://127.0.0.1:4340/ [screenshot prefix]
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.argv[2] || 'http://127.0.0.1:4340/'; const out = process.argv[3] || '/tmp/account';
let fails = 0; const check = (ok, name) => { console.log((ok ? 'PASS: ' : 'FAIL: ') + name); if (!ok) fails += 1; };
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('chesscom_username', 'previous_user'); localStorage.setItem('veyra_archive_reviews_v1', '{"g1":{"accuracy":80}}'); localStorage.setItem('tabia_bot_unlocked_index', '3'); } });
const authCalls = [];
await p.route('**/api/auth', async (route) => {
  const body = route.request().postDataJSON?.() || {};
  if (body.action) authCalls.push(body.action);
  if (body.action === 'verify-access-code') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, inviteToken: 'local-token', expiresAt: new Date(Date.now() + 12 * 60000).toISOString() }) });
  if (body.action === 'signup') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'VALIDATION_ERROR' }) });
  return route.fallback();
});
await p.goto(base); await p.waitForTimeout(1500);
const enterApp = async () => { const g = p.getByRole('button', { name: 'המשחקים שלי' }); if (await g.count()) { await g.first().click(); await p.waitForTimeout(800); } };
await enterApp();
await p.getByRole('button', { name: /חשבון/ }).first().click(); await p.waitForTimeout(800);
await p.getByRole('button', { name: 'יציאה' }).first().click(); await p.waitForTimeout(1500);
const left = await p.evaluate(() => ['chesscom_username', 'veyra_archive_reviews_v1', 'tabia_bot_unlocked_index', 'lichess_username', 'veyra_progress_v1', 'tabia_adaptive_opt_in'].filter(k => { const v = localStorage.getItem(k); return v && v !== '{}' && v !== '0'; }));
check(left.length === 0, 'logout clears the previous user\'s data from this browser (left: ' + (left.join(', ') || 'none') + ')');
// Enter in the password field signs in
const email = p.locator('input[type=email]').first(); await email.fill('player@example.com');
await p.locator('input[type=password]').first().fill('long-enough-password'); authCalls.length = 0;
await p.locator('input[type=password]').first().press('Enter'); await p.waitForTimeout(1500);
check(authCalls.includes('login'), 'Enter in the password field submits the login');
if (!authCalls.includes('login')) { await p.getByRole('button', { name: 'היכנס' }).click(); await p.waitForTimeout(1500); }
await enterApp();
// signup: countdown and the validation message
await p.getByRole('button', { name: /חשבון/ }).first().click(); await p.waitForTimeout(800);
await p.getByRole('button', { name: 'יציאה' }).first().click(); await p.waitForTimeout(1200);
await p.getByRole('button', { name: 'יצירת חשבון' }).first().click(); await p.waitForTimeout(600);
await p.locator('input[type=email]').first().fill('player@example.com');
await p.getByRole('button', { name: 'יש לי כבר קוד שאושר' }).click(); await p.waitForTimeout(400);
await p.locator('.access-code-input').fill('123456'); await p.getByRole('button', { name: 'אמת קוד' }).click(); await p.waitForTimeout(800);
const t1 = await p.locator('.access-countdown').first().innerText(); await p.waitForTimeout(2500); const t2 = await p.locator('.access-countdown').first().innerText();
check(t1 !== t2, `the approval countdown ticks (${t1} → ${t2})`);
await p.getByLabel('שם מלא').fill('Player'); await p.getByLabel('שם משתמש').fill('player1'); await p.getByLabel('תאריך לידה').fill('1990-01-01');
await p.locator('input[type=password]').first().fill('short1');
await p.getByRole('button', { name: 'צור חשבון' }).click(); await p.waitForTimeout(800);
let m = await p.locator('.auth-message').allInnerTexts(); m = m.join(' | ');
check(!/VALIDATION_ERROR/.test(m) && /10 תווים/.test(m), 'a short password gets a Hebrew message, not VALIDATION_ERROR (' + m + ')');
await p.screenshot({ path: out + '-short-password.png' });
await p.locator('input[type=password]').first().fill('long-enough-password'); await p.getByRole('button', { name: 'צור חשבון' }).click(); await p.waitForTimeout(600);
m = (await p.locator('.auth-message').allInnerTexts()).join(' | ');
check(/תנאי השימוש/.test(m), 'an unticked terms box says so (' + m + ')');
await p.locator('.consent-row input').check(); await p.getByRole('button', { name: 'צור חשבון' }).click(); await p.waitForTimeout(800);
m = (await p.locator('.auth-message').allInnerTexts()).join(' | ');
check(!/VALIDATION_ERROR/.test(m) && /[א-ת]/.test(m), 'a server VALIDATION_ERROR reads as Hebrew (' + m + ')');
await b.close();
if (fails) { console.error(fails + ' account browser check(s) failed.'); process.exit(1); }
console.log('Account browser checks passed.');
