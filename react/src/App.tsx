import { useEffect, useRef, useState } from 'react';
import Table from './components/game/Table';
import PlayerHand from './components/game/PlayerHand';
import GameCenter from './components/game/GameCenter';
import PlayButton from './components/game/PlayButton';
import PassButton from './components/game/PassButton';
import Turn from './components/game/Turn';
import Opponent from './components/game/Opponent';
import { startGame, joinGame, openPlayerStateSocket, playCards, playPass } from './api/game';
import { startLobby, joinLobby, exitLobby, updateLobby, openLobbyStateSocket, sendLobbyMessage } from './api/lobby';
import type { LobbyState, PlayerState, OpponentPlayerState } from './president-client/types';
import { sortHand } from './president-client/card';
import MessageDisplay from './components/game/MessageDisplay';
import LobbyHome from './components/lobby/LobbyHome';
import LobbyRoom from './components/lobby/LobbyRoom';

import { getSocketHandler, type SocketHandler } from './api/socket-handler';

type Screen = 'home' | 'lobby-room' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [playerHand, setPlayerHand] = useState<string[]>([]);
  const [chosenHand, setChosenHand] = useState<string[]>([]);
  const [activeHand, setActiveHand] = useState<string[]>([]);
  const [discard, setDiscard] = useState<string[][]>([]);
  const [opponents, setOpponents] = useState<OpponentPlayerState[]>([]);
  const [activePlayerNumber, setActivePlayerNumber] = useState<number>(0);
  const [myPlayerNumber, setMyPlayerNumber] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const lobbyIdRef = useRef<string>('');
  const lobbyUserIdRef = useRef<string>('');
  const gameIdRef = useRef<string>('');
  const playerIdRef = useRef<string>('');
  const lobbyWsRef = useRef<SocketHandler | null>(null);
  const gameWsRef = useRef<SocketHandler | null>(null);

  const applyPlayerState = (playerState: PlayerState) => {
    setPlayerHand(sortHand(playerState.playerHand));
    setActiveHand(playerState.activeHand);
    setDiscard(playerState.discard);
    setOpponents(playerState.opponents ?? []);
    setActivePlayerNumber(playerState.activePlayerNumber);
    setMyPlayerNumber(playerState.playerNumber);
  };

  const handleStartGame = async () => {
    if (!lobbyState) throw new Error('Cannot start game: no lobby state');

    const lobbyUsers = lobbyState.users.map(({ id, name, isHost }) => ({ id, name, isHost }));
    const { gameId } = await startGame(lobbyIdRef.current, lobbyUsers);
    const { playerId } = await joinGame(gameId, lobbyUserIdRef.current);
    if (!playerId) throw new Error('Join failed: no playerId returned');

    gameIdRef.current = gameId;
    playerIdRef.current = playerId;

    gameWsRef.current = getSocketHandler(
      () => openPlayerStateSocket(gameId, playerId),
      (data) => applyPlayerState(JSON.parse(data) as PlayerState),
    );

    await updateLobby(lobbyIdRef.current, lobbyUserIdRef.current, { gameId, status: 'in-game' });
    setScreen('game');
  };

  const connectToLobbySocket = (lobbyId: string, lobbyUserId: string) => {
    lobbyWsRef.current?.close();
    lobbyWsRef.current = getSocketHandler(
      () => openLobbyStateSocket(lobbyId, lobbyUserId),
      (data) => setLobbyState(JSON.parse(data) as LobbyState),
    );
  };

  const handleExitLobby = async () => {
    await exitLobby(lobbyIdRef.current, lobbyUserIdRef.current);
    lobbyWsRef.current?.close();
    lobbyWsRef.current = null;
    lobbyIdRef.current = '';
    lobbyUserIdRef.current = '';
    setLobbyState(null);
    setScreen('home');
  };

  const handleJoinLobby = async (name: string, lobbyId: string): Promise<string | null> => {
    const result = await joinLobby(lobbyId, name);
    if ('error' in result) return result.error;
    lobbyIdRef.current = lobbyId;
    lobbyUserIdRef.current = result.lobbyUserId;
    connectToLobbySocket(lobbyId, result.lobbyUserId);
    setScreen('lobby-room');
    return null;
  };

  const handleStartNewLobby = async (name: string) => {
    const { lobbyId, lobbyUserId } = await startLobby(name);
    lobbyIdRef.current = lobbyId;
    lobbyUserIdRef.current = lobbyUserId;
    connectToLobbySocket(lobbyId, lobbyUserId);
    setScreen('lobby-room');
  };

  const handleJoinGame = async (gameId: string) => {
    const { playerId } = await joinGame(gameId, lobbyUserIdRef.current);
    if (!playerId) return;

    gameIdRef.current = gameId;
    playerIdRef.current = playerId;

    gameWsRef.current = getSocketHandler(
      () => openPlayerStateSocket(gameId, playerId),
      (data) => applyPlayerState(JSON.parse(data) as PlayerState),
    );

    setScreen('game');
  };

  useEffect(() => {
    if (lobbyState?.status !== 'in-game' || playerIdRef.current !== '') return;
    const gameId = lobbyState.gameId;
    if (!gameId) return;

    handleJoinGame(gameId);
  }, [lobbyState]);

  useEffect(() => {
    return () => {
      lobbyWsRef.current?.close();
      gameWsRef.current?.close();
    };
  }, []);

  const handleCardClick = (code: string) => {
    setChosenHand((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handlePlay = async () => {
    if (chosenHand.length === 0) return;
    setMessage(null);
    const result = await playCards(gameIdRef.current, playerIdRef.current, chosenHand);
    if (!result.isValid) {
      setMessage(result.invalidMessageLong ?? 'Invalid play.');
      return;
    }
    setChosenHand([]);
  };

  const handlePass = async () => {
    setMessage(null);
    const result = await playPass(gameIdRef.current, playerIdRef.current);
    if (!result.isValid) {
      setMessage(result.invalidMessageLong ?? 'Cannot pass.');
    }
  };

  if (screen === 'home') {
    return <LobbyHome onJoinLobby={handleJoinLobby} onStartNewLobby={handleStartNewLobby} />;
  }

  if (screen === 'lobby-room' && lobbyState) {
    return (
      <LobbyRoom
        lobbyState={lobbyState}
        lobbyUserId={lobbyUserIdRef.current}
        onStart={handleStartGame}
        onExitLobby={handleExitLobby}
        onSendMessage={(text) => {
          const user = lobbyState.users.find((u) => u.id === lobbyUserIdRef.current);
          if (user) sendLobbyMessage(lobbyIdRef.current, lobbyUserIdRef.current, user.name, text);
        }}
      />
    );
  }

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#2d6a2d', padding: '8px', paddingBottom: 'max(4px, env(safe-area-inset-bottom))', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ flex: 1 }}>
        <Table
          top={
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
              {opponents.map((opponent) => (
                <Opponent key={opponent.playerNumber} {...opponent} isActive={opponent.playerNumber === activePlayerNumber} />
              ))}
            </div>
          }
          center={<GameCenter activeHand={activeHand} discard={discard} />}
          bottom={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <MessageDisplay message={message} />
              <PlayerHand
                cards={playerHand}
                chosenCards={chosenHand}
                onCardClick={handleCardClick}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <PlayButton onClick={handlePlay} disabled={chosenHand.length === 0} />
                <PassButton onClick={handlePass} disabled={myPlayerNumber !== activePlayerNumber} />
              </div>
              <Turn isMyTurn={myPlayerNumber === activePlayerNumber} />
            </div>
          }
        />
      </div>
    </div>
  );
}

export default App;
