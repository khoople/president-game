import Player from './Player';
import type { OpponentPlayerState } from '../../president-client/types';

type Props = {
  opponents: OpponentPlayerState[];
  myPlayerNumber: number;
  myPlayerName: string;
  myNumCards: number;
  myWinPosition: number | null;
  activePlayerNumber: number;
  isMobile: boolean;
};

const PlayerList = ({ opponents, myPlayerNumber, myPlayerName, myNumCards, myWinPosition, activePlayerNumber, isMobile }: Props) => {
  const totalPlayers = opponents.length + 1;
  const compact = isMobile && totalPlayers >= 4;

  const playerCards = Array.from({ length: totalPlayers }, (_, i) => {
    const playerNumber = i + 1;
    if (playerNumber === myPlayerNumber) {
      return { playerNumber, playerName: myPlayerName, numCards: myNumCards, isDisconnected: false, winPosition: myWinPosition };
    }
    return opponents.find((o) => o.playerNumber === playerNumber) ?? null;
  }).filter((p) => p !== null);

  if (compact) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(2, auto)`, gap: '6px', justifyContent: 'space-evenly', width: '100%' }}>
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
