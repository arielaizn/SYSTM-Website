import { CORS, json, origin, protectedResourceMetadata } from '../../../../../lib/mcp/oauth';

export const GET = (request: Request) => json(200, protectedResourceMetadata(origin(request)), { 'cache-control': 'public, max-age=300' });
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
