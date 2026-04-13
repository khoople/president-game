import type { LobbyState, GetLobbyStateInterface, SaveLobbyStateInterface, BroadcastLobbyStateInterface } from './types';

export class LobbyHost {
  constructor(
    private getLobbyState: GetLobbyStateInterface,
    private saveLobbyState: SaveLobbyStateInterface,
    private broadcastLobbyState: BroadcastLobbyStateInterface,
  ) {}

  async startLobby(userName: string): Promise<{ lobbyId: string; lobbyUserId: string }> {
    const lobbyId = Array.from({ length: 6 }, () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    const lobbyUserId = crypto.randomUUID();

    // Create fresh state directly — don't use getLobbyState since the new lobbyId won't exist yet.
    const lobbyState: LobbyState = { lobbyId, users: [], messages: [], status: 'waiting' };
    lobbyState.users.push({ id: lobbyUserId, name: userName, joinedAt: Date.now(), isHost: true });
    await this.saveLobbyState(lobbyId, lobbyState);

    return { lobbyId, lobbyUserId };
  }

  async joinLobby(lobbyId: string, userName: string): Promise<{ lobbyUserId: string }> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) {
      throw new LobbyNotFoundError(`Lobby '${lobbyId}' not found.`);
    }

    const lobbyUserId = crypto.randomUUID();
    const isHost = lobbyState.users.length === 0;
    lobbyState.users.push({ id: lobbyUserId, name: userName, joinedAt: Date.now(), isHost });
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.broadcastLobbyState(lobbyId, lobbyState);

    return { lobbyUserId };
  }

  async exitLobby(lobbyId: string, lobbyUserId: string): Promise<LobbyState> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) throw new LobbyNotFoundError(`Lobby '${lobbyId}' not found.`);

    lobbyState.users = lobbyState.users.filter((u) => u.id !== lobbyUserId);
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.broadcastLobbyState(lobbyId, lobbyState);

    return lobbyState;
  }

  async sendMessage(lobbyId: string, lobbyUserId: string, userName: string, text: string): Promise<LobbyState> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) throw new LobbyNotFoundError(`Lobby '${lobbyId}' not found.`);

    lobbyState.messages.push({
      id: crypto.randomUUID(),
      lobbyUserId,
      userName,
      text,
      timestamp: Date.now(),
    });
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.broadcastLobbyState(lobbyId, lobbyState);

    return lobbyState;
  }

  async updateLobby(
    lobbyId: string,
    lobbyUserId: string,
    updates: { status?: LobbyState['status']; gameId?: string },
  ): Promise<LobbyState> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) throw new LobbyNotFoundError(`Lobby '${lobbyId}' not found.`);

    const requestingUser = lobbyState.users.find((u) => u.id === lobbyUserId);
    if (!requestingUser?.isHost) {
      throw new LobbyForbiddenError('Only the host can update the lobby.');
    }

    if (updates.status !== undefined) lobbyState.status = updates.status;
    if (updates.gameId !== undefined) lobbyState.gameId = updates.gameId;

    await this.saveLobbyState(lobbyId, lobbyState);
    await this.broadcastLobbyState(lobbyId, lobbyState);

    return lobbyState;
  }
}

export class LobbyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LobbyNotFoundError';
  }
}

export class LobbyForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LobbyForbiddenError';
  }
}
