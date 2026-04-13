export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Suit = 'H' | 'D' | 'C' | 'S';

const RANK_ORDER: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export function parseCard(code: string): { rank: Rank; suit: Suit } {
  const rank = code.slice(0, -1) as Rank;
  const suit = code.slice(-1) as Suit;
  return { rank, suit };
}

export function sortHand(cards: string[]): string[] {
  return [...cards].sort((a, b) => RANK_ORDER.indexOf(a[0] as Rank) - RANK_ORDER.indexOf(b[0] as Rank));
}
