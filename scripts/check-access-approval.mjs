import { readFile } from 'node:fs/promises';
const auth=await readFile('netlify/functions/auth.mjs','utf8');
const schema=await readFile('public/data/supabase-schema.sql','utf8');
const terms=await readFile('public/legal/terms.html','utf8');
const privacy=await readFile('public/legal/privacy.html','utf8');
const setup=await readFile('public/SETUP_FOR_BEGINNERS.md','utf8');
for(const [needle,label] of [
  ['request-access-code','access request endpoint'],
  ['verify-access-code','access verification endpoint'],
  ['ACCESS_CODE_TTL_MS=12*60*1000','12-minute TTL'],
  ['ACCESS_CODE_MAX_ATTEMPTS=5','attempt limit'],
  ['RESEND_API_KEY','email provider secret'],
  ['public.signup_access_codes','access-code table'],
]) if(!auth.includes(needle)&&!schema.includes(needle)) throw new Error(`Missing ${label}`);
if(!terms.includes('12 דקות') || !terms.includes('12 minutes')) throw new Error('Terms missing 12-minute access rule');
if(!privacy.includes('בקשת גישה') || !privacy.includes('access request')) throw new Error('Privacy missing access-request data');
if(!setup.includes('RESEND_API_KEY') || !setup.includes('קוד 6 הספרות')) throw new Error('Setup guide missing manual access flow');
console.log('PASS: manual approval access-code flow, 12-minute TTL, provider configuration, schema and bilingual legal documentation are present.');
