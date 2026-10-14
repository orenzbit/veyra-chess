import crypto from 'node:crypto';

function readHiddenPassword() {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    console.error('Run this command in a private interactive terminal so the password is not stored in shell history.');
    process.exit(1);
  }
  return new Promise((resolve) => {
    let password = '';
    process.stdout.write('Admin password (input hidden, minimum 16 characters): ');
    input.setRawMode(true);
    input.resume();
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\\u0003') {
          input.setRawMode(false);
          input.pause();
          input.off('data', onData);
          process.stdout.write('\\nCancelled.\\n');
          process.exit(130);
        }
        if (char === '\\r' || char === '\\n') {
          input.setRawMode(false);
          input.pause();
          input.off('data', onData);
          process.stdout.write('\\n');
          resolve(password);
          return;
        }
        if (char === '\\u007f' || char === '\\b') {
          password = password.slice(0, -1);
        } else if (char >= ' ' && char !== '\\u007f' && password.length < 1024) {
          password += char;
        }
      }
    };
    input.on('data', onData);
  });
}

const password = await readHiddenPassword();
if (password.length < 16) {
  console.error('Password rejected: use at least 16 characters. Nothing was generated.');
  process.exit(1);
}
const iterations = 310000;
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
console.log(`ADMIN_PASSWORD_HASH=${iterations}.${salt.toString('base64url')}.${hash.toString('base64url')}`);
console.log('ADMIN_EMAIL=orennzb@gmail.com');
console.log(`ADMIN_SESSION_SECRET=${crypto.randomBytes(32).toString('base64url')}`);
console.log('Copy these values directly into Netlify Environment Variables. Never commit them to GitHub.');
