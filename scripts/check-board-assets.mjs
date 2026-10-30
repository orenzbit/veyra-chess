import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { STANDARD_SPRITE_SHA256, unapprovedLicenses } from './check-mit-only.mjs';

const sprite = await readFile('public/vendor/cm-chessboard/pieces/standard.svg', 'utf8');
assert.equal(createHash('sha256').update(sprite).digest('hex'), STANDARD_SPRITE_SHA256);
for (const color of ['w', 'b']) {
  for (const piece of ['k', 'q', 'r', 'b', 'n', 'p']) {
    assert.ok(sprite.includes(`id="${color}${piece}"`), `Missing ${color}${piece} artwork`);
  }
}
assert.ok(!/<image\b|<script\b/i.test(sprite), 'Artwork must be self-contained SVG geometry');
for (const file of ['main.ts', 'blindfold-page.ts', 'legends-page.ts', 'puzzle-page.ts', 'puzzle/board-view.ts']) {
  const source = await readFile(`src/${file}`, 'utf8');
  assert.ok(source.includes('pieces/standard.svg'), `${file} must use the official set`);
  assert.ok(!source.includes('chess-art-prmi'), `${file} must not select the cat set`);
}
assert.deepEqual(unapprovedLicenses('## Code\nLicense: MIT'), []);
assert.deepEqual(unapprovedLicenses('## cm-chessboard standard piece artwork\nLicense: CC BY-SA 3.0'), []);
assert.equal(unapprovedLicenses('## Other artwork\nLicense: CC BY-SA 3.0').length, 1);
assert.equal(unapprovedLicenses('## cm-chessboard standard piece artwork\nLicense: CC BY-NC-SA 4.0').length, 1);
assert.equal(unapprovedLicenses('## cm-chessboard standard piece artwork\nLicense: CC BY-SA 3.0\n## Other code\nLicense: GPL-3.0').length, 1);
console.log('PASS: official artwork identity, 12 pieces, all board surfaces and narrowly scoped license exception.');
