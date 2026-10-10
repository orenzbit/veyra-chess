import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=(p)=>fs.readFileSync(p,'utf8');
const main=read('src/main.ts');
const auth=read('netlify/functions/auth.mjs');
const schema=read('public/data/supabase-schema.sql');
for(const token of ['function WelcomePage','function AuthPage','function VerifyPage','function AccountPage','GlobalLanguageButton','/api/auth','acceptTerms','TERMS_VERSION','PRIVACY_VERSION']) assert.ok(main.includes(token),`main.ts missing ${token}`);
for(const token of ["action==='signup'","action==='login'","action==='resend'","action==='delete'","EMAIL_NOT_VERIFIED","email_confirmed_at","terms_version","privacy_version"] ) assert.ok(auth.includes(token),`auth.mjs missing ${token}`);
for(const token of ['user_profiles','user_consents','user_training_events','alter table public.user_profiles enable row level security']) assert.ok(schema.includes(token),`schema missing ${token}`);
for(const file of ['terms.html','privacy.html','cookies.html','refunds.html','accessibility.html']){
  const s=read(`public/legal/${file}`); assert.ok(s.includes('class="he"'),`${file}: Hebrew section missing`); assert.ok(s.includes('class="en"'),`${file}: English section missing`); assert.ok(s.includes('function toggle()'),`${file}: language toggle missing`);
}
const terms=read('public/legal/terms.html'); assert.ok(terms.includes('אינו עורך דין')&&terms.includes('not a lawyer'),'legal disclaimer missing');
console.log('PASS: account registration, email verification, consent, deletion, bilingual legal pages and language toggle are present.');
