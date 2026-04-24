import { createDeck, fisherYatesShuffle } from './card';
import { GameState, LobbyUser, Player } from './types';

function createBaseGameState(gameId: string, lobbyId: string): GameState {
  return {
    id: gameId,
    lobbyId,
    players: [],
    discard: [],
    activeHand: [],
    activePlayerNumber: 1,
    activeHandPlayedBy: null,
    status: 'PLAYING',
  };
}

function dealCards(players: Player[]): void {
  const deck = fisherYatesShuffle(createDeck());
  deck.forEach((card, i) => {
    players[i % players.length].hand.push(card);
  });
}

export function createGame(gameId: string, lobbyId: string, lobbyUsers: LobbyUser[]): GameState {
  const gameState = createBaseGameState(gameId, lobbyId);

  for (let i = 0; i < lobbyUsers.length; i++) {
    const user = lobbyUsers[i];
    gameState.players.push({
      playerId: crypto.randomUUID(),
      lobbyUserId: user.id,
      playerNumber: i + 1,
      playerName: user.name,
      isHost: user.isHost,
      hasJoined: false,
      isDisconnected: true,
      hand: [],
      winPosition: null,
      isDrinking: false,
      drinkingReason: null,
    });
  }

  dealCards(gameState.players);

  return gameState;
}

export function createNextRound(gameState: GameState): GameState {
  const nextGameState = createBaseGameState(gameState.id, gameState.lobbyId);

  const orderedPlayers = [...gameState.players].sort((a, b) => {
    const aPos = a.winPosition ?? Number.POSITIVE_INFINITY;
    const bPos = b.winPosition ?? Number.POSITIVE_INFINITY;
    return aPos - bPos;
  });

  for (let i = 0; i < orderedPlayers.length; i++) {
    const player = orderedPlayers[i];
    nextGameState.players.push({
      playerId: player.playerId,
      lobbyUserId: player.lobbyUserId,
      playerNumber: i + 1,
      playerName: player.playerName,
      isHost: player.isHost,
      hasJoined: false,
      isDisconnected: player.isDisconnected,
      hand: [],
      winPosition: null,
      isDrinking: false,
      drinkingReason: null,
    });
  }

  dealCards(nextGameState.players);

  return nextGameState;
}
