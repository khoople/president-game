import type { OpponentPlayerState } from '../../president-client/types';

type Props = OpponentPlayerState & { isActive: boolean };

const Opponent = ({ playerName, numCards, isActive }: Props) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <span style={{ color: 'white', fontSize: '13px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
        {playerName}
      </span>
      <div style={{
        width: '80px',
        height: '112px',
        backgroundColor: isActive ? '#a01020' : '#6b0f1a',
        borderRadius: '6px',
        border: isActive ? '2px solid #f9ca24' : '1px solid #3d0a10',
        boxShadow: isActive ? '0 0 12px 4px rgba(249,202,36,0.6)' : '2px 2px 6px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'box-shadow 0.2s, border 0.2s, background-color 0.2s',
      }}>
        <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
          {numCards}
        </span>
      </div>
    </div>
  );
};

export default Opponent;
