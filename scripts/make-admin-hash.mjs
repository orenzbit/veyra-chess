import crypto from 'node:crypto';
const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/make-admin-hash.mjs "PASSWORD"');
  process.exit(1);
}
const iterations = 310000;
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
console.log(`ADMIN_PASSWORD_HASH=${iterations}.${salt.toString('base64url')}.${hash.toString('base64url')}`);
console.log(`ADMIN_EMAIL=orennzb@gmail.com`);
console.log(`ADMIN_SESSION_SECRET=${crypto.randomBytes(32).toString('base64url')}`);
