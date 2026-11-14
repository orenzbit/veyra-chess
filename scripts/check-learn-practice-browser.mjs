
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
// Plays the first opening practice in Chromium with moves 300 ms apart (faster than the opponent's 450 ms reply) and checks
// that every correct move counts as correct and that a result card waits for the player. Needs Playwright (PLAYWRIGHT_MODULE)
// and a local preview with LEARNING_PATH_ENABLED=true: node scripts/check-learn-practice-browser.mjs http://127.0.0.1:4330/ [shot]
const base = process.argv[2] || 'http://127.0.0.1:4330/'; const gapMs = 300; const out = process.argv[3] || '/tmp/learn-practice';
let fails = 0; const check = (ok, name) => { console.log((ok ? 'PASS: ' : 'FAIL: ') + name); if (!ok) fails += 1; };
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto(base); await p.waitForTimeout(1500);
await p.getByRole('button',{name:'המשחקים שלי'}).first().click(); await p.waitForTimeout(800);
await p.getByRole('button',{name:'למידה'}).first().click(); await p.waitForTimeout(1500);
await p.locator('button:has-text("♗")').first().click(); await p.waitForTimeout(800);
for (let i=0;i<10;i++){ const fin=p.getByRole('button',{name:'סיום השיעור'}); if(await fin.count()){await fin.click();break;} await p.getByRole('button',{name:'הבא'}).click(); await p.waitForTimeout(300);}
await p.waitForTimeout(800); await p.getByRole('button',{name:'המשך'}).click(); await p.waitForTimeout(800);
await p.locator('button:has-text("♞")').first().click(); await p.waitForSelector('[data-learn-practice]'); await p.waitForTimeout(800);
const counters=()=>p.locator('.learn-counters').innerText();
const drag=async(uci)=>{const a=await p.locator(`[data-learn-practice] [data-square="${uci.slice(0,2)}"]`).first().boundingBox(); const c=await p.locator(`[data-learn-practice] [data-square="${uci.slice(2,4)}"]`).first().boundingBox(); await p.mouse.move(a.x+a.width/2,a.y+a.height/2); await p.mouse.down(); await p.mouse.move(c.x+c.width/2,c.y+c.height/2,{steps:3}); await p.mouse.up();};
const line=['e2e4','g1f3','f1c4','c2c3','d2d3','e1g1'];
if (false) { await drag('d2d4'); await p.waitForTimeout(800); console.log('after d4 |', (await counters()).replace(/\s+/g,' ')); await p.getByRole('button',{name:'רמז'}).click(); await p.waitForTimeout(800); console.log('after hint |', (await counters()).replace(/\s+/g,' ')); }
for (const mv of line) {
  await drag(mv);
  const st = await p.locator('.learn-sentence').innerText().catch(()=>'');
  console.log(mv, '|', (await counters()).replace(/\s+/g,' '), '|', st);
  if (await p.locator('[data-learn-practice]').count()===0) break;
  await p.waitForTimeout(gapMs);
}
await p.waitForTimeout(700);
console.log('END', await p.locator('[data-learn-practice]').count() ? (await counters()).replace(/\s+/g,' ') : 'practice closed');
const res = p.locator('[data-learn-result]');
console.log('RESULT', (await res.count()) ? (await res.innerText()).replace(/\s+/g,' ') : 'none');
const final = (await p.locator('[data-learn-practice]').count()) ? (await counters()).replace(/\s+/g,' ') : '';
check(/0 טעויות 6 נכון/.test(final), 'six fast correct moves count as 6 correct, 0 mistakes (' + (final || 'practice closed') + ')');
check((await res.count()) > 0, 'a result card appears at the end of the line');
await p.waitForTimeout(1500); check((await res.count()) > 0, 'the result card waits for the player (still there 1.5 s later)');
if (await res.count()) { await p.screenshot({ path: out + '-result.png' }); await res.getByRole('button', { name: 'המשך' }).click(); await p.waitForTimeout(800); check(await p.locator('[data-learn-practice]').count() === 0, '"המשך" closes the practice'); }
await p.screenshot({path: out+'.png'});
await b.close();
if (fails) { console.error(fails + ' learn practice browser check(s) failed.'); process.exit(1); }
console.log('Learn practice browser checks passed.');
