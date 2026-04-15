import { ordinal } from '../../president-client/ordinals';

interface TurnProps {
  isMyTurn: boolean;
  activePlayerName: string;
  myWinPosition: number | null;
  gameStatus: 'PLAYING' | 'GAME_OVER';
}

const Turn = ({ isMyTurn, activePlayerName, myWinPosition, gameStatus }: TurnProps) => {
  if (gameStatus === 'GAME_OVER' && myWinPosition === null) {
    return (
      <span style={{
        color: '#ff4444',
        fontSize: '20px',
        fontWeight: '900',
        letterSpacing: '2px',
        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
      }}>
        YOU ARE THE ASSHOLE!
      </span>
    );
  }

  if (myWinPosition !== null) {
    return (
      <span style={{
        color: '#5a9fd4',
        fontSize: '14px',
        fontWeight: '900',
        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
      }}>
        {`YOU FINISHED IN ${ordinal(myWinPosition)} PLACE!`}
      </span>
    );
  }

  return (
    <span style={{
      color: '#ffe000',
      fontSize: '14px',
      fontWeight: '900',
      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
    }}>
      {isMyTurn ? 'YOUR TURN!' : `WAITING FOR ${activePlayerName.toUpperCase()} TO PLAY`}
    </span>
  );
};

export default Turn;
