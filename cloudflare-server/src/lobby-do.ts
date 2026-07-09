import { LobbyHost } from './president-host/lobby';
import type { LobbyState } from './president-host/types';
import { BaseDurableObject } from './abstract-do';

type LobbySessionAttachment = { id: string; lobbyId?: string; lobbyUserId?: string };

const STATE_KEY = 'state';

export class LobbyDurableObject extends BaseDurableObject<LobbySessionAttachment> {
  private lobbyState: LobbyState | null | undefined;
  private lobbyHost: LobbyHost;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.lobbyHost = new LobbyHost(
      this.getLobbyState.bind(this),
      this.saveLobbyState.bind(this),
      this.sendLobbyState.bind(this),
    );
  }

  private async getLobbyState(_lobbyId: string): Promise<LobbyState | null> {
    if (this.lobbyState !== undefined) return this.lobbyState;
    const stored = (await this.ctx.storage.get<LobbyState>(STATE_KEY)) ?? null;
    this.lobbyState = stored;
    return stored;
  }

  private async saveLobbyState(_lobbyId: string, lobbyState: LobbyState): Promise<void> {
    this.lobbyState = lobbyState;
    await this.ctx.storage.put(STATE_KEY, lobbyState);
  }

  private async sendLobbyState(_lobbyId: string, lobbyState: LobbyState): Promise<void> {
    const payload = JSON.stringify(lobbyState);
    for (const [ws] of this.sessions) {
      try {
        ws.send(payload);
      } catch (e) {
        console.error('Failed to broadcast lobby state, removing stale session:', e);
        this.sessions.delete(ws);
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

    if (url.pathname === '/lobby/kick' && request.method === 'POST') {
      return this.handleKick(request);
    }

    if (url.pathname === '/lobby/voice' && request.method === 'POST') {
      return this.handleVoice(request);
    }

    if (url.pathname === '/lobby/signal' && request.method === 'POST') {
      return this.handleSignal(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleStart(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const lobbyId = url.searchParams.get('lobbyId')!;
    const { userName } = await request.json<{ userName: string }>();
    const result = await this.lobbyHost.startLobby(lobbyId, userName);
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleJoin(request: Request): Promise<Response> {
    const { lobbyId, userName } = await request.json<{ lobbyId: string; userName: string }>();
    const result = await this.lobbyHost.joinLobby(lobbyId, userName);
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleExit(request: Request): Promise<Response> {
    const { lobbyId, lobbyUserId } = await request.json<{ lobbyId: string; lobbyUserId: string }>();
    const result = await this.lobbyHost.exitLobby(lobbyId, lobbyUserId);
    await this.resetAlarm();
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
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleUpdate(request: Request): Promise<Response> {
    const { lobbyId, lobbyUserId, status, gameId } = await request.json<{
      lobbyId: string;
      lobbyUserId: string;
      status?: LobbyState['status'];
      gameId?: string;
    }>();
    const result = await this.lobbyHost.updateLobby(lobbyId, lobbyUserId, { status, gameId });
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleKick(request: Request): Promise<Response> {
    const { lobbyId, lobbyUserId, targetUserId } = await request.json<{
      lobbyId: string;
      lobbyUserId: string;
      targetUserId: string;
    }>();
    const result = await this.lobbyHost.kickUser(lobbyId, lobbyUserId, targetUserId);
    if (!result.error && result.status === 'in-game' && result.gameId) {
      await this.kickFromGame(result.gameId, targetUserId);
    }
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleVoice(request: Request): Promise<Response> {
    const { lobbyId, lobbyUserId, inVoice } = await request.json<{
      lobbyId: string;
      lobbyUserId: string;
      inVoice: boolean;
    }>();
    const result = await this.lobbyHost.setVoiceStatus(lobbyId, lobbyUserId, inVoice);
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleSignal(request: Request): Promise<Response> {
    const { fromUserId, toUserId, signal } = await request.json<{
      lobbyId: string;
      fromUserId: string;
      toUserId: string;
      signal: unknown;
    }>();

    let delivered = false;
    for (const [ws, attachment] of this.sessions) {
      if (attachment.lobbyUserId !== toUserId) continue;
      try {
        ws.send(JSON.stringify({ type: 'rtc-signal', from: fromUserId, signal }));
        delivered = true;
      } catch (e) {
        console.error('Failed to relay signal, removing stale session:', e);
        this.sessions.delete(ws);
      }
    }

    await this.resetAlarm();
    return Response.json({ delivered });
  }

  private async kickFromGame(gameId: string, lobbyUserId: string): Promise<void> {
    const id = this.env.PRESIDENT_DO.idFromName(gameId);
    const stub = this.env.PRESIDENT_DO.get(id);
    await stub.fetch('https://internal/game/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, lobbyUserId }),
    });
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

    await this.resetAlarm();

    if (lobbyId && lobbyUserId) {
      await this.lobbyHost.setUserConnectionStatus(lobbyId, lobbyUserId, true);
      const lobbyState = await this.getLobbyState(lobbyId);
      server.send(JSON.stringify(lobbyState));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  protected override async onWebSocketDisconnected(attachment: LobbySessionAttachment): Promise<void> {
    if (attachment.lobbyId && attachment.lobbyUserId) {
      await this.lobbyHost.setUserConnectionStatus(attachment.lobbyId, attachment.lobbyUserId, false);
    }
  }
}
