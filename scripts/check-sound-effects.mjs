import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/sound-effects.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const {
  classifyMoveSound,
  isAudioMuted,
  setAudioMuted,
  toggleAudioMuted,
  playSound,
  playMoveSound
} = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

console.log('Testing sound-effects module...');

// 1. Move classification tests
// Normal move: e2-e4
const normalMove = { san: 'e4', from: 'e2', to: 'e4' };
assert.equal(classifyMoveSound(normalMove), 'normal', 'Normal move should be classified as "normal"');

// Capture move: exd5
const captureMove = { san: 'exd5', from: 'e4', to: 'd5', captured: 'p' };
assert.equal(classifyMoveSound(captureMove), 'capture', 'Capture move should be classified as "capture"');

// Castling move: O-O
const kingCastle = { san: 'O-O', from: 'e1', to: 'g1', flags: 'k' };
assert.equal(classifyMoveSound(kingCastle), 'castle', 'King-side castling should be classified as "castle"');

// Queen-side castling: O-O-O
const queenCastle = { san: 'O-O-O', from: 'e1', to: 'c1', flags: 'q' };
assert.equal(classifyMoveSound(queenCastle), 'castle', 'Queen-side castling should be classified as "castle"');

// Check move (with + in SAN or game inCheck)
const checkMove = { san: 'Qh5+', from: 'd1', to: 'h5' };
assert.equal(classifyMoveSound(checkMove), 'check', 'Check with + in san should be classified as "check"');

const checkWithGame = { san: 'Nf7', from: 'g5', to: 'f7' };
const mockGameCheck = { inCheck: () => true, isCheckmate: () => false };
assert.equal(classifyMoveSound(checkWithGame, mockGameCheck), 'check', 'Game inCheck should be classified as "check"');

// Checkmate move (with # in SAN or game isCheckmate)
const mateMove = { san: 'Qxf7#', from: 'h5', to: 'f7', captured: 'p' };
assert.equal(classifyMoveSound(mateMove), 'checkmate', 'Checkmate with # should take precedence over capture');

const mockGameMate = { isCheckmate: () => true, inCheck: () => true };
assert.equal(classifyMoveSound(captureMove, mockGameMate), 'checkmate', 'Game isCheckmate should take precedence over capture');

// Priority test: check over capture
const captureCheck = { san: 'Bxf7+', from: 'c4', to: 'f7', captured: 'p' };
assert.equal(classifyMoveSound(captureCheck), 'check', 'Check should take precedence over capture');

// Priority test: check over castling
const castleCheck = { san: 'O-O-O+', from: 'e1', to: 'c1', flags: 'q' };
assert.equal(classifyMoveSound(castleCheck), 'check', 'Check should take precedence over castling');

// 2. Mute toggle tests
setAudioMuted(false);
assert.equal(isAudioMuted(), false, 'Audio should not be muted');
assert.equal(toggleAudioMuted(), true, 'Toggling should mute');
assert.equal(isAudioMuted(), true, 'Audio should be muted');
assert.equal(toggleAudioMuted(), false, 'Toggling again should unmute');
assert.equal(isAudioMuted(), false, 'Audio should be unmuted');

// 3. Fallback safety when window / AudioContext is missing (Node environment)
assert.doesNotThrow(() => {
  playSound('normal');
  playSound('capture');
  playSound('castle');
  playSound('check');
  playSound('checkmate');
  playSound('clock-tap');
  playSound('clock-flag');
  playMoveSound(normalMove);
}, 'Calling playSound in Node environment must not throw');

console.log('PASS: sound effects classification, priorities, mute toggle and safety checks.');
