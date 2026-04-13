interface PassButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const PassButton = ({ onClick, disabled }: PassButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? '#777' : '#2980b9',
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
      PASS
    </button>
  );
};

export default PassButton;
