interface PlayButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const PlayButton = ({ onClick, disabled }: PlayButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#777' : '#cc2200',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 40px',
        cursor: disabled ? 'default' : 'pointer',
        fontWeight: '900',
        fontSize: '20px',
        letterSpacing: '1px',
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      PLAY
    </button>
  );
};

export default PlayButton;
