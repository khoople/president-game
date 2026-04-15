import PresidentGameHost from './president-host/game';
import type { GameState, LobbyUser, Play, PlayerState } from './president-host/types';
import { BaseDurableObject } from './abstract-do';

type SessionAttachment = { id: string; gameId?: string; playerId?: string };

export class PresidentGameStateDurableObject extends BaseDurableObject<SessionAttachment> {
  gameHost: PresidentGameHost;
  private gameStateCache: Map<string, GameState> = new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.gameHost = new PresidentGameHost(
      this.sendPlayerState.bind(this),
      this.getGameState.bind(this),
      this.saveGameState.bind(this)
    );
  }

  private async sendPlayerState(playerId: string, state: PlayerState): Promise<void> {
    for (const [ws, attachment] of this.sessions) {
      if (attachment.playerId === playerId) {
        try {
          ws.send(JSON.stringify(state));
        } catch (e) {
          console.error('Failed to send player state, removing stale session:', e);
          this.sessions.delete(ws);
        }
        return;
      }
    }
  }

  private async getGameState(gameId: string): Promise<GameState | null> {
    if (this.gameStateCache.has(gameId)) {
      return this.gameStateCache.get(gameId)!;
    }
    const gameState = (await this.ctx.storage.get<GameState>(`game:${gameId}`)) ?? null;
    if (gameState) {
      this.gameStateCache.set(gameId, gameState);
    }
    return gameState;
  }

  private async saveGameState(gameId: string, gameState: GameState): Promise<void> {
    this.gameStateCache.set(gameId, gameState);
    await this.ctx.storage.put(`game:${gameId}`, gameState);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      if (url.pathname === '/game/player-state') {
        return this.handlePlayerStateWebSocket(request);
      }
      return new Response('Not found', { status: 404 });
    }

    if (url.pathname === '/game/start' && request.method === 'POST') {
      return this.handleStartGame(request);
    }

    if (url.pathname === '/game/join' && request.method === 'POST') {
      return this.handleJoinGame(request);
    }

    if (url.pathname === '/game/play' && request.method === 'POST') {
      return this.handleMakePlay(request);
    }

    if (url.pathname === '/game/exit' && request.method === 'POST') {
      return this.handleExitGame(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleStartGame(request: Request): Promise<Response> {
    const { lobbyId, lobbyUsers } = await request.json<{ lobbyId: string; lobbyUsers: LobbyUser[] }>();
    const result = await this.gameHost.startGame(lobbyId, lobbyUsers);
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleJoinGame(request: Request): Promise<Response> {
    const { gameId, lobbyUserId } = await request.json<{ gameId: string; lobbyUserId: string }>();
    const result = await this.gameHost.joinGame(gameId, lobbyUserId);
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleMakePlay(request: Request): Promise<Response> {
    const play = await request.json<Play>();
    const result = await this.gameHost.makePlay(play);
    await this.resetAlarm();
    return Response.json(result);
  }

  private async handleExitGame(request: Request): Promise<Response> {
    const { gameId, playerId } = await request.json<{ gameId: string; playerId: string }>();
    await this.gameHost.exitGame(gameId, playerId);
    await this.resetAlarm();
    return Response.json({ success: true });
  }

  // WebSocket connection for a player to receive PlayerState updates.
  // The client must supply ?gameId=<id>&playerId=<id> in the URL query string.
  private async handlePlayerStateWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const gameId = url.searchParams.get('gameId') ?? undefined;
    const playerId = url.searchParams.get('playerId') ?? undefined;

    // Evict any existing session for this playerId so stale sockets don't
    // receive pushes after the client reconnects.
    if (playerId) {
      for (const [existingWs, attachment] of this.sessions) {
        if (attachment.playerId === playerId) {
          this.sessions.delete(existingWs);
          try { existingWs.close(1000, 'Replaced by new connection'); } catch (_) {}
        }
      }
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    const attachment: SessionAttachment = { id: crypto.randomUUID(), gameId, playerId };
    server.serializeAttachment(attachment);
    this.sessions.set(server, attachment);

    await this.resetAlarm();

    if (gameId && playerId) {
      await this.gameHost.setPlayerConnectionStatus(gameId, playerId, true);
      const playerState = await this.gameHost.getPlayerState(gameId, playerId);
      server.send(JSON.stringify(playerState));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  protected override async onWebSocketDisconnected(attachment: SessionAttachment): Promise<void> {
    if (attachment.gameId && attachment.playerId) {
      await this.gameHost.setPlayerConnectionStatus(attachment.gameId, attachment.playerId, false);
    }
  }
}
