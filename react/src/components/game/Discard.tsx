import ActiveHand from './ActiveHand';

interface DiscardProps {
  hands?: string[][];
}

const Discard = ({ hands = [] }: DiscardProps) => {
  if (hands.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      {hands.map((hand, i) => {
        const isVisible = i === hands.length - 1;
        return (
          <div
            key={i}
            style={isVisible
              ? undefined
              : { position: 'absolute', top: 0, left: 0, visibility: 'hidden', pointerEvents: 'none' }
            }
          >
            <ActiveHand cards={hand} />
          </div>
        );
      })}
    </div>
  );
};

export default Discard;
