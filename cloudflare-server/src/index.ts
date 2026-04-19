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

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function readId(request: Request, field: 'lobbyId' | 'gameId'): Promise<string | null> {
  try {
    const body = await request.clone().json<Record<string, unknown>>();
    const value = body[field];
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function forwardWithQuery(request: Request, key: string, value: string): Request {
  const url = new URL(request.url);
  url.searchParams.set(key, value);
  return new Request(url.toString(), request);
}

async function routeLobby(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const isWebSocket = request.headers.get('Upgrade') === 'websocket';

  let lobbyId: string | null;
  let forwarded = request;

  if (url.pathname === '/lobby/start' && request.method === 'POST') {
    lobbyId = generateLobbyCode();
    forwarded = forwardWithQuery(request, 'lobbyId', lobbyId);
  } else if (isWebSocket) {
    lobbyId = url.searchParams.get('lobbyId');
  } else {
    lobbyId = await readId(request, 'lobbyId');
  }

  if (!lobbyId) return new Response('Missing lobbyId', { status: 400 });

  const id = env.LOBBY_DO.idFromName(lobbyId);
  const stub = env.LOBBY_DO.get(id);
  return stub.fetch(forwarded);
}

async function routeGame(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const isWebSocket = request.headers.get('Upgrade') === 'websocket';

  let gameId: string | null;
  let forwarded = request;

  if (url.pathname === '/game/start' && request.method === 'POST') {
    gameId = crypto.randomUUID();
    forwarded = forwardWithQuery(request, 'gameId', gameId);
  } else if (isWebSocket) {
    gameId = url.searchParams.get('gameId');
  } else {
    gameId = await readId(request, 'gameId');
  }

  if (!gameId) return new Response('Missing gameId', { status: 400 });

  const id = env.PRESIDENT_DO.idFromName(gameId);
  const stub = env.PRESIDENT_DO.get(id);
  return stub.fetch(forwarded);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const origin = request.headers.get('Origin') ?? '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigin) });
    }

    const isWebSocket = request.headers.get('Upgrade') === 'websocket';

    if (url.pathname.startsWith('/lobby/')) {
      const response = await routeLobby(request, env);
      return isWebSocket ? response : withCors(response, origin, allowedOrigin);
    }

    if (url.pathname.startsWith('/game/')) {
      const response = await routeGame(request, env);
      return isWebSocket ? response : withCors(response, origin, allowedOrigin);
    }

    if (url.pathname === '/') {
      return withCors(new Response('PresidentCloudflareServer is running.', {
        headers: { 'Content-Type': 'text/plain' },
      }), origin, allowedOrigin);
    }

    return withCors(new Response('Not found', { status: 404 }), origin, allowedOrigin);
  },
} satisfies ExportedHandler<Env>;
