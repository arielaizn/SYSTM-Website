export function cleanError(e: unknown): string;
export function createApi(client: unknown, key: string): { query: (path: string, args?: object) => Promise<any>; mutation: (path: string, args?: object) => Promise<any> };
export function createHandler(def: unknown, ctxFactory: () => unknown): (args: any) => Promise<{ isError?: boolean; content: { type: 'text'; text: string }[] }>;
