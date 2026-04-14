import Player from './Player';
import type { OpponentPlayerState } from '../../president-client/types';

type Props = {
  opponents: OpponentPlayerState[];
  myPlayerNumber: number;
  myPlayerName: string;
  myNumCards: number;
  activePlayerNumber: number;
  isMobile: boolean;
};

const PlayerList = ({ opponents, myPlayerNumber, myPlayerName, myNumCards, activePlayerNumber, isMobile }: Props) => {
  const totalPlayers = opponents.length + 1;
  const compact = isMobile && totalPlayers >= 5;

  const playerCards = Array.from({ length: totalPlayers }, (_, i) => {
    const playerNumber = i + 1;
    if (playerNumber === myPlayerNumber) {
      return { playerNumber, playerName: myPlayerName, numCards: myNumCards, isDisconnected: false };
    }
    return opponents.find((o) => o.playerNumber === playerNumber) ?? null;
  }).filter((p) => p !== null);

  if (compact) {
    return (
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, auto)', gridAutoFlow: 'column', gap: '6px', justifyContent: 'center', width: '100%' }}>
        {playerCards.map((player) => (
          <Player key={player.playerNumber} {...player} isActive={player.playerNumber === activePlayerNumber} isMe={player.playerNumber === myPlayerNumber} compact />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
      {playerCards.map((player) => (
        <Player key={player.playerNumber} {...player} isActive={player.playerNumber === activePlayerNumber} isMe={player.playerNumber === myPlayerNumber} />
      ))}
    </div>
  );
};

export default PlayerList;
