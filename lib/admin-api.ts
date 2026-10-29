// Typed server-side wrappers for the admin Convex functions. The shared admin key is added here and never reaches
// the browser. Only server components and server actions import this file.
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import { adminKey, convexClient, withTimeout } from './convex-server';

type WithoutKey<A> = A extends { key: string } ? Omit<A, 'key'> : A;

export function adminQuery<F extends FunctionReference<'query'>>(fn: F, args: WithoutKey<FunctionArgs<F>>): Promise<FunctionReturnType<F>> {
  return withTimeout(convexClient().query(fn, { key: adminKey(), ...(args as object) } as FunctionArgs<F>), 15000);
}

export function adminMutation<F extends FunctionReference<'mutation'>>(fn: F, args: WithoutKey<FunctionArgs<F>>): Promise<FunctionReturnType<F>> {
  return withTimeout(convexClient().mutation(fn, { key: adminKey(), ...(args as object) } as FunctionArgs<F>), 15000);
}
