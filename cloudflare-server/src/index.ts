import { PresidentGameStateDurableObject } from './president-do';
import { LobbyDurableObject } from './lobby-do';

export { PresidentGameStateDurableObject, LobbyDurableObject };

function corsHeaders(origin: string, allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function withCors(response: Response, origin: string, allowedOrigin: string): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin, allowedOrigin))) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const origin = request.headers.get('Origin') ?? '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigin) });
    }

    // Route WebSocket upgrade requests to the appropriate Durable Object (no CORS headers needed for WS)
    if (request.headers.get('Upgrade') === 'websocket') {
      if (url.pathname.startsWith('/lobby/')) {
        const id = env.LOBBY_DO.idFromName('global');
        const stub = env.LOBBY_DO.get(id);
        return stub.fetch(request);
      }
      const id = env.PRESIDENT_DO.idFromName('global');
      const stub = env.PRESIDENT_DO.get(id);
      return stub.fetch(request);
    }

    // Route /lobby/* paths to the Lobby Durable Object
    if (url.pathname.startsWith('/lobby/')) {
      const id = env.LOBBY_DO.idFromName('global');
      const stub = env.LOBBY_DO.get(id);
      const response = await stub.fetch(request);
      return withCors(response, origin, allowedOrigin);
    }

    // Route /game/* and /do/* paths to the Game Durable Object
    if (url.pathname.startsWith('/game/')) {
      const id = env.PRESIDENT_DO.idFromName('global');
      const stub = env.PRESIDENT_DO.get(id);
      const response = await stub.fetch(request);
      return withCors(response, origin, allowedOrigin);
    }

    // Regular HTTP request handling
    if (url.pathname === '/') {
      return withCors(new Response('PresidentCloudflareServer is running.', {
        headers: { 'Content-Type': 'text/plain' },
      }), origin, allowedOrigin);
    }

    return withCors(new Response('Not found', { status: 404 }), origin, allowedOrigin);
  },
} satisfies ExportedHandler<Env>;
