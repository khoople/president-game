import { GameState, Opponent, PlayerState } from './types';

/**
 * Takes the game state and derives the player state for a given player. This is the
 * information that the player is allowed to see, hiding opponents hands and other unnecessary
 * information.
 */
export function derivePlayerState(playerId: string, gameState: GameState): PlayerState {
  const player = gameState.players.find((p) => p.playerId === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  const opponents: Opponent[] = gameState.players
    .filter((p) => p.playerId !== playerId)
    .map((p) => ({
      playerNumber: p.playerNumber,
      playerName: p.playerName,
      numCards: p.hand.length,
    }));

  return {
    playerId: player.playerId,
    playerNumber: player.playerNumber,
    playerName: player.playerName,
    playerHand: player.hand,
    activeHand: gameState.activeHand,
    discard: gameState.discard,
    timestamp: new Date().toISOString(),
    opponents,
    activePlayerNumber: gameState.activePlayerNumber,
  };
}
