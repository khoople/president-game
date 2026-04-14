import { createGame } from './create-game';
import { applyPlay } from './play';
import { derivePlayerState } from './player-state';
import type {
  LobbyUser,
  SendPlayerStateInterface,
  GetGameStateInterface,
  SaveGameStateInterface,
  PlayResponseInterface,
  StartGameResponseInterface,
  JoinGameResponseInterface,
  PlayerState,
  Play,
} from './types';

export default class PresidentGameHost {
  constructor(
    private sendPlayerState: SendPlayerStateInterface,
    private getGameState: GetGameStateInterface,
    private saveGameState: SaveGameStateInterface
  ) {}

  async startGame(lobbyId: string, lobbyUsers: LobbyUser[]): Promise<StartGameResponseInterface> {
    const gameState = createGame(lobbyId, lobbyUsers);
    await this.saveGameState(gameState.id, gameState);
    return { gameId: gameState.id };
  }

  async joinGame(gameId: string, lobbyUserId: string): Promise<JoinGameResponseInterface> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    const playerId = gameState.players.find((p) => p.lobbyUserId === lobbyUserId)?.playerId ?? null;
    return { playerId };
  }

  async makePlay(play: Play): Promise<PlayResponseInterface> {
    const gameState = await this.getGameState(play.gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    const result = applyPlay(play, gameState);
    if (!result.isValid) return result;

    await this.saveGameState(play.gameId, gameState);

    for (const player of gameState.players) {
      const playerState = derivePlayerState(player.playerId, gameState);
      await this.sendPlayerState(player.playerId, playerState);
    }

    return result;
  }

  async setPlayerConnectionStatus(gameId: string, playerId: string, isConnected: boolean): Promise<void> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) return;

    const player = gameState.players.find((p) => p.playerId === playerId);
    if (!player) return;

    player.isDisconnected = !isConnected;
    await this.saveGameState(gameId, gameState);

    for (const p of gameState.players) {
      const playerState = derivePlayerState(p.playerId, gameState);
      await this.sendPlayerState(p.playerId, playerState);
    }
  }

  async getPlayerState(gameId: string, playerId: string): Promise<PlayerState> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }
    return derivePlayerState(playerId, gameState);
  }
}
