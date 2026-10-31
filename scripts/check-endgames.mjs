// Endgame practice library: every position is legal with the stated side to move, is not finished and
// has the expected material; every generated deep link is accepted by the #62 start machinery; the
// puzzles page has the tab with Hebrew and English strings. Run after `tsc -p tsconfig.json`.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { Chess } = await import('../public/vendor/veyra-rules/chess-compat.js');
const { ENDGAMES, ENDGAME_LEVELS, GOAL_LABEL, endgameQuery, endgameBotId } = await import('../dist/src/endgames.js');
const { resolveBotStart, botStartFromQuery, BOT_LEVELS } = await import('../dist/src/bot-start-position.js');
const bots = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));

// Independent expectations (the FENs are the supervisor-verified set; side is the user's side).
const EXPECTED = {
  'kq-k': { fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', turn: 'w', side: 'white', goal: 'mate', white: 'KQ', black: 'K' },
  'kr-k': { fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', turn: 'w', side: 'white', goal: 'mate', white: 'KR', black: 'K' },
  'kbb-k': { fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', turn: 'w', side: 'white', goal: 'mate', white: 'KBB', black: 'K' },
  'kp-k-win': { fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', turn: 'w', side: 'white', goal: 'promote', white: 'KP', black: 'K' },
  lucena: { fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', turn: 'w', side: 'white', goal: 'win', white: 'KPR', black: 'KR' },
  philidor: { fen: '4k3/R7/1r6/4PK2/8/8/8/8 b - - 0 1', turn: 'b', side: 'black', goal: 'draw', white: 'KPR', black: 'KR' },
};
const material = (fen) => {
  const out = { white: [], black: [] };
  for (const ch of fen.split(' ')[0]) {
    if (/[A-Z]/.test(ch)) out.white.push(ch);
    else if (/[a-z]/.test(ch)) out.black.push(ch.toUpperCase());
  }
  return { white: out.white.sort().join(''), black: out.black.sort().join('') };
};
const sorted = (s) => [...s].sort().join('');

assert.equal(ENDGAMES.length, 6);
assert.deepEqual(ENDGAMES.map((e) => e.id).sort(), Object.keys(EXPECTED).sort());
assert.equal(new Set(ENDGAMES.map((e) => e.fen)).size, ENDGAMES.length, 'FENs are unique');

for (const eg of ENDGAMES) {
  const want = EXPECTED[eg.id];
  assert.ok(want, `known id ${eg.id}`);
  assert.equal(eg.fen, want.fen, `${eg.id}: FEN is the verified one`);
  assert.equal(eg.side, want.side, `${eg.id}: user side`);
  assert.equal(eg.goal, want.goal, `${eg.id}: goal`);
  const game = new Chess(eg.fen); // throws on an illegal FEN
  assert.equal(game.turn(), want.turn, `${eg.id}: side to move`);
  assert.equal(game.turn(), eg.side === 'white' ? 'w' : 'b', `${eg.id}: the user moves first`);
  assert.ok(!game.isGameOver() && !game.isDraw(), `${eg.id}: not game over`);
  assert.ok(game.moves().length > 0, `${eg.id}: the side to move has a legal move`);
  assert.equal(game.fen(), eg.fen, `${eg.id}: FEN is in canonical form`);
  assert.deepEqual(material(eg.fen), { white: sorted(want.white), black: sorted(want.black) }, `${eg.id}: material`);
  for (const key of ['he', 'en']) {
    assert.ok(eg.name[key]?.trim() && eg.hint[key]?.trim(), `${eg.id}: ${key} name and hint`);
  }
  assert.match(eg.name.he, /[\u0590-\u05ff]/, `${eg.id}: Hebrew name is Hebrew`);
  assert.match(eg.hint.he, /[\u0590-\u05ff]/, `${eg.id}: Hebrew hint is Hebrew`);
  assert.doesNotMatch(eg.name.en + eg.hint.en, /[\u0590-\u05ff]/, `${eg.id}: English text has no Hebrew`);
  assert.ok(eg.hint.en.length <= 200 && eg.hint.he.length <= 200, `${eg.id}: the hint is one short line`);
  assert.ok(GOAL_LABEL[eg.goal]?.he && GOAL_LABEL[eg.goal]?.en, `${eg.id}: goal label in both languages`);
}
console.log('PASS 6 FENs: legal, stated side to move, not finished, expected material, HE+EN text');

// Levels: 1..4, one existing bot each, deterministic.
assert.deepEqual(ENDGAME_LEVELS.map((l) => l.level), BOT_LEVELS.map((l) => l.id));
for (const lv of ENDGAME_LEVELS) {
  assert.ok(bots.some((b) => b.id === lv.botId), `level ${lv.level}: bot ${lv.botId} exists in the roster`);
  assert.ok(lv.label.he && lv.label.en);
  assert.equal(endgameBotId(lv.level), lv.botId);
}

// Every generated deep link is accepted by the #62 resolver and by the query entry main.ts uses.
let links = 0;
for (const eg of ENDGAMES) {
  for (const lv of ENDGAME_LEVELS) {
    const query = endgameQuery(eg, lv.level);
    const params = new URLSearchParams(query);
    assert.equal(params.get('botgame'), lv.botId);
    assert.equal(params.get('fen'), eg.fen);
    assert.equal(params.get('level'), String(lv.level));
    assert.equal(params.get('side'), eg.side);
    assert.ok(!params.has('moves'));
    const direct = resolveBotStart({ botId: params.get('botgame'), fen: params.get('fen'), level: params.get('level'), side: params.get('side') }, bots, Chess);
    assert.ok(direct.ok, `${eg.id} L${lv.level}: resolveBotStart accepts the link`);
    assert.equal(direct.bot.id, lv.botId);
    assert.equal(direct.start.fen, eg.fen);
    assert.equal(direct.start.reviewable, false, 'a FEN start is a custom start (no campaign win)');
    assert.equal(direct.level, lv.level);
    assert.equal(direct.side, eg.side);
    const viaQuery = botStartFromQuery(query, bots, Chess);
    assert.ok(viaQuery?.ok && viaQuery.start.fen === eg.fen && viaQuery.level === lv.level && viaQuery.side === eg.side, `${eg.id} L${lv.level}: botStartFromQuery accepts the link`);
    links++;
  }
}
assert.equal(endgameQuery(ENDGAMES[0], 9), endgameQuery(ENDGAMES[0], 4), 'an unknown level falls back to the default');
console.log(`PASS ${links} deep links resolve (bot, FEN, level, side) as custom starts`);

// Campaign safety: only the plain-game path records a win.
const main = await readFile('src/main.ts', 'utf8');
assert.ok(main.includes('if(won&&!botStart){recordBotWin(botIndex);}'), 'main.ts records a campaign win only for games without a custom start');

// The tab and its strings.
const page = await readFile('src/puzzle-page.ts', 'utf8');
assert.match(page, /type Tab = [^;]*'endgames'/, "the 'endgames' tab exists");
assert.match(page, /const tabs: Tab\[\] = \[[^\]]*'endgames'[^\]]*\]/, 'the tab is listed');
assert.match(page, /endgames: 'סיומים \/ Endgames'/, 'tab label is Hebrew / English');
assert.match(page, /tab === 'endgames'\) body = h\(EndgamesView/, 'the tab renders the endgames view');
assert.match(page, /'שחק \/ Play'/, 'Play button label');
assert.match(page, /endgameQuery\(eg, level\)/, 'Play uses the deep link');
for (const s of ['ספריית סיומים', 'Endgame library', 'רמה', 'Level', 'מטרה: ', 'Goal: ']) assert.ok(page.includes(s), `view string: ${s}`);
console.log('PASS puzzles page: endgames tab, view and HE+EN strings');
