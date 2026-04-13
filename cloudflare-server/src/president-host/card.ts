export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Suit = 'H' | 'D' | 'C' | 'S';
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS: Suit[] = ['H', 'D', 'C', 'S'];

export function parseCard(code: string): { rank: Rank; suit: Suit } {
  const rank = code.slice(0, -1) as Rank;
  const suit = code.slice(-1) as Suit;
  return { rank, suit };
}

export function createDeck(): string[] {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

export function fisherYatesShuffle(deck: string[]): string[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function rankOf(card: string): Rank {
  return card[0] as Rank;
}

export function rankIndex(card: string): number {
  return RANKS.indexOf(rankOf(card));
}
