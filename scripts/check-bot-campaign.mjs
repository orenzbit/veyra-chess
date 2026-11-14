// Bot campaign: a finished game counts the moment it ends.
// Before this fix the unlock (and anything else "game over" did) ran only when the player pressed
// "העבר לסקירה"; going straight back to the bot list after a win left the next bot locked, bot games were
// never saved to the account, the page still said "תורך" after mate, and resign ended the game on one tap.
// The full browser version of these checks is scripts/check-bot-campaign-browser.mjs (needs Playwright).
import { readFile } from 'node:fs/promises';

const main = await readFile('src/main.ts', 'utf8');
const css = await readFile('public/styles.css', 'utf8');
const botGame = main.slice(main.indexOf('function BotGame('), main.indexOf('function formatClock('));
const finishText = (botGame.match(/function finishText\(\)\{[^\n]*?\}\n/) || [''])[0];
const botsPage = main.slice(main.indexOf("if(page==='bots') {"), main.indexOf("if(page==='bots') {") + 6000);

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); if (!ok) failed++; };

check('the game end is reported from an effect on the result, not from the review button',
  /useEffect\(\(\)=>\{ if\(!result\|\|finishedRef\.current\)return;[^\n]*onGameFinished\?\.\(/.test(botGame) && /\},\[result\]\);/.test(botGame));
check('"העבר לסקירה" only opens the review', finishText !== '' && !/onGameFinished/.test(finishText));
check('the finished game is reported once (guarded)', /finishedRef\.current=true/.test(botGame));
check('every finished bot game is saved to the account as a bot game',
  /onGameFinished:\(\{[^}]*pgn:gamePgn[^}]*\}\)=>\{[^\n]*saveGameToAccount\(gamePgn,moves,meta\)/.test(main) && /source:'bot'/.test(botGame)
  && /meta:\{white:hd\('White'\)[^\n]*source:'upload',\.\.\.\(meta\|\|\{\}\)/.test(main));
check('a win still unlocks the next bot', /return \{next:won&&!botStart\?recordBotWin\(botIndex\):null,saved\}/.test(main));
check('after the game the turn label no longer says "תורך"', /result\?'המשחק נגמר':thinking\?'הבוט חושב\.\.\.':'תורך'/.test(botGame));
check('resign / draw buttons are hidden once the game is over', /!result&&h\('div',\{className:'bot-side-actions'\}/.test(botGame));
check('game-over panel says who won and what was unlocked', /game-over-card/.test(botGame) && /ניצחת!/.test(botGame) && /נפתח הבוט הבא/.test(botGame));
check('resign asks "are you sure?" first', /function resign\(\)\{if\(!window\.confirm\('בטוח/.test(botGame));
check('bot page: the start controls come before the bot cards',
  botsPage.indexOf("className:'bot-controls'") > 0 && botsPage.indexOf("className:'bot-controls'") < botsPage.indexOf("className:'bot-grid'"));
check('bot page: the start controls stay visible while scrolling', /\.bot-controls\{[^}]*position:sticky/.test(css));
check('bot page opens on the newest unlocked bot', /if\(page!=='bots'\|\|!bots\.length\)return;[^\n]*\.bot-card\[data-bot-index=[^\n]*scrollIntoView/.test(main) && /'data-bot-index':i/.test(botsPage));
check('bot board fills the width it is given and fits the screen height', /\.bot-board-wrap\{width:100%;max-width:min\(820px,calc\(100vh - \d+px\)\)\}/.test(css));

if (failed) { console.log(`FAIL: ${failed} bot campaign check(s) failed.`); process.exit(1); }
console.log('PASS: bot campaign games count when they end, are saved, and the page shows a clear game-over.');
