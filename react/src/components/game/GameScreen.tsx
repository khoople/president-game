import { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '../../president-client/types';
import { sortHand } from '../../president-client/card';
import { playCards, playPass } from '../../api/game';
import PlayerHand from './PlayerHand';
import GameCenter from './GameCenter';
import PlayButton from './PlayButton';
import PassButton from './PassButton';
import Turn from './Turn';
import PlayerList from './PlayerList';
import MessageDisplay from './MessageDisplay';
import MenuBar from './MenuBar';

type Props = {
  playerState: PlayerState;
  gameId: string;
  isMobile: boolean;
  chatPreview: { name: string; text: string } | null;
  isHost: boolean;
  onReturnToLobby: () => void;
  onQuit: () => void;
  onNextRound: () => void;
};

export default function GameScreen({ playerState, gameId, isMobile, chatPreview, isHost, onReturnToLobby, onQuit, onNextRound }: Props) {
  const [chosenHand, setChosenHand] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const prevActiveHandRef = useRef(playerState.activeHand);

  useEffect(() => {
    const prev = prevActiveHandRef.current;
    const curr = playerState.activeHand;
    const changed = curr.length !== prev.length || curr.some((c, i) => c !== prev[i]);
    if (changed && curr.length > 0) {
      new Audio('/sounds/card-play.mp3').play().catch(() => {});
    }
    prevActiveHandRef.current = curr;
  }, [playerState.activeHand]);

  const handleCardClick = (code: string) => {
    setChosenHand((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handlePlay = async () => {
    if (chosenHand.length === 0) return;
    setMessage(null);
    const result = await playCards(gameId, playerState.playerId, chosenHand);
    if (!result.isValid) {
      setMessage(result.invalidMessageLong ?? 'Invalid play.');
      return;
    }
    setChosenHand([]);
  };

  const handlePass = async () => {
    setMessage(null);
    const result = await playPass(gameId, playerState.playerId);
    if (!result.isValid) setMessage(result.invalidMessageLong ?? 'Cannot pass.');
  };

  const isMyTurn = playerState.playerNumber === playerState.activePlayerNumber;
  const activePlayerName =
    playerState.opponents.find((o) => o.playerNumber === playerState.activePlayerNumber)?.playerName
    ?? playerState.playerName;

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#2d6a2d', padding: '8px', paddingTop: 0, paddingBottom: 'max(4px, env(safe-area-inset-bottom))', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <MenuBar chatPreview={chatPreview} onReturnToLobby={onReturnToLobby} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <PlayerList
          opponents={playerState.opponents}
          myPlayerNumber={playerState.playerNumber}
          myPlayerName={playerState.playerName}
          myNumCards={playerState.playerHand.length}
          myWinPosition={playerState.playerWinPosition}
          myIsDrinking={playerState.isDrinking}
          activePlayerNumber={playerState.activePlayerNumber}
          isMobile={isMobile}
        />
        <Turn
          isMyTurn={isMyTurn}
          activePlayerName={activePlayerName}
          myWinPosition={playerState.playerWinPosition}
          gameStatus={playerState.gameStatus}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GameCenter activeHand={playerState.activeHand} discard={playerState.discard} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <MessageDisplay message={message} />
        <PlayerHand
          cards={sortHand(playerState.playerHand)}
          chosenCards={chosenHand}
          onCardClick={handleCardClick}
        />
        {playerState.gameStatus === 'GAME_OVER' ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onQuit}
              className="btn btn-red btn-exit-game"
            >
              EXIT GAME
            </button>
            {isHost && (
              <button
                onClick={onNextRound}
                className="btn btn-green btn-next-round"
              >
                NEXT ROUND
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <PlayButton onClick={handlePlay} disabled={chosenHand.length === 0 || !isMyTurn} />
            <PassButton onClick={handlePass} disabled={!isMyTurn || chosenHand.length > 0} />
          </div>
        )}
      </div>
    </div>
  );
}
