import { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '../../president-client/types';
import { sortHand } from '../../president-client/card';
import PlayerHand from './PlayerHand';
import GameCenter from './GameCenter';
import PlayButton from './PlayButton';
import PassButton from './PassButton';
import Turn from './Turn';
import PlayerList from './PlayerList';
import MessageDisplay from './MessageDisplay';

type Props = {
  playerState: PlayerState;
  isMobile: boolean;
  chatPreview: { name: string; text: string } | null;
  onReturnToLobby: () => void;
  onPlay: (chosenHand: string[]) => Promise<string | null>;
  onPass: () => Promise<string | null>;
  onQuit: () => void;
};

export default function GameScreen({ playerState, isMobile, chatPreview, onReturnToLobby, onPlay, onPass, onQuit }: Props) {
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
    const error = await onPlay(chosenHand);
    if (error) {
      setMessage(error);
      return;
    }
    setChosenHand([]);
  };

  const handlePass = async () => {
    setMessage(null);
    const error = await onPass();
    if (error) setMessage(error);
  };

  const isMyTurn = playerState.playerNumber === playerState.activePlayerNumber;
  const activePlayerName =
    playerState.opponents.find((o) => o.playerNumber === playerState.activePlayerNumber)?.playerName
    ?? playerState.playerName;

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#2d6a2d', padding: '8px', paddingTop: 0, paddingBottom: 'max(4px, env(safe-area-inset-bottom))', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.35)', marginLeft: '-8px', marginRight: '-8px', paddingLeft: '8px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px', flexShrink: 0, gap: '8px' }}>
        {chatPreview && (
          <div
            onClick={onReturnToLobby}
            style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}
          >
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#3498db', whiteSpace: 'nowrap', flexShrink: 0 }}>{chatPreview.name}:</span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chatPreview.text}</span>
          </div>
        )}
        <button
          onClick={onReturnToLobby}
          style={{ padding: '3px 14px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: '#fff', background: 'linear-gradient(to bottom, #2d6a2d, #1a3d1a)', border: '1px solid #0f240f', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 1px 1px 3px rgba(0,0,0,0.8)', flexShrink: 0 }}
        >
          LOBBY
        </button>
      </div>
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
          <button
            onClick={onQuit}
            style={{ padding: '12px 32px', fontSize: '16px', fontWeight: '900', letterSpacing: '1px', background: '#c0392b', color: 'white', border: '2px solid #922b21', borderRadius: '8px', cursor: 'pointer', boxShadow: '2px 2px 6px rgba(0,0,0,0.4)' }}
          >
            EXIT GAME
          </button>
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
