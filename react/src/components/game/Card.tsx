import type { Rank, Suit } from '../../president-client/card';
import { CARD_DIMS, type CardSize } from '../../card-dims';

const RED_SUITS: Suit[] = ['H', 'D'];
const SUIT_SYMBOLS: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

const STYLE: Record<CardSize, { cornerFont: string; suitFont: string; borderRadius: number }> = {
  small:  { cornerFont: '9px',  suitFont: '15px', borderRadius: 4 },
  medium: { cornerFont: '11px', suitFont: '18px', borderRadius: 5 },
  large:  { cornerFont: '13px', suitFont: '22px', borderRadius: 6 },
};

const Card = ({ rank, suit, size = 'large' }: { rank: Rank; suit: Suit; size?: CardSize }) => {
  const color = RED_SUITS.includes(suit) ? '#cc0000' : '#111111';
  const displayRank = rank === 'T' ? '10' : rank;
  const { width, height } = CARD_DIMS[size];
  const { cornerFont, suitFont, borderRadius } = STYLE[size];

  return (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: 'white',
      borderRadius: `${borderRadius}px`,
      border: '1px solid #ccc',
      boxShadow: '2px 2px 6px rgba(0,0,0,0.4)',
      position: 'relative',
      color,
      fontFamily: 'Georgia, serif',
      fontWeight: 'bold',
      userSelect: 'none',
    }}>
      <span style={{ position: 'absolute', top: '4px', left: '6px', fontSize: cornerFont }}>
        {displayRank}
      </span>
      <span style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: suitFont,
      }}>
        {SUIT_SYMBOLS[suit]}
      </span>
      <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: cornerFont, transform: 'rotate(180deg)' }}>
        {displayRank}
      </span>
    </div>
  );
};

export default Card;
