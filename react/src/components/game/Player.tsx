import type { OpponentPlayerState } from '../../president-client/types';
import { CARD_DIMS } from '../../card-dims';
import { ordinal } from '../../president-client/ordinals';

type Props = OpponentPlayerState & { isActive: boolean; isMe?: boolean; compact?: boolean };

const Player = ({ playerName, numCards, isActive, isDisconnected, winPosition, isMe = false, compact = false }: Props) => {
  const finished = winPosition !== null;
  const bgColor = finished ? '#1a4a8a' : isActive ? '#a01020' : '#6b0f1a';
  const borderColor = finished ? '#5a9fd4' : isActive ? '#f9ca24' : '#3d0a10';
  const { width, height } = compact ? CARD_DIMS.small : CARD_DIMS.large;

  const card = (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: bgColor,
      borderRadius: '6px',
      border: isActive ? `2px solid ${borderColor}` : `1px solid ${borderColor}`,
      boxShadow: isActive ? '0 0 12px 4px rgba(249,202,36,0.6)' : '2px 2px 6px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      flexShrink: 0,
      transition: 'box-shadow 0.2s, border 0.2s, background-color 0.2s',
    }}>
      <span style={{ color: 'white', fontSize: compact ? '14px' : '22px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
        {finished ? ordinal(winPosition) : numCards}
      </span>
    </div>
  );

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {card}
        <span style={{ color: isDisconnected ? '#666' : isMe ? '#4cff72' : '#fff', fontSize: '12px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {playerName}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <span style={{ color: isDisconnected ? '#666' : isMe ? '#4cff72' : 'white', fontSize: '13px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
        {playerName}
      </span>
      {card}
    </div>
  );
};

export default Player;
