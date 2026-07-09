import type {
  LobbyState,
  GetLobbyState,
  SaveLobbyState,
  SendLobbyState,
  StartLobbyResponse,
  JoinLobbyResponse,
  ExitLobbyResponse,
  SendMessageResponse,
  UpdateLobbyResponse,
  KickUserResponse,
  SetVoiceStatusResponse,
} from './types';

export class LobbyHost {
  constructor(
    private getLobbyState: GetLobbyState,
    private saveLobbyState: SaveLobbyState,
    private sendLobbyState: SendLobbyState,
  ) {}

  async startLobby(lobbyId: string, userName: string): Promise<StartLobbyResponse> {
    const lobbyUserId = crypto.randomUUID();

    // Create fresh state directly — don't use getLobbyState since the new lobbyId won't exist yet.
    const lobbyState: LobbyState = { lobbyId, users: [], messages: [], status: 'waiting' };
    lobbyState.users.push({ id: lobbyUserId, name: userName, joinedAt: Date.now(), isHost: true, isDisconnected: true, inVoice: false });
    await this.saveLobbyState(lobbyId, lobbyState);

    return { lobbyId, lobbyUserId };
  }

  async joinLobby(lobbyId: string, userName: string): Promise<JoinLobbyResponse> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState || lobbyState.status === 'closed') {
      return { error: `Lobby '${lobbyId}' not found.` };
    } else if (lobbyState.status === 'in-game') {
      return { error: 'Game is already in progress.' };
    }

    const lobbyUserId = crypto.randomUUID();
    const isHost = lobbyState.users.length === 0;
    lobbyState.users.push({ id: lobbyUserId, name: userName, joinedAt: Date.now(), isHost, isDisconnected: true, inVoice: false });
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.sendLobbyState(lobbyId, lobbyState);

    return { lobbyUserId };
  }

  async exitLobby(lobbyId: string, lobbyUserId: string): Promise<ExitLobbyResponse> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) return { error: `Lobby '${lobbyId}' not found.` };

    lobbyState.users = lobbyState.users.filter((u) => u.id !== lobbyUserId);
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.sendLobbyState(lobbyId, lobbyState);

    return lobbyState;
  }

  async kickUser(lobbyId: string, lobbyUserId: string, targetUserId: string): Promise<KickUserResponse> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) return { error: `Lobby '${lobbyId}' not found.` };

    const requestingUser = lobbyState.users.find((u) => u.id === lobbyUserId);
    if (!requestingUser?.isHost) {
      return { error: 'Only the host can kick a player.' };
    }

    const targetUser = lobbyState.users.find((u) => u.id === targetUserId);
    if (!targetUser) return { error: 'Player not found in lobby.' };
    if (targetUser.isHost) return { error: 'The host cannot be kicked.' };

    lobbyState.users = lobbyState.users.filter((u) => u.id !== targetUserId);
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.sendLobbyState(lobbyId, lobbyState);

    return lobbyState;
  }

  async sendMessage(lobbyId: string, lobbyUserId: string, userName: string, text: string): Promise<SendMessageResponse> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) return { error: `Lobby '${lobbyId}' not found.` };

    lobbyState.messages.push({
      id: crypto.randomUUID(),
      lobbyUserId,
      userName,
      text,
      timestamp: Date.now(),
    });
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.sendLobbyState(lobbyId, lobbyState);

    return lobbyState;
  }

  async setUserConnectionStatus(lobbyId: string, lobbyUserId: string, isConnected: boolean): Promise<void> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) return;

    const user = lobbyState.users.find((u) => u.id === lobbyUserId);
    if (!user) return;

    user.isDisconnected = !isConnected;
    if (!isConnected) user.inVoice = false;
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.sendLobbyState(lobbyId, lobbyState);
  }

  async setVoiceStatus(lobbyId: string, lobbyUserId: string, inVoice: boolean): Promise<SetVoiceStatusResponse> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) return { error: `Lobby '${lobbyId}' not found.` };

    const user = lobbyState.users.find((u) => u.id === lobbyUserId);
    if (!user) return { error: 'Player not found in lobby.' };

    user.inVoice = inVoice;
    await this.saveLobbyState(lobbyId, lobbyState);
    await this.sendLobbyState(lobbyId, lobbyState);

    return lobbyState;
  }

  async updateLobby(
    lobbyId: string,
    lobbyUserId: string,
    updates: { status?: LobbyState['status']; gameId?: string },
  ): Promise<UpdateLobbyResponse> {
    const lobbyState = await this.getLobbyState(lobbyId);
    if (!lobbyState) return { error: `Lobby '${lobbyId}' not found.` };

    const requestingUser = lobbyState.users.find((u) => u.id === lobbyUserId);
    if (!requestingUser?.isHost) {
      return { error: 'Only the host can update the lobby.' };
    }

    if (updates.status !== undefined) lobbyState.status = updates.status;
    if (updates.status === 'waiting') lobbyState.gameId = undefined;
    if (updates.gameId !== undefined) lobbyState.gameId = updates.gameId;

    await this.saveLobbyState(lobbyId, lobbyState);
    await this.sendLobbyState(lobbyId, lobbyState);

    return lobbyState;
  }
}
