import Card, { CARD_DIMS } from './Card';
import { parseCard } from '../../president-client/card';

const OVERLAP = { small: 18, medium: 22, large: 28 };
const GAP = 16;

interface GameCenterProps {
  activeHand: string[];
  discard: string[][];
}

const GameCenter = ({ activeHand, discard }: GameCenterProps) => {
  const lastDiscard = discard.length > 0 ? discard[discard.length - 1] : [];
  const largeH = CARD_DIMS.large.height;
  const smallW = CARD_DIMS.small.width;
  const smallH = CARD_DIMS.small.height;
  const discardTop = (largeH - smallH) / 2;

  return (
    <div style={{ position: 'relative', width: 0, height: `${largeH}px`, overflow: 'visible' }}>
      {activeHand.map((code, i) => {
        const { rank, suit } = parseCard(code);
        return (
          <div key={code} style={{ position: 'absolute', left: `${i * OVERLAP.large}px`, top: 0, zIndex: i }}>
            <Card rank={rank} suit={suit} size="large" />
          </div>
        );
      })}
      {lastDiscard.map((code, i) => {
        const { rank, suit } = parseCard(code);
        const fromRight = lastDiscard.length - 1 - i;
        const left = -(smallW + GAP) - fromRight * OVERLAP.small;
        return (
          <div key={`d-${i}-${code}`} style={{ position: 'absolute', left: `${left}px`, top: `${discardTop}px`, zIndex: i }}>
            <Card rank={rank} suit={suit} size="small" />
          </div>
        );
      })}
    </div>
  );
};

export default GameCenter;
