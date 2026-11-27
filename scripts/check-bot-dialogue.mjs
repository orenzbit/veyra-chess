import assert from 'node:assert/strict';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import {
  createDialogueTracker,
  detectMoveEvent,
  detectGameEndEvent,
  selectDialogueBubble,
  getBotVoice,
} from '../dist/src/bot-dialogue.js';

// 1. Voice differentiation across bots
assert.equal(getBotVoice({ id: 'tal', style: 'attacking', elo: 2705 }), 'fiery');
assert.equal(getBotVoice({ id: 'capablanca', style: 'endgame', elo: 2725 }), 'calm');
assert.equal(getBotVoice({ id: 'nakamura', style: 'tactical', elo: 2816 }), 'witty');
assert.equal(getBotVoice({ id: 'bobby', style: 'tactical', elo: 100 }), 'warm');

// 2. Check detection + actor perspective (player checks bot vs bot checks player)
{
  const g = new Chess('rnbqkbnr/pppp1ppp/8/4p3/5PP1/8/PPPPP2P/RNBQKBNR b KQkq - 0 2');
  const mv = g.move('Qh4+'); // actually checkmate in Fool's Mate -> game_end
  const evMate = detectMoveEvent(g, mv, 'player', g.history().length);
  assert.equal(evMate?.type, 'game_end');
  assert.equal(evMate?.outcome, 'win');
}
{
  const g = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  g.move('Bc4');
  g.move('Nc6');
  const mv = g.move('Bxf7+');
  const evCheck = detectMoveEvent(g, mv, 'player', g.history().length);
  assert.equal(evCheck?.type, 'check');
  assert.equal(evCheck?.actor, 'player');

  const res = selectDialogueBubble({ id: 'tal', style: 'attacking' }, evCheck, createDialogueTracker(), false);
  assert.ok(res.bubble, 'check must produce a bubble');
  assert.ok(res.bubble.he.includes('שח') && res.bubble.en.toLowerCase().includes('check'));
}

// 3. Exact promotion piece verification (underpromotion to knight must say knight/פרש, never queen)
{
  const g = new Chess('4k3/P7/8/8/8/8/6PP/4K3 w - - 0 1');
  const mv = g.move({ from: 'a7', to: 'a8', promotion: 'n' });
  const ev = detectMoveEvent(g, mv, 'player', 1);
  assert.equal(ev?.type, 'promotion');
  assert.equal(ev?.promotion, 'n');
  const res = selectDialogueBubble({ id: 'karpov' }, ev, createDialogueTracker(), false);
  assert.ok(res.bubble?.he.includes('פרש'), `Expected knight in Hebrew promotion line, got: ${res.bubble?.he}`);
  assert.ok(res.bubble?.en.toLowerCase().includes('knight'), `Expected knight in English promotion line, got: ${res.bubble?.en}`);
}

// 4. Queen capture perspective: player captures bot's queen must never claim bot captured player's queen
{
  const g = new Chess('4k3/8/8/3q4/2Q5/8/8/4K3 w - - 0 1');
  const mv = g.move('Qxd5');
  const ev = detectMoveEvent(g, mv, 'player', 1);
  assert.equal(ev?.type, 'capture_queen');
  assert.equal(ev?.actor, 'player');
  const res = selectDialogueBubble({ id: 'fischer' }, ev, createDialogueTracker(), false);
  assert.ok(res.bubble?.he.includes('שלי') || res.bubble?.he.includes('איבדתי'), `Unexpected perspective: ${res.bubble?.he}`);
  assert.ok(res.bubble?.en.toLowerCase().includes('my queen') || res.bubble?.en.toLowerCase().includes('i lost the queen'), `Unexpected perspective EN: ${res.bubble?.en}`);
}

// 5. Castling & pawn almost promoting
{
  const g = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const mv = g.move('O-O');
  const ev = detectMoveEvent(g, mv, 'bot', 2);
  assert.equal(ev?.type, 'castle');
  assert.equal(ev?.castleSide, 'kingside');
}
{
  const g = new Chess('4k3/8/P7/8/8/8/8/4K3 w - - 0 1');
  const mv = g.move('a7');
  const ev = detectMoveEvent(g, mv, 'player', 2);
  assert.equal(ev?.type, 'pawn_almost_promoting');
}

// 6. Cooldown suppresses back-to-back low/medium events, while critical events still fire
{
  let tracker = createDialogueTracker();
  const r1 = selectDialogueBubble({ id: 'ido', elo: 700 }, { type: 'castle', actor: 'player', priority: 50, ply: 6 }, tracker, false);
  assert.ok(r1.bubble, 'first castle fires');
  tracker = r1.tracker;

  const r2 = selectDialogueBubble({ id: 'ido', elo: 700 }, { type: 'capture_minor', actor: 'bot', priority: 30, ply: 7, captured: 'n' }, tracker, false);
  assert.equal(r2.bubble, null, 'back-to-back minor capture within cooldown is suppressed');

  const r3 = selectDialogueBubble({ id: 'ido', elo: 700 }, { type: 'check', actor: 'player', priority: 70, ply: 7 }, tracker, false);
  assert.ok(r3.bubble, 'critical check ignores cooldown');
}

// 7. Muted mode suppresses all bubbles & anti-repeat cycles fresh variants
{
  const resMuted = selectDialogueBubble({ id: 'tal' }, { type: 'check', actor: 'player', priority: 70, ply: 5 }, createDialogueTracker(), true);
  assert.equal(resMuted.bubble, null, 'muted suppresses bubbles');

  let t = createDialogueTracker();
  const a = selectDialogueBubble({ id: 'tal' }, { type: 'check', actor: 'player', priority: 70, ply: 4 }, t, false);
  t = a.tracker;
  const b = selectDialogueBubble({ id: 'tal' }, { type: 'check', actor: 'player', priority: 70, ply: 6 }, t, false);
  assert.notEqual(a.bubble?.lineId, b.bubble?.lineId, 'anti-repeat picks a different check variant');
}

// 8. End game helper
{
  const endDraw = detectGameEndEvent('תיקו', false, 40);
  assert.equal(endDraw.type, 'game_end');
  assert.equal(endDraw.outcome, 'draw');
  const endResign = detectGameEndEvent('שחור ניצח בהתפטרות', false, 20);
  assert.equal(endResign.outcome, 'loss');
  assert.equal(endResign.reason, 'resign');
}

console.log('PASS: bot dialogue events, perspective, promotion pieces, cooldown, mute, anti-repeat, and bilingual lines verified.');
