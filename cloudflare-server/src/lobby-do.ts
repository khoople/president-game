import { DurableObject } from 'cloudflare:workers';
import { LobbyHost, LobbyNotFoundError, LobbyForbiddenError } from './president-host/lobby';
import type { LobbyState } from './president-host/types';

type LobbySessionAttachment = { id: string; lobbyId?: string; lobbyUserId?: string };

export class LobbyDurableObject extends DurableObject<Env> {
  sessions: Map<WebSocket, LobbySessionAttachment>;
  private lobbyStateCache: Map<string, LobbyState> = new Map();
  private lobbyHost: LobbyHost;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment() as LobbySessionAttachment | null;
      if (attachment) {
        this.sessions.set(ws, attachment);
      }
    });

    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));

    this.lobbyHost = new LobbyHost(
      this.getLobbyState.bind(this),
      this.saveLobbyState.bind(this),
      this.sendLobbyState.bind(this),
    );
  }

  private async getLobbyState(lobbyId: string): Promise<LobbyState | null> {
    if (this.lobbyStateCache.has(lobbyId)) {
      return this.lobbyStateCache.get(lobbyId)!;
    }
    const stored = await this.ctx.storage.get<LobbyState>(`lobby:${lobbyId}`);
    if (stored) {
      this.lobbyStateCache.set(lobbyId, stored);
      return stored;
    }
    return null;
  }

  private async saveLobbyState(lobbyId: string, lobbyState: LobbyState): Promise<void> {
    this.lobbyStateCache.set(lobbyId, lobbyState);
    await this.ctx.storage.put(`lobby:${lobbyId}`, lobbyState);
  }

  private async sendLobbyState(lobbyId: string, lobbyState: LobbyState): Promise<void> {
    const payload = JSON.stringify(lobbyState);
    for (const [ws, attachment] of this.sessions) {
      if (attachment.lobbyId === lobbyId) {
        try {
          ws.send(payload);
        } catch (e) {
          console.error('Failed to broadcast lobby state, removing stale session:', e);
          this.sessions.delete(ws);
        }
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      if (url.pathname === '/lobby/lobby-state') {
        return this.handleLobbyStateWebSocket(request);
      }
      return new Response('Not found', { status: 404 });
    }

    if (url.pathname === '/lobby/join' && request.method === 'POST') {
      return this.handleJoin(request);
    }

    if (url.pathname === '/lobby/exit' && request.method === 'POST') {
      return this.handleExit(request);
    }

    if (url.pathname === '/lobby/start' && request.method === 'POST') {
      return this.handleStart(request);
    }

    if (url.pathname === '/lobby/message' && request.method === 'POST') {
      return this.handleMessage(request);
    }

    if (url.pathname === '/lobby/update' && request.method === 'POST') {
      return this.handleUpdate(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleStart(request: Request): Promise<Response> {
    const { userName } = await request.json<{ userName: string }>();
    const result = await this.lobbyHost.startLobby(userName);
    return Response.json(result);
  }

  private async handleJoin(request: Request): Promise<Response> {
    const { lobbyId, userName } = await request.json<{ lobbyId: string; userName: string }>();
    try {
      const result = await this.lobbyHost.joinLobby(lobbyId, userName);
      return Response.json(result);
    } catch (e) {
      if (e instanceof LobbyNotFoundError) {
        return new Response(JSON.stringify({ error: 'Lobby not found.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw e;
    }
  }

  private async handleExit(request: Request): Promise<Response> {
    const { lobbyId, lobbyUserId } = await request.json<{ lobbyId: string; lobbyUserId: string }>();
    const result = await this.lobbyHost.exitLobby(lobbyId, lobbyUserId);
    return Response.json(result);
  }

  private async handleMessage(request: Request): Promise<Response> {
    const { lobbyId, lobbyUserId, userName, text } = await request.json<{
      lobbyId: string;
      lobbyUserId: string;
      userName: string;
      text: string;
    }>();
    const result = await this.lobbyHost.sendMessage(lobbyId, lobbyUserId, userName, text);
    return Response.json(result);
  }

  private async handleUpdate(request: Request): Promise<Response> {
    const { lobbyId, lobbyUserId, status, gameId } = await request.json<{
      lobbyId: string;
      lobbyUserId: string;
      status?: LobbyState['status'];
      gameId?: string;
    }>();
    try {
      const result = await this.lobbyHost.updateLobby(lobbyId, lobbyUserId, { status, gameId });
      return Response.json(result);
    } catch (e) {
      if (e instanceof LobbyForbiddenError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw e;
    }
  }

  // WebSocket connection for a client to receive LobbyState updates.
  // The client must supply ?lobbyId=<id>&lobbyUserId=<id> in the URL query string.
  private async handleLobbyStateWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const lobbyId = url.searchParams.get('lobbyId') ?? undefined;
    const lobbyUserId = url.searchParams.get('lobbyUserId') ?? undefined;

    // Evict any existing session for this lobbyUserId so stale sockets don't
    // receive pushes after the client reconnects.
    if (lobbyUserId) {
      for (const [existingWs, attachment] of this.sessions) {
        if (attachment.lobbyUserId === lobbyUserId) {
          this.sessions.delete(existingWs);
          try { existingWs.close(1000, 'Replaced by new connection'); } catch (_) {}
        }
      }
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    const attachment: LobbySessionAttachment = { id: crypto.randomUUID(), lobbyId, lobbyUserId };
    server.serializeAttachment(attachment);
    this.sessions.set(server, attachment);

    if (lobbyId) {
      const lobbyState = await this.getLobbyState(lobbyId);
      server.send(JSON.stringify(lobbyState));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Lobby interactions happen via HTTP POST.
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    this.sessions.delete(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
    this.sessions.delete(ws);
    ws.close(1011, 'WebSocket error');
  }
}
