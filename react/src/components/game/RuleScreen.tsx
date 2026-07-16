import { useEffect, useState } from 'react';
import Card from './Card';
import { CARD_DIMS, type CardSize } from '../../card-dims';

const STACK_OVERLAP: Record<CardSize, number> = { small: 18, medium: 22, large: 28 };

type Props = {
  onClose?: () => void;
};

export default function RuleScreen({ onClose }: Props) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cardSize = isMobile ? 'small' : 'medium';

  const sectionLabel: React.CSSProperties = {
    color: '#888',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  };

  const heading: React.CSSProperties = {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  };

  const paragraph: React.CSSProperties = {
    color: '#ddd',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 12px 0',
  };

  const inlineCardRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '12px 0',
    flexWrap: 'wrap',
  };

  const ruleSection: React.CSSProperties = {
    marginBottom: '24px',
  };

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      background: '#2d6a2d',
      padding: isMobile ? '12px' : '20px 24px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        background: '#1e1e1e',
        borderRadius: '12px',
        padding: isMobile ? '20px' : '32px',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div style={sectionLabel}>Rules</div>
          {onClose && (
            <button onClick={onClose} className="btn btn-sm btn-blue">
              CLOSE
            </button>
          )}
        </div>

        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingRight: '8px',
        }}>
          <div style={ruleSection}>
            <h2 style={heading}>Goal</h2>
            <p style={paragraph}>
               The first player to get rid of all their cards becomes the President. The last player stuck with cards is the Asshole.
            </p>
          </div>
          <div style={ruleSection}>
            <h2 style={heading}>Taking a Turn</h2>
            <p style={paragraph}>
              On your turn, play one or more cards of the same rank. If there's an active hand on the table, you must play the same number of cards at an equal or higher rank. If you can't (or don't want to) play, you may PASS.
            </p>
            <p style={paragraph}>
              Once every other player passes, the active hand is cleared and the last player to play leads a new hand.
            </p>
          </div>
          <div style={ruleSection}>
            <h2 style={heading}>Card Ranking</h2>
            <div style={inlineCardRow}>
              <Card rank="3" suit="C" size={cardSize} />
              <span style={{ color: '#888', fontSize: '20px' }}>&lt;</span>
              <Card rank="7" suit="D" size={cardSize} />
              <span style={{ color: '#888', fontSize: '20px' }}>&lt;</span>
              <Card rank="K" suit="S" size={cardSize} />
              <span style={{ color: '#888', fontSize: '20px' }}>&lt;</span>
              <div style={{
                position: 'relative',
                width: `${CARD_DIMS[cardSize].width + STACK_OVERLAP[cardSize]}px`,
                height: `${CARD_DIMS[cardSize].height}px`,
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 0 }}>
                  <Card rank="3" suit="H" size={cardSize} />
                </div>
                <div style={{ position: 'absolute', left: `${STACK_OVERLAP[cardSize]}px`, top: 0, zIndex: 1 }}>
                  <Card rank="3" suit="S" size={cardSize} />
                </div>
              </div>
            </div>
            <p style={paragraph}>
              Cards rank from low to high: 3, 5, 6, 7, 8, 9, 10, J, Q, K, A (Suits do not matter).<br/>
              <strong>NOTE:</strong><em> 2's and 4's have special rules, see below.</em>
            </p>
          </div>
          <div style={ruleSection}>
            <h2 style={heading}>The 2 clears</h2>
            <div style={inlineCardRow}>
              <Card rank="2" suit="H" size={cardSize} />
            </div>
            <p style={paragraph}>
              A 2 is wild and can be played at any time and clears the active hand. After playing a 2, the same player takes another turn and leads a new hand.
            </p>
          </div>

          <div style={ruleSection}>
            <h2 style={heading}>The 4 is a Social</h2>
            <div style={inlineCardRow}>
              <Card rank="4" suit="H" size={cardSize} />
            </div>
            <p style={paragraph}>
              A 4 is also wild and can be played at any time, but does not clear the active hand. Then next player must beat the hand that was played prior to the last 4. When a 4 is played, everyone drinks.
            </p>
          </div>

          <div style={ruleSection}>
            <h2 style={heading}>Skipping</h2>
            <p style={paragraph}>
              If you play the same rank as the active hand (matching its size), the next player is skipped and must drink.
            </p>
            <div style={inlineCardRow}>
              <Card rank="9" suit="H" size={cardSize} />
              <span style={{ color: '#888', fontSize: '14px' }}>then</span>
              <Card rank="9" suit="S" size={cardSize} />
              <span style={{ color: '#888', fontSize: '14px' }}>→ next player skipped</span>
            </div>
          </div>

          <div style={ruleSection}>
            <h2 style={heading}>Drinking</h2>
            <p style={paragraph}>
              You drink when you pass, get skipped, or when someone plays a 4 (everyone drinks).
            </p>
          </div>

          <div style={ruleSection}>
            <h2 style={heading}>Winning</h2>
            <p style={paragraph}>
              The first player out of cards wins the round and is the President. Play continues until only one player has cards left, that player is the Asshole.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
