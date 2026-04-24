interface PassButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const PassButton = ({ onClick, disabled }: PassButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn btn-lg btn-blue"
    >
      PASS
    </button>
  );
};

export default PassButton;
