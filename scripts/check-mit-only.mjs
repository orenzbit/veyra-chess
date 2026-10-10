import { readFile } from 'node:fs/promises';
const notices=await readFile('THIRD_PARTY_NOTICES.md','utf8');
const lines=notices.split(/\r?\n/).filter(line=>/License:/i.test(line));
const nonMit=lines.filter(line=>!/^.*License:\s*MIT\s*$/i.test(line.trim()));
if(nonMit.length){
  console.error('BLOCKED: non-MIT third-party license entries remain:');
  for(const line of nonMit) console.error(line);
  process.exit(1);
}
console.log('PASS: all documented third-party runtime licenses are MIT.');
