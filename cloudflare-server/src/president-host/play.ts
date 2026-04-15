import { GameState, Play, PlayResponseInterface, Player } from './types';
import { rankOf, rankIndex } from './card';

/**
 * Make a play. Determines whether play is valid and, if so, applies it to the game state.
 */
export function applyPlay(play: Play, gameState: GameState): PlayResponseInterface {
  const { chosenHand, playerId } = play;

  const player = gameState.players.find((p) => p.playerId === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  if (player.playerNumber !== gameState.activePlayerNumber) {
    return { isValid: false, invalidCode: 'NOT_YOUR_TURN', invalidMessageShort: 'Not your turn', invalidMessageLong: 'It is not your turn to play.' };
  }

  // Player passes, goes to next player. If all players pass back to the player who played the active hand,
  // the active hand is cleared and original player plays another hand.
  if (play.action === 'PASS') {
    advanceTurn(gameState);
    return { isValid: true };
  }

  // All chosen cards must be the same rank
  if (chosenHand.length > 1) {
    const firstRank = rankOf(chosenHand[0]);
    if (!chosenHand.every((card) => rankOf(card) === firstRank)) {
      return { isValid: false, invalidCode: 'MIXED_RANKS', invalidMessageShort: 'Mixed ranks', invalidMessageLong: 'You can only play multiple cards if they are all the same rank.' };
    }
  }

  const chosenRank = rankOf(chosenHand[0]);
  const activeIsEmpty = gameState.activeHand.length === 0;
  const activeRank = !activeIsEmpty ? rankOf(gameState.activeHand[0]) : null;
  const activeIsFour = activeRank === '4';

  // 2s are wild and clear the deck. The same player takes another turn.
  if (chosenRank === '2') {
    removeFromHand(player.hand, chosenHand);
    gameState.discard = [chosenHand];
    gameState.activeHand = [];
    gameState.activeHandPlayedBy = null;
    assignWinPosition(player, gameState);
    checkGameOver(gameState);
    // If the player ran out of cards, they can't take another turn — skip to the next player.
    if (player.hand.length === 0) {
      advanceTurn(gameState);
    }
    return { isValid: true };
  }

  // 4's are wild but do not clear the deck, previous hand still active.
  const chosenIsFour = chosenRank === '4';

  // When the active hand is a 4, the hand to beat is the last non-4 hand in discard
  // 4s are always unshifted to the front of discard, so non-4 hands stay at the back.
  const handToBeat = activeIsFour && gameState.discard.length > 0
    ? gameState.discard[gameState.discard.length - 1]
    : gameState.activeHand;

  if (!chosenIsFour && !activeIsEmpty) {
    if (chosenHand.length < handToBeat.length) {
      return { isValid: false, invalidCode: 'TOO_FEW_CARDS', invalidMessageShort: 'Too few cards', invalidMessageLong: `You must play at least ${handToBeat.length} card(s) to match the active hand.` };
    }
    if (chosenHand.length === handToBeat.length) {
      if (rankIndex(chosenHand[0]) < rankIndex(handToBeat[0])) {
        return { isValid: false, invalidCode: 'RANK_TOO_LOW', invalidMessageShort: 'Rank too low', invalidMessageLong: `You must play a rank equal to or higher than ${rankOf(handToBeat[0])}.` };
      }
    }
  }

  // If active hand is rank 4, it goes to the beginning of discard so the hand to beat is still visible.
  if (!activeIsEmpty) {
    if (activeIsFour) {
      gameState.discard.unshift(gameState.activeHand);
    } else {
      gameState.discard.push(gameState.activeHand);
    }
  }

  advanceTurn(gameState);

  // If the same rank is played on top of an existing hand, the next player is skipped.
  if (!activeIsEmpty && rankIndex(chosenHand[0]) === rankIndex(handToBeat[0])) {
    advanceTurn(gameState);
  }

  gameState.activeHand = chosenHand;
  gameState.activeHandPlayedBy = player.playerNumber;
  removeFromHand(player.hand, chosenHand);
  assignWinPosition(player, gameState);
  checkGameOver(gameState);

  return { isValid: true };
}

function advanceTurn(gameState: GameState): void {
  const numPlayers = gameState.players.length;
  let next = (gameState.activePlayerNumber % numPlayers) + 1;
  const start = next;

  // Skip players who have already finished (no cards remaining).
  // Track whether we skip over the player who last played the active hand.
  let skippedPlayedBy = false;
  while (gameState.players.find((p) => p.playerNumber === next)?.hand.length === 0) {
    if (next === gameState.activeHandPlayedBy) {
      skippedPlayedBy = true;
    }
    next = (next % numPlayers) + 1;
    if (next === start) break; // all remaining players are finished
  }

  gameState.activePlayerNumber = next;

  // If the turn has returned to (or skipped past) the player who last played,
  // everyone still active has passed — clear the active hand.
  if (gameState.activeHandPlayedBy !== null &&
      (gameState.activePlayerNumber === gameState.activeHandPlayedBy || skippedPlayedBy)) {
    gameState.discard.push(gameState.activeHand);
    gameState.activeHand = [];
    gameState.activeHandPlayedBy = null;
  }
}

function removeFromHand(hand: string[], cards: string[]): void {
  for (const card of cards) {
    const index = hand.indexOf(card);
    if (index !== -1) hand.splice(index, 1);
  }
}

function assignWinPosition(player: Player, gameState: GameState): void {
  if (player.hand.length === 0 && player.winPosition === null) {
    player.winPosition = gameState.players.filter((p) => p.winPosition !== null).length + 1;
  }
}

function checkGameOver(gameState: GameState): void {
  if (gameState.status === 'GAME_OVER') return;
  const playersWithCards = gameState.players.filter((p) => p.hand.length > 0).length;
  if (playersWithCards <= 1) {
    gameState.status = 'GAME_OVER';
  }
}
