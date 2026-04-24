import { createGame, createNextRound } from './create-game';
import { applyPlay, advanceTurn } from './play';
import { derivePlayerState } from './player-state';
import type {
  LobbyUser,
  SendPlayerState,
  GetGameState,
  SaveGameState,
  PlayResponse,
  StartGameResponse,
  JoinGameResponse,
  PlayerState,
  Play,
} from './types';

export default class PresidentGameHost {
  constructor(
    private sendPlayerState: SendPlayerState,
    private getGameState: GetGameState,
    private saveGameState: SaveGameState
  ) {}

  async startGame(gameId: string, lobbyId: string, lobbyUsers: LobbyUser[]): Promise<StartGameResponse> {
    const gameState = createGame(gameId, lobbyId, lobbyUsers);
    await this.saveGameState(gameState.id, gameState);
    return { gameId: gameState.id };
  }

  async startNextRound(gameId: string, playerId: string): Promise<StartGameResponse> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    const player = gameState.players.find((p) => p.playerId === playerId);
    if (!player || !player.isHost) {
      throw new Error('Only the host can start the next round');
    }

    const nextGameState = createNextRound(gameState);
    await this.saveGameState(nextGameState.id, nextGameState);

    for (const p of nextGameState.players) {
      const playerState = derivePlayerState(p.playerId, nextGameState);
      await this.sendPlayerState(p.playerId, playerState);
    }

    return { gameId: nextGameState.id };
  }

  async joinGame(gameId: string, lobbyUserId: string): Promise<JoinGameResponse> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    const playerId = gameState.players.find((p) => p.lobbyUserId === lobbyUserId)?.playerId ?? null;
    return { playerId };
  }

  async makePlay(play: Play): Promise<PlayResponse> {
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

  async exitGame(gameId: string, playerId: string): Promise<void> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) return;

    const player = gameState.players.find((p) => p.playerId === playerId);
    if (!player) return;

    const exitingNumber = player.playerNumber;
    const wasActive = gameState.activePlayerNumber === exitingNumber;

    // Remove the exiting player.
    gameState.players = gameState.players.filter((p) => p.playerId !== playerId);
    if (gameState.players.length === 0) {
      await this.saveGameState(gameId, gameState);
      return;
    }

    // Renumber remaining players 1..N preserving original relative order.
    const oldToNew = new Map<number, number>();
    gameState.players
      .sort((a, b) => a.playerNumber - b.playerNumber)
      .forEach((p, i) => {
        oldToNew.set(p.playerNumber, i + 1);
        p.playerNumber = i + 1;
      });

    // Update activeHandPlayedBy; if that player just left, clear the active hand.
    if (gameState.activeHandPlayedBy !== null) {
      const mapped = oldToNew.get(gameState.activeHandPlayedBy);
      if (mapped === undefined) {
        gameState.activeHand = [];
        gameState.activeHandPlayedBy = null;
      } else {
        gameState.activeHandPlayedBy = mapped;
      }
    }

    if (wasActive && gameState.status !== 'GAME_OVER') {
      // Determine the intended next player: the first remaining player whose original
      // number was greater than exitingNumber, or wrap to player 1 (new numbering).
      const countBefore = Array.from(oldToNew.keys()).filter((k) => k < exitingNumber).length;
      const hasAfter = Array.from(oldToNew.keys()).some((k) => k > exitingNumber);
      const intendedNext = hasAfter ? countBefore + 1 : 1;

      // Set activePlayerNumber to the predecessor of intendedNext so advanceTurn
      // lands on the right player (and skips any with no cards).
      const n = gameState.players.length;
      gameState.activePlayerNumber = ((intendedNext - 2 + n) % n) + 1;
      advanceTurn(gameState);
    } else {
      gameState.activePlayerNumber = oldToNew.get(gameState.activePlayerNumber) ?? 1;
    }

    await this.saveGameState(gameId, gameState);

    for (const p of gameState.players) {
      const playerState = derivePlayerState(p.playerId, gameState);
      await this.sendPlayerState(p.playerId, playerState);
    }
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
