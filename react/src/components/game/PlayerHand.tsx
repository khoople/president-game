import { useState, useEffect } from 'react';
import Card from './Card';
import { parseCard } from '../../president-client/card';

const CARD_WIDTH = 80;
const CARD_HEIGHT = 112;
const OVERLAP_OFFSET = 28;
const CHOSEN_LIFT = 24;
// How many pixels of the top row peek out from under the bottom row.
// Enough to show the rank label (positioned at top:4px inside the card).
const TOP_PEEK = 28;
// Matches the 8px padding on each side of the game screen outer div.
const H_PADDING = 16;

interface PlayerHandProps {
  cards: string[];
  chosenCards: string[];
  onCardClick: (code: string) => void;
}

const PlayerHand = ({ cards, chosenCards, onCardClick }: PlayerHandProps) => {
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const chosen = new Set(chosenCards);
  const availableWidth = windowWidth - H_PADDING;
  const singleRowWidth = CARD_WIDTH + (cards.length - 1) * OVERLAP_OFFSET;
  const useTwoRows = cards.length > 1 && singleRowWidth > availableWidth;

  if (!useTwoRows) {
    return (
      <div style={{ position: 'relative', width: `${singleRowWidth}px`, height: `${CARD_HEIGHT + CHOSEN_LIFT}px` }}>
        {cards.map((code, i) => {
          const { rank, suit } = parseCard(code);
          const isChosen = chosen.has(code);
          return (
            <div
              key={code}
              style={{
                position: 'absolute',
                left: `${i * OVERLAP_OFFSET}px`,
                top: isChosen ? 0 : `${CHOSEN_LIFT}px`,
                zIndex: i,
                cursor: 'pointer',
                transition: 'top 0.15s ease',
              }}
              onClick={() => onCardClick(code)}
            >
              <Card rank={rank} suit={suit} />
            </div>
          );
        })}
      </div>
    );
  }

  // Two-row mode: top always gets floor(N/2)+1 cards so top > bottom for any N.
  const topCount = Math.floor(cards.length / 2) + 1;
  const bottomCount = cards.length - topCount;

  // If the standard OVERLAP_OFFSET would make either row too wide, compress it
  // just enough to fit within availableWidth, down to MIN_OVERLAP.
  const MIN_OVERLAP = 16;
  const topOverlapNeeded = topCount > 1 ? (availableWidth - CARD_WIDTH) / (topCount - 1) : OVERLAP_OFFSET;
  const bottomOverlapNeeded = bottomCount > 1 ? (availableWidth - CARD_WIDTH) / (bottomCount - 1) : OVERLAP_OFFSET;
  const effectiveOverlap = Math.max(MIN_OVERLAP, Math.floor(Math.min(OVERLAP_OFFSET, topOverlapNeeded, bottomOverlapNeeded)));
  const topCards = cards.slice(0, topCount);
  const bottomCards = cards.slice(topCount);

  const topRowWidth = CARD_WIDTH + (topCount - 1) * effectiveOverlap;
  const bottomRowWidth = bottomCount > 0 ? CARD_WIDTH + (bottomCount - 1) * effectiveOverlap : 0;
  const containerWidth = Math.max(topRowWidth, bottomRowWidth);
  // CHOSEN_LIFT (space above top row) + TOP_PEEK (visible top row portion) + CARD_HEIGHT (full bottom row)
  const containerHeight = CHOSEN_LIFT + TOP_PEEK + CARD_HEIGHT;

  return (
    <div style={{ position: 'relative', width: `${containerWidth}px`, height: `${containerHeight}px` }}>
      {/* Top row — rendered behind the bottom row */}
      {topCards.map((code, i) => {
        const { rank, suit } = parseCard(code);
        const isChosen = chosen.has(code);
        return (
          <div
            key={code}
            style={{
              position: 'absolute',
              left: `${i * effectiveOverlap}px`,
              top: isChosen ? 0 : `${CHOSEN_LIFT}px`,
              // Chosen top-row cards rise above the bottom row so they're visible.
              zIndex: i,
              cursor: 'pointer',
              transition: 'top 0.15s ease',
            }}
            onClick={() => onCardClick(code)}
          >
            <Card rank={rank} suit={suit} />
          </div>
        );
      })}
      {/* Bottom row — rendered in front, showing TOP_PEEK px of the top row above */}
      {bottomCards.map((code, i) => {
        const { rank, suit } = parseCard(code);
        const isChosen = chosen.has(code);
        return (
          <div
            key={code}
            style={{
              position: 'absolute',
              left: `${Math.round((containerWidth - bottomRowWidth) / 2) + i * effectiveOverlap}px`,
              top: isChosen ? `${TOP_PEEK}px` : `${CHOSEN_LIFT + TOP_PEEK}px`,
              zIndex: 100 + i,
              cursor: 'pointer',
              transition: 'top 0.15s ease',
            }}
            onClick={() => onCardClick(code)}
          >
            <Card rank={rank} suit={suit} />
          </div>
        );
      })}
    </div>
  );
};

export default PlayerHand;
