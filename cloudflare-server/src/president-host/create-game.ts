import { createDeck, fisherYatesShuffle } from './card';
import { GameState, LobbyUser } from './types';

export function createGame(gameId: string, lobbyId: string, lobbyUsers: LobbyUser[]): GameState {
  const gameState: GameState = {
    id: gameId,
    lobbyId,
    players: [],
    discard: [],
    activeHand: [],
    activePlayerNumber: 1,
    activeHandPlayedBy: null,
    status: 'PLAYING',
  };

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

  const deck = fisherYatesShuffle(createDeck());
  deck.forEach((card, i) => {
    gameState.players[i % gameState.players.length].hand.push(card);
  });

  return gameState;
}
