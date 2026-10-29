// Server-only access to Convex. Never import this from a client component: the admin key must stay on the server.
import { ConvexHttpClient } from 'convex/browser';

export const convexUrl = () => process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || '';
export const adminKey = () => process.env.ADMIN_API_KEY || '';
export const convexConfigured = () => Boolean(convexUrl());

/** Admin is on only when Convex, the shared key, a session secret and a password (or hash) are all configured. */
export const adminConfigured = () =>
  convexConfigured() &&
  adminKey().length >= 24 &&
  (process.env.ADMIN_SESSION_SECRET ?? '').length >= 24 &&
  Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH);

export function convexClient() {
  return new ConvexHttpClient(convexUrl(), { skipConvexDeploymentUrlCheck: true, logger: false });
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
