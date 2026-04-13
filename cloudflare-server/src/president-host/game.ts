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
  GameState,
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

  async getPlayerState(gameId: string, playerId: string): Promise<PlayerState> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }
    return derivePlayerState(playerId, gameState);
  }
}
