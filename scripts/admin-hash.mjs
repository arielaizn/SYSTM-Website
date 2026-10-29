// Prints an ADMIN_PASSWORD_HASH for .env / your hosting provider:  npm run admin:hash -- "your password"
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Usage: npm run admin:hash -- "a password of at least 8 characters"');
  process.exit(1);
}
if (password.length < 12 || /^\d+$/.test(password)) {
  console.error('Warning: short or digits-only passwords are weak if the hash ever leaks. 14+ characters with letters is much safer.\n');
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
console.log(`ADMIN_PASSWORD_HASH=scrypt$16384$${salt.toString('base64url')}$${hash.toString('base64url')}`);
console.log('\nQuote the value if your shell or .env parser treats $ specially.');
