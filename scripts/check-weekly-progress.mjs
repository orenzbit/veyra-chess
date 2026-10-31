import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const dataUrl = js => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');

const moduleSource = await readFile('src/weekly-progress.ts', 'utf8');
const moduleUrl = dataUrl(transpile(moduleSource));
const W = await import(moduleUrl);
const { buildWeeklyProgress, isoWeekInfo, isoWeekStartDay, gameDayNumber } = W;

// --- ISO week arithmetic against an independent Thursday-based implementation ---
function referenceIsoWeek(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dow + 3);
  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  return { isoYear, isoWeek: 1 + Math.round((date - firstThursday) / (7 * 86400000)) };
}
for (let day = gameDayNumber('2019-12-01'); day <= gameDayNumber('2031-01-31'); day++) {
  const start = isoWeekStartDay(day);
  const date = new Date(day * 86400000);
  assert.equal((new Date(start * 86400000)).getUTCDay(), 1, 'week starts on Monday');
  assert.ok(day - start >= 0 && day - start <= 6);
  assert.deepEqual(isoWeekInfo(start), referenceIsoWeek(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
}
assert.equal(gameDayNumber('2026-02-31'), null, 'impossible dates are rejected');
assert.equal(gameDayNumber('unknown'), null);
assert.equal(gameDayNumber(undefined), null);
console.log('PASS: ISO week arithmetic matches an independent implementation for 2019-2031.');

const game = (date, accuracy, extra = {}) => ({ fingerprint: 'fp-' + date + '-' + accuracy + '-' + (extra.acpl ?? 'x') + '-' + (extra.n ?? 0), date, playerColor: 'white', result: 'win', accuracy, ...extra });
const reportOf = (blitz = [], rapid = [], bullet = []) => ({
  schemaVersion: 2,
  timeControls: { bullet: { games: bullet }, blitz: { games: blitz }, rapid: { games: rapid } },
});
const row = (progress, weekStart) => progress.rows.find(r => r.weekStart === weekStart);

// --- Sunday -> Monday boundary ---
{
  const p = buildWeeklyProgress(reportOf([game('2026-10-25', 70), game('2026-10-26', 80), game('2026-10-26', 90, { n: 1 })]), { today: '2026-10-28' });
  assert.equal(p.rows.length, 8);
  assert.equal(p.rows[0].weekStart, '2026-10-26', 'newest week first and it starts on a Monday');
  assert.equal(p.rows[0].weekEnd, '2026-11-01');
  assert.equal(p.rows[0].label, '26.10–01.11');
  assert.equal(p.rows[0].games, 2, 'Monday belongs to the new week');
  assert.equal(p.rows[0].accuracy, 85);
  assert.equal(p.rows[1].weekStart, '2026-10-19');
  assert.equal(p.rows[1].games, 1, 'Sunday belongs to the previous week');
  assert.equal(p.rows[1].accuracy, 70);
  assert.equal(p.rows[7].weekStart, '2026-09-07');
  assert.equal(buildWeeklyProgress(reportOf([game('2025-10-27', 80), game('2025-11-02', 82)]), { today: '2025-11-02' }).rows[0].label, '27.10–02.11');
  console.log('PASS: Sunday and Monday fall into different ISO weeks; labels use dd.mm–dd.mm.');
}

// --- ISO week 1 across years ---
{
  const p = buildWeeklyProgress(reportOf([game('2026-12-31', 80), game('2027-01-01', 82, { n: 1 }), game('2027-01-04', 90)]), { today: '2027-01-06' });
  const old = row(p, '2026-12-28');
  const fresh = row(p, '2027-01-04');
  assert.deepEqual([old.isoYear, old.isoWeek], [2026, 53]);
  assert.deepEqual([fresh.isoYear, fresh.isoWeek], [2027, 1]);
  assert.equal(old.games, 2, '2026-12-31 and 2027-01-01 share the last week of 2026');
  assert.equal(old.label, '28.12–03.01');
  assert.equal(fresh.label, '04.01–10.01');
  assert.equal(fresh.games, 1);
  assert.equal(p.rows[0], fresh);
  assert.equal(p.rows[1], old);
  console.log('PASS: 2026-12-31 and 2027-01-04 are in different weeks across the year boundary (53 -> 1).');
}

// --- Missing ACPL ---
{
  const p = buildWeeklyProgress(reportOf([game('2026-10-20', 80), game('2026-10-27', 82)]), { today: '2026-10-28' });
  assert.equal(p.hasAcpl, false);
  assert.equal(p.rows[0].acpl, null);
  assert.equal(p.rows[0].acplTrend, 'none');
  const mixed = buildWeeklyProgress(reportOf([game('2026-10-20', 80, { acpl: 30 }), game('2026-10-20', 90, { acpl: 'bad', n: 1 }), game('2026-10-20', 70, { acpl: -4, n: 2 }), game('2026-10-27', 82, { acpl: 20 })]), { today: '2026-10-28' });
  assert.equal(mixed.hasAcpl, true);
  assert.equal(row(mixed, '2026-10-19').acpl, 30, 'only valid acpl values are averaged');
  assert.equal(row(mixed, '2026-10-19').acplGames, 1);
  assert.equal(row(mixed, '2026-10-19').games, 3, 'games without acpl still count as analyzed games');
  assert.equal(row(mixed, '2026-10-19').accuracy, 80);
  console.log('PASS: missing or invalid acpl is null and never invented.');
}

// --- Trend thresholds, both directions, previous non-empty week ---
{
  const trend = (a, b, extraA = {}, extraB = {}) => {
    const p = buildWeeklyProgress(reportOf([game('2026-10-13', a, extraA), game('2026-10-27', b, extraB)]), { today: '2026-10-28' });
    return { acc: p.rows[0].accuracyTrend, acpl: p.rows[0].acplTrend };
  };
  assert.equal(trend(80, 81).acc, 'stable', '+1.0 is stable');
  assert.equal(trend(81, 80).acc, 'stable', '-1.0 is stable');
  assert.equal(trend(80, 81.1).acc, 'better');
  assert.equal(trend(80, 78.9).acc, 'worse');
  assert.equal(trend(80, 80).acc, 'stable');
  assert.equal(trend(80, 90, { acpl: 20 }, { acpl: 25 }).acpl, 'stable', '+5 cp is stable');
  assert.equal(trend(80, 90, { acpl: 25 }, { acpl: 20 }).acpl, 'stable', '-5 cp is stable');
  assert.equal(trend(80, 90, { acpl: 25 }, { acpl: 19.9 }).acpl, 'better', 'ACPL down is better');
  assert.equal(trend(80, 90, { acpl: 20 }, { acpl: 25.1 }).acpl, 'worse', 'ACPL up is worse');
  assert.equal(trend(80, 90, { acpl: 20 }, {}).acpl, 'none', 'no acpl this week gives no acpl trend');
  const first = buildWeeklyProgress(reportOf([game('2026-10-13', 80), game('2026-10-27', 85)]), { today: '2026-10-28' });
  assert.equal(first.rows[1].accuracyTrend, 'none', 'the oldest non-empty week has nothing to compare with');
  assert.equal(first.rows[2].accuracyTrend, 'none', 'empty weeks have no trend');
  assert.equal(first.rows[0].accuracyTrend, 'better', 'compared with the previous non-empty week, skipping the empty week');
  console.log('PASS: trend thresholds (±1.0 accuracy, ±5 cp), both directions, and previous non-empty week.');
}

// --- Bullet exclusion and the 8-week window ---
{
  const blitz = [game('2026-10-13', 80), game('2026-10-27', 82)];
  const bullet = [game('2026-10-13', 10, { n: 5 }), game('2026-10-27', 20, { n: 6 })];
  const excluded = buildWeeklyProgress(reportOf(blitz, [], bullet), { today: '2026-10-28' });
  assert.equal(excluded.bulletExcluded, true);
  assert.equal(excluded.rows[0].games, 1);
  assert.equal(excluded.rows[0].accuracy, 82);
  const tagged = buildWeeklyProgress(reportOf([...blitz, { ...game('2026-10-27', 5, { n: 7 }), timeClass: 'bullet' }]), { today: '2026-10-28' });
  assert.equal(tagged.rows[0].games, 1, 'games tagged bullet are excluded wherever they are stored');
  const included = buildWeeklyProgress(reportOf(blitz, [], bullet), { today: '2026-10-28', includeBullet: true });
  assert.equal(included.bulletExcluded, false);
  assert.equal(included.rows[0].games, 2);
  assert.equal(included.rows[0].accuracy, 51);
  const onlyBullet = buildWeeklyProgress(reportOf([], [], bullet), { today: '2026-10-28' });
  assert.equal(onlyBullet.nonEmptyWeeks, 0);

  const windowed = buildWeeklyProgress(reportOf([game('2026-09-06', 50), game('2026-09-07', 60), game('2026-11-02', 99)]), { today: '2026-10-28' });
  assert.equal(windowed.rows.reduce((sum, r) => sum + r.games, 0), 1, 'older than 8 weeks and future-dated games are ignored');
  assert.equal(windowed.rows[7].games, 1);
  const dup = buildWeeklyProgress(reportOf([game('2026-10-27', 80)], [game('2026-10-27', 80)]), { today: '2026-10-28' });
  assert.equal(dup.rows[0].games, 1, 'the same fingerprint is counted once');
  console.log('PASS: bullet excluded by default, optional include, 8-week window, duplicates.');
}

// --- Malformed / empty input ---
for (const bad of [null, undefined, {}, { timeControls: null }, { timeControls: { blitz: { games: 'x' } } },
  reportOf([null, 5, { date: 'nope', accuracy: 80 }, { date: '2026-10-27', accuracy: 140 }, { date: '2026-10-27', accuracy: 'high' }])]) {
  const p = buildWeeklyProgress(bad, { today: '2026-10-28' });
  assert.equal(p.rows.length, 8);
  assert.equal(p.nonEmptyWeeks, 0);
  assert.equal(p.hasEnoughData, false);
}

// --- Empty state needs two non-empty weeks ---
{
  const one = buildWeeklyProgress(reportOf([game('2026-10-27', 80), game('2026-10-28', 82, { n: 1 })]), { today: '2026-10-28' });
  assert.equal(one.nonEmptyWeeks, 1);
  assert.equal(one.hasEnoughData, false, 'one week is not enough');
  const two = buildWeeklyProgress(reportOf([game('2026-10-13', 80), game('2026-10-27', 82)]), { today: '2026-10-28' });
  assert.equal(two.nonEmptyWeeks, 2);
  assert.equal(two.hasEnoughData, true, 'two non-empty weeks (not necessarily adjacent) are enough');
  console.log('PASS: empty state below two non-empty weeks.');
}

// --- Component output (Hebrew and English) with a minimal React stub ---
{
  const componentSource = await readFile('src/weekly-progress-section.ts', 'utf8');
  const i18nStub = dataUrl('export const getLang = () => globalThis.__lang;');
  const js = transpile(componentSource)
    .replace(/from\s+['"]\.\/i18n\.js['"]/, `from '${i18nStub}'`)
    .replace(/from\s+['"]\.\/weekly-progress\.js['"]/, `from '${moduleUrl}'`);
  const Fragment = Symbol('Fragment');
  globalThis.React = {
    Fragment,
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: value => [value, () => {}],
    useEffect: () => {},
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const { WeeklyProgressSection, weeklyTrendArrow } = await import(dataUrl(js));
  const flat = node => {
    if (node === false || node == null) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node) + ' ';
    if (Array.isArray(node)) return node.map(flat).join('');
    return (node.children || []).map(flat).join('');
  };
  const realNow = Date;
  const render = (lang, report) => { globalThis.__lang = lang; return flat(WeeklyProgressSection({ report })); };

  assert.equal(weeklyTrendArrow('accuracy', 'better'), '▲');
  assert.equal(weeklyTrendArrow('accuracy', 'worse'), '▼');
  assert.equal(weeklyTrendArrow('acpl', 'better'), '▼');
  assert.equal(weeklyTrendArrow('acpl', 'worse'), '▲');
  assert.equal(weeklyTrendArrow('acpl', 'stable'), '—');
  assert.equal(weeklyTrendArrow('acpl', 'none'), '');

  const emptyHe = render('he', null);
  const emptyEn = render('en', null);
  assert.ok(emptyHe.includes('התקדמות שבועית') && emptyHe.includes('צריך לפחות שבועיים של משחקים מנותחים'));
  assert.ok(emptyEn.includes('Weekly progress') && emptyEn.includes('Need at least two weeks of analyzed games'));

  // The component uses the real local date, so build games relative to now.
  const today = W.localTodayIso(new realNow());
  const dayOf = offset => { const d = W.gameDayNumber(today) + offset; const x = new realNow(d * 86400000); return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0'); };
  const noAcpl = reportOf([game(dayOf(-14), 80), game(dayOf(0), 85)]);
  const he = render('he', noAcpl);
  const en = render('en', noAcpl);
  assert.ok(he.includes('ACPL יופיע למשחקים שינותחו מעכשיו') && !he.includes('will appear'));
  assert.ok(en.includes('ACPL will appear for games analyzed from now on') && !en.includes('יופיע'));
  assert.ok(he.includes('משחקי Bullet לא נכללים') && en.includes('Bullet games are not included'));
  assert.ok(he.includes('—') && he.includes('85.0%') && he.includes('▲'));
  const withAcpl = reportOf([game(dayOf(-14), 80, { acpl: 40 }), game(dayOf(0), 85, { acpl: 30 })]);
  const shown = render('en', withAcpl);
  assert.ok(shown.includes('30.0') && shown.includes('▼') && !shown.includes('will appear'));
  console.log('PASS: component renders empty state, ACPL note and arrows in Hebrew and English.');
}

// --- Wiring ---
{
  const main = await readFile('src/main.ts', 'utf8');
  assert.ok(main.includes("import { WeeklyProgressSection } from './weekly-progress-section.js';"));
  const statsStart = main.indexOf("if(page==='stats')");
  const dnaStart = main.indexOf("if(page==='dna')");
  assert.ok(statsStart >= 0 && dnaStart > statsStart);
  assert.ok(main.slice(statsStart, dnaStart).includes('h(WeeklyProgressSection,{report:dnaReport})'), 'section lives on the stats page');
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.ok(pkg.scripts['check:chess-dna'].includes('node scripts/check-weekly-progress.mjs'), 'check is part of check:chess-dna');
  const css = await readFile('public/styles.css', 'utf8');
  assert.ok(css.includes('.weekly-progress') && css.includes('table-layout:fixed') && css.includes('max-width:100%;overflow-x:auto'), 'narrow-screen safeguards exist');
  console.log('PASS: weekly progress is wired into the stats page and the check chain.');
}
