import { authorizationServerMetadata, CORS, json, origin } from '../../../lib/mcp/oauth';

export const GET = (request: Request) => json(200, authorizationServerMetadata(origin(request)), { 'cache-control': 'public, max-age=300' });
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
