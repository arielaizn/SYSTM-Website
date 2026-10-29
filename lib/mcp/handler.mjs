// Runs one tool call for the hosted MCP server: read-only gate, confirmation gate for deletes, in-process publish and
// an audit line. Same behaviour as createHandler in systm-admin-plugin/src/server.mjs, minus the local config checks.
import { anyApi } from 'convex/server';

const text = (data) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
const fail = (msg) => ({ isError: true, content: [{ type: 'text', text: msg }] });

/** Convex wraps server errors in a stack. Keep only the sentence the function threw. */
export function cleanError(e) {
  const raw = e instanceof Error ? e.message : String(e);
  const thrown = raw.match(/Uncaught Error: ([^\n]+)/)?.[1] ?? raw.split('\n')[0];
  const line = thrown.replace(/\s+at .*$/, '').trim().slice(0, 300);
  if (line === 'unauthorized') return 'השרת דחה את מפתח הניהול. בדקו את ADMIN_API_KEY באתר ובפריסת Convex.';
  if (line === 'timeout') return 'השרת לא ענה בזמן. נסו שוב.';
  if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(line)) return 'אי אפשר להגיע ל־Convex.';
  if (/Could not find public function/i.test(raw)) return 'הפונקציה הזאת עוד לא נפרסה ב־Convex של האתר. צריך להריץ npx convex deploy.';
  if (/extra field/i.test(raw)) return 'ה־Convex של האתר עוד לא עודכן לגרסה החדשה (שדה לא מוכר). צריך להריץ npx convex deploy.';
  return line || 'הפעולה נכשלה';
}

const ref = (path) => path.split('.').reduce((o, k) => o[k], anyApi);
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** `client` is a ConvexHttpClient; the admin key is added here and never appears in a tool result. */
export function createApi(client, key) {
  return {
    query: (path, args = {}) => withTimeout(client.query(ref(path), { key, ...args }), 20000),
    mutation: (path, args = {}) => withTimeout(client.mutation(ref(path), { key, ...args }), 20000),
  };
}

export function createHandler(def, ctxFactory) {
  return async (args) => {
    const ctx = ctxFactory();
    try {
      if (def.kind === 'read' || def.kind === 'local') return text(await def.run(args, ctx));

      if (ctx.cfg.readonly) return fail('מצב קריאה בלבד פעיל (SYSTM_READONLY). הפעולה לא בוצעה.');

      if (def.kind === 'destructive' && args.confirm !== true) {
        const what = await def.preview(args, ctx);
        return text(`לא נמחק דבר. הפעולה תמחק: ${what}. אחרי שהמשתמש אישר במפורש, קראו שוב עם confirm: true.`);
      }

      const data = await def.run(args, ctx);
      if (!def.noLog) {
        const target = def.target ? def.target(args) : '';
        await ctx.api.mutation('system.logEvent', { action: 'agent', summary: `דרך MCP מרוחק: ${def.name}${target ? ` (${target})` : ''}`.slice(0, 200) }).catch(() => {});
      }
      if (def.publish) {
        const pub = await ctx.publish();
        return text({ ...data, live: pub.done ? 'האתר עודכן עכשיו' : pub.reason });
      }
      return text(data);
    } catch (e) {
      return fail(cleanError(e));
    }
  };
}
