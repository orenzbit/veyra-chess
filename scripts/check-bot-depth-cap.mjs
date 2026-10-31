// Verifies that a bot's searchDepthCap is honoured identically by the direct (untimed-deadline)
// search and by the worker message path, and that an uncapped bot still reaches its full elo-tier depth.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function main() {
  const { Chess } = await import('../public/vendor/veyra-rules/chess-compat.js');
  const { chooseBotMoveTimed } = await import('../dist/src/bot-engine.js');
  const { handleBotWorkerMessage } = await import('../dist/src/bot-worker.js');
  const { workerBotFields } = await import('../dist/src/bot-worker-client.js');
  const { botNow } = await import('../dist/src/bot-time.js');

  const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
  const eloDepth = (elo) => (elo >= 2400 ? 4 : elo >= 1700 ? 3 : elo >= 700 ? 2 : 1);
  const uci = (m) => (m ? m.from + m.to + (m.promotion || '') : 'none');
  const fen = 'r3k2r/ppp2ppp/2n1bn2/3qp3/3PP3/2N1BN2/PPP2PPP/R2Q1RK1 b kq - 3 12';
  const far = botNow() + 1e9;

  const capped = manifest.find((b) => {
    const cap = Number(b.searchDepthCap);
    return Number.isFinite(cap) && cap > 0 && cap < eloDepth(b.elo || 300);
  });
  assert.ok(capped, 'at least one bot has a searchDepthCap below its elo-tier depth');
  const expectedDepth = Math.max(1, Math.min(eloDepth(capped.elo || 300), Number(capped.searchDepthCap)));

  const direct = chooseBotMoveTimed(new Chess(fen), capped, Chess, { deadlineAt: far });
  assert.equal(direct.complete, true, `${capped.id}: direct search completes before the deadline`);
  assert.equal(direct.depth, expectedDepth, `${capped.id}: direct search respects searchDepthCap (got depth ${direct.depth}, expected ${expectedDepth})`);

  const message = structuredClone({ type: 'choose', id: 1, fen, bot: workerBotFields(capped), deadlineAt: far });
  const reply = await handleBotWorkerMessage(message, async () => Chess);
  assert.equal(reply.type, 'move', `${capped.id}: worker path returns a move`);
  assert.equal(reply.depth, expectedDepth, `${capped.id}: worker path respects searchDepthCap (got depth ${reply.depth}, expected ${expectedDepth})`);
  assert.equal(uci(reply.move), uci(direct.move), `${capped.id}: worker path matches the direct search move exactly`);

  // Bots at elo <= 300 sometimes play a deliberate random move (depth 0), so pick a deterministic tier.
  const uncapped = manifest.find((b) => {
    const cap = Number(b.searchDepthCap);
    return (b.elo || 0) >= 700 && !(Number.isFinite(cap) && cap > 0 && cap < eloDepth(b.elo || 300));
  });
  assert.ok(uncapped, 'at least one bot has no restricting searchDepthCap');
  const uncappedExpected = eloDepth(uncapped.elo || 300);
  const directUncapped = chooseBotMoveTimed(new Chess(fen), uncapped, Chess, { deadlineAt: far });
  assert.equal(directUncapped.depth, uncappedExpected, `${uncapped.id}: uncapped bot still reaches its full elo-tier depth (got ${directUncapped.depth}, expected ${uncappedExpected})`);

  // Position-matching bots must stay on the cached book path inside a small budget (the uncached path cost about 480 ms per call).
  const positional = manifest.find((b) => b.openingMatchMode === 'position');
  assert.ok(positional, 'at least one profile opts into position matching');
  const bookTokens = String(positional.openingsAsWhite[0].moves).replace(/\d+\.(\.\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);
  const bookGame = new Chess();
  for (const san of bookTokens.slice(0, 2)) assert.ok(bookGame.move(san), `${positional.id}: valid book prefix ${san}`);
  const bookFen = bookGame.fen();
  for (let call = 1; call <= 3; call++) {
    const t0 = performance.now();
    const r = chooseBotMoveTimed(new Chess(bookFen), positional, Chess, { deadlineAt: botNow() + 200 });
    const ms = performance.now() - t0;
    assert.equal(r.depth, 0, `${positional.id}: a book move is played (call ${call})`);
    assert.ok(ms < 350, `${positional.id}: position-matching book lookup stays on the cached path (call ${call}: ${ms.toFixed(0)} ms)`);
  }
  const shifted = bookFen.split(' '); shifted[4] = String(Number(shifted[4]) + 40);
  const rs = chooseBotMoveTimed(new Chess(shifted.join(' ')), positional, Chess, { deadlineAt: botNow() + 5000 });
  assert.equal(rs.depth, 0, `${positional.id}: impossible counters still find the book move through the scan`);
  console.log(`PASS: searchDepthCap parity — capped bot "${capped.id}" (cap ${capped.searchDepthCap}) stops at depth ${expectedDepth} in both the direct search and the worker path; uncapped bot "${uncapped.id}" still reaches depth ${uncappedExpected}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
