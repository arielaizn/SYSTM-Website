// The admin "session version" (bumped by "sign out everywhere"). MCP tokens carry the version they were issued under,
// so bumping it revokes every connected AI client at once. Cached for 5 seconds.
import { api } from '../../convex/_generated/api';
import { adminQuery } from '../admin-api';

let cached: { v: number; at: number } | null = null;

export async function currentSessionVersion(): Promise<number> {
  if (cached && Date.now() - cached.at < 5000) return cached.v;
  const v = await adminQuery(api.system.sessionVersion, {});
  cached = { v, at: Date.now() };
  return v;
}
