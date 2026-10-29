// Password check for the single admin. ADMIN_PASSWORD_HASH (scrypt) is preferred; plain ADMIN_PASSWORD works for
// local development. Comparisons are constant-time. Generate a hash with: npm run admin:hash
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384;

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

const sha = (s: string) => createHash('sha256').update(s).digest();

export function verifyPassword(input: string, env: { hash?: string; plain?: string } = { hash: process.env.ADMIN_PASSWORD_HASH, plain: process.env.ADMIN_PASSWORD }) {
  if (input.length === 0 || input.length > 200) return false;
  if (env.hash) {
    const [scheme, n, salt, hash] = env.hash.split('$');
    if (scheme !== 'scrypt' || !n || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64url');
    const actual = scryptSync(input, Buffer.from(salt, 'base64url'), expected.length, { N: Number(n), r: 8, p: 1 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  if (env.plain) return timingSafeEqual(sha(input), sha(env.plain));
  return false;
}
