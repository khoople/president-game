import { GameState, Opponent, Player, PlayerMessageClass, PlayerState } from './types';
import { ordinal } from './ordinals';

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
      isDisconnected: p.isDisconnected,
      winPosition: p.winPosition,
      isDrinking: p.isDrinking,
    }));

  const { playerMessage, playerMessageClass } = derivePlayerMessage(player, gameState);

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
    playerWinPosition: player.winPosition,
    gameStatus: gameState.status,
    isDrinking: player.isDrinking,
    drinkingReason: player.drinkingReason,
    gameMessage: gameState.gameMessage ?? '',
    playerMessage,
    playerMessageClass,
  };
}

function derivePlayerMessage(player: Player, gameState: GameState): { playerMessage: string; playerMessageClass: PlayerMessageClass } {
  if (gameState.status === 'GAME_OVER' && player.winPosition === null) {
    return { playerMessage: 'YOU ARE THE ASSHOLE!', playerMessageClass: 'danger' };
  }

  if (player.winPosition !== null) {
    return { playerMessage: `YOU FINISHED IN ${ordinal(player.winPosition)} PLACE!`, playerMessageClass: 'success' };
  }

  if (player.playerNumber === gameState.activePlayerNumber) {
    return { playerMessage: 'YOUR TURN!', playerMessageClass: 'notice' };
  }

  const activePlayer = gameState.players.find((p) => p.playerNumber === gameState.activePlayerNumber);
  return {
    playerMessage: `WAITING FOR ${(activePlayer?.playerName ?? '').toUpperCase()} TO PLAY`,
    playerMessageClass: 'notice',
  };
}
