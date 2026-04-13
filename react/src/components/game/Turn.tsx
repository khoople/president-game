interface TurnProps {
  isMyTurn: boolean;
}

const Turn = ({ isMyTurn }: TurnProps) => {
  return (
    <span style={{
      visibility: isMyTurn ? 'visible' : 'hidden',
      color: '#f9ca24',
      fontSize: '20px',
      fontWeight: '900',
      letterSpacing: '2px',
      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
    }}>
      YOUR TURN!
    </span>
  );
};

export default Turn;
