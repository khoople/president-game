interface TurnProps {
  isMyTurn: boolean;
  activePlayerName: string;
}

const Turn = ({ isMyTurn, activePlayerName }: TurnProps) => {
  return (
    <span style={{
      color: isMyTurn ? '#ffe000' : '#e8d44d',
      fontSize: isMyTurn ? '20px' : '14px',
      fontWeight: '900',
      letterSpacing: isMyTurn ? '2px' : '0px',
      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
    }}>
      {isMyTurn ? 'YOUR TURN!' : `WAITING FOR ${activePlayerName.toUpperCase()} TO PLAY`}
    </span>
  );
};

export default Turn;
