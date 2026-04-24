interface PlayButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const PlayButton = ({ onClick, disabled }: PlayButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn btn-lg btn-green"
    >
      PLAY
    </button>
  );
};

export default PlayButton;
