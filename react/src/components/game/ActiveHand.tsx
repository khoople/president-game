import Card from './Card';
import { parseCard } from '../../president-client/card';

const CARD_WIDTH = 80;
const OVERLAP_OFFSET = 28;

interface ActiveHandProps {
  cards: string[];
}

const ActiveHand = ({ cards }: ActiveHandProps) => {
  if (cards.length === 0) return null;

  const totalWidth = CARD_WIDTH + (cards.length - 1) * OVERLAP_OFFSET;

  return (
    <div style={{ position: 'relative', width: `${totalWidth}px`, height: '112px' }}>
      {cards.map((code, i) => {
        const { rank, suit } = parseCard(code);
        return (
          <div
            key={code}
            style={{
              position: 'absolute',
              left: `${i * OVERLAP_OFFSET}px`,
              zIndex: i,
            }}
          >
            <Card rank={rank} suit={suit} />
          </div>
        );
      })}
    </div>
  );
};

export default ActiveHand;
