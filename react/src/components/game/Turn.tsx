import { useEffect, useState } from 'react';
import type { PlayerMessageClass } from '../../president-client/types';
import type { CSSProperties } from 'react';

interface TurnProps {
  gameMessage: string;
  playerMessage: string;
  playerMessageClass: PlayerMessageClass;
}

const PLAYER_MESSAGE_STYLES: Record<PlayerMessageClass, CSSProperties> = {
  notice: {
    color: '#ffe000',
    fontSize: '14px',
  },
  danger: {
    color: '#ff4444',
    fontSize: '20px',
    letterSpacing: '2px',
  },
  success: {
    color: '#5a9fd4',
    fontSize: '14px',
  },
};

const GAME_MESSAGE_STYLE: CSSProperties = {
  color: '#00ff44',
  fontSize: '14px',
};

const Turn = ({ gameMessage, playerMessage, playerMessageClass }: TurnProps) => {
  const [shownGameMessage, setShownGameMessage] = useState(gameMessage);
  const [showGameMessage, setShowGameMessage] = useState(gameMessage !== '');

  if (gameMessage !== shownGameMessage) {
    setShownGameMessage(gameMessage);
    setShowGameMessage(gameMessage !== '');
  }

  useEffect(() => {
    if (!showGameMessage) return;
    const timeout = setTimeout(() => setShowGameMessage(false), 3000);
    return () => clearTimeout(timeout);
  }, [showGameMessage, gameMessage]);

  return (
    <span style={{
      fontWeight: '900',
      textTransform: 'uppercase',
      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
      ...(showGameMessage ? GAME_MESSAGE_STYLE : PLAYER_MESSAGE_STYLES[playerMessageClass]),
    }}>
      {showGameMessage ? gameMessage : playerMessage}
    </span>
  );
};

export default Turn;
