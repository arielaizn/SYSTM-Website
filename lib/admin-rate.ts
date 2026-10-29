// Login throttling, in memory (one server instance). Five failures from one address lock that address for 15
// minutes; a global ceiling slows distributed guessing. Success clears the address. Add a shared store before
// running several instances.
type Entry = { fails: number[]; lockedUntil: number };

const WINDOW = 15 * 60_000;
const MAX_FAILS = 5;
const GLOBAL_WINDOW = 60 * 60_000;
const GLOBAL_MAX = 40;
const byIp = new Map<string, Entry>();
let globalFails: number[] = [];
let globalLockUntil = 0;

export function checkLogin(ip: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  if (now < globalLockUntil) return { allowed: false, retryAfterSec: Math.ceil((globalLockUntil - now) / 1000) };
  const e = byIp.get(ip);
  if (e && now < e.lockedUntil) return { allowed: false, retryAfterSec: Math.ceil((e.lockedUntil - now) / 1000) };
  return { allowed: true, retryAfterSec: 0 };
}

export function recordFailure(ip: string, now = Date.now()) {
  const e = byIp.get(ip) ?? { fails: [], lockedUntil: 0 };
  e.fails = e.fails.filter((t) => now - t < WINDOW);
  e.fails.push(now);
  if (e.fails.length >= MAX_FAILS) e.lockedUntil = now + WINDOW;
  byIp.set(ip, e);
  globalFails = globalFails.filter((t) => now - t < GLOBAL_WINDOW);
  globalFails.push(now);
  if (globalFails.length >= GLOBAL_MAX) globalLockUntil = now + 5 * 60_000;
  if (byIp.size > 2000) for (const [k, v] of byIp) if (now > v.lockedUntil && v.fails.every((t) => now - t > WINDOW)) byIp.delete(k);
}

export function recordSuccess(ip: string) {
  byIp.delete(ip);
}

export function resetRateLimitForTests() {
  byIp.clear();
  globalFails = [];
  globalLockUntil = 0;
}
