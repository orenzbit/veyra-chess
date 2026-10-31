import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const STANDARD_SPRITE_SHA256 = 'b85bba95342a9483420999cedeb1c503e6db16cdd7a0da1f3a228549a13134c5';
export function unapprovedLicenses(notices) {
  const rejected = [];
  let section = '';
  for (const line of notices.split(/\r?\n/)) {
    if (line.startsWith('## ')) section = line.slice(3).trim();
    if (!/License:/i.test(line)) continue;
    if (/^.*License:\s*MIT\s*$/i.test(line.trim())) continue;
    if (section === 'cm-chessboard standard piece artwork' && line.trim() === 'License: CC BY-SA 3.0') continue;
    rejected.push(line);
  }
  return rejected;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const notices = await readFile('THIRD_PARTY_NOTICES.md', 'utf8');
  const rejected = unapprovedLicenses(notices);
  const sprite = await readFile('public/vendor/cm-chessboard/pieces/standard.svg');
  if (createHash('sha256').update(sprite).digest('hex') !== STANDARD_SPRITE_SHA256) {
    rejected.push('The approved standard artwork must match the pinned upstream SVG.');
  }
  if (rejected.length) {
    console.error('BLOCKED: unapproved third-party licenses or artwork:');
    for (const line of rejected) console.error(line);
    process.exitCode = 1;
  } else {
    console.log('PASS: documented runtime licenses are MIT, except the approved, hash-verified CC BY-SA 3.0 standard artwork.');
  }
}
