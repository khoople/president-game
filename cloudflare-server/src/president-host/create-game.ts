import { createDeck, fisherYatesShuffle } from './card';
import { GameState, LobbyUser } from './types';

export function createGame(lobbyId: string, lobbyUsers: LobbyUser[]): GameState {
  const gameState: GameState = {
    id: crypto.randomUUID(),
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
    });
  }

  const deck = fisherYatesShuffle(createDeck());
  deck.forEach((card, i) => {
    gameState.players[i % gameState.players.length].hand.push(card);
  });

  return gameState;
}
