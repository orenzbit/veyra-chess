#!/usr/bin/env node
// Visual check: puzzle feedback shows on the board, not only in the side panel.
// On "אימון אישי" puzzles, at 1440x900 and 1280x720:
//  - before any move the board has no coloured ring;
//  - after a wrong move the board gets a red ring (the danger colour) and the "try again" card plays a short shake;
//  - after "נסה שוב" and the correct move the ring turns green (the success colour) and the "נכון!" card pops in;
//  - with prefers-reduced-motion the card's animation is cut to (near) zero.
// Reads computed styles (outline, animation) in Chromium.
// Usage: npm run build && node scripts/check-visual-puzzle-feedback.mjs   (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs, PORT=4670)
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = Number(process.env.PORT || 4670);
const base = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, ['scripts/local-preview.mjs', '--port', String(port)], { stdio: 'ignore' });
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };
const rgb = (c) => (c.match(/\d+/g) || []).slice(0, 3).map(Number);
const near = (a, b) => a.length === 3 && b.length === 3 && a.every((v, i) => Math.abs(v - b[i]) <= 8);
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await delay(200); }
  browser = await chromium.launch();
  for (const [w, h, reduced] of [[1440, 900, false], [1280, 720, false], [1440, 900, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'load' });
    await page.getByRole('button', { name: /פאזלים/ }).first().click();
    await page.waitForSelector('.puzzle-stat'); await delay(800);
    const colors = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return { ok: s.getPropertyValue('--status-success').trim(), miss: s.getPropertyValue('--status-danger').trim() }; });
    const toRgb = async (hex) => page.evaluate((c) => { const d = document.createElement('div'); d.style.color = c; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; }, hex);
    const okRgb = rgb(await toRgb(colors.ok)), missRgb = rgb(await toRgb(colors.miss));
    const look = () => page.evaluate(() => {
      const wrap = document.querySelector('.puzzle-page .bot-board-wrap'); const s = getComputedStyle(wrap);
      const card = document.querySelector('.puzzle-feedback'); const c = card && getComputedStyle(card);
      return { outline: s.outlineStyle === 'none' ? 'none' : s.outlineColor, outlineWidth: parseFloat(s.outlineWidth) || 0, card: card?.textContent || '', anim: c ? c.animationName : '', dur: c ? parseFloat(c.animationDuration) : 0 };
    });
    const moves = await page.evaluate(async () => {
      const { Chess } = await import('/vendor/veyra-rules/chess-compat.js');
      const s = await (await fetch('/api/puzzles?action=state', { credentials: 'same-origin' })).json();
      const p = s.kits.regular.puzzles[0];
      const accepted = new Set([...(p.accepted || []), ...(p.solution || [])].map((u) => u.slice(0, 4)));
      const wrong = new Chess(p.fen).moves({ verbose: true }).find((m) => !accepted.has(m.from + m.to) && !m.promotion && (() => { const c = new Chess(p.fen); c.move({ from: m.from, to: m.to }); return !c.isCheckmate(); })());
      return { right: p.solution[0], wrong: wrong.from + wrong.to };
    });
    // Move by clicking the two squares (each scrolled into view first: at 1280x720 the puzzle board on this branch can be
    // taller than the window, and a drag cannot reach a square below the fold).
    const drag = async (uci) => {
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
      for (const sq of [uci.slice(0, 2), uci.slice(2, 4)]) {
        await page.evaluate((s) => { const el = document.querySelector(`.board [data-square="${s}"]`); el.scrollIntoView({ block: 'center' }); }, sq);
        await delay(150);
        const r = await page.locator(`.board [data-square="${sq}"]`).first().boundingBox();
        await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
        await delay(150);
      }
      await delay(400);
    };
    const tag = `${w}x${h}${reduced ? ' reduced-motion' : ''}`;
    const s0 = await look();
    await drag(moves.wrong);
    const s1 = await look();
    await page.getByRole('button', { name: 'נסה שוב' }).click(); await delay(400);
    await drag(moves.right);
    const s2 = await look();
    console.log(tag, JSON.stringify({ s0, s1, s2 }));
    if (!reduced) {
      check(s0.outline === 'none' || s0.outlineWidth === 0, `${tag} no ring on the board before a move`);
      check(/נסה שוב/.test(s1.card) && near(rgb(s1.outline), missRgb) && s1.outlineWidth >= 3, `${tag} a wrong move puts a red ring on the board (${s1.outline}, ${s1.outlineWidth}px)`);
      check(s1.anim.includes('shake') && s1.dur > 0.2, `${tag} the "try again" card shakes (${s1.anim} ${s1.dur}s)`);
      check(/נכון/.test(s2.card) && near(rgb(s2.outline), okRgb) && s2.outlineWidth >= 3, `${tag} the correct move turns the ring green (${s2.outline}, ${s2.outlineWidth}px)`);
      check(s2.anim.includes('pop') && s2.dur > 0.2, `${tag} the "נכון!" card pops in (${s2.anim} ${s2.dur}s)`);
    } else {
      check(s1.dur < 0.05 && s2.dur < 0.05, `${tag} with reduced motion the card animation is cut to ~0 (${s1.dur}s, ${s2.dur}s)`);
      check(near(rgb(s1.outline), missRgb) && near(rgb(s2.outline), okRgb), `${tag} the rings still show with reduced motion`);
    }
    await ctx.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
