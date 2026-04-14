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
  const [lobbyUserId, setLobbyUserId] = useState<string>('');
  const lobbyIdRef = useRef<string>('');
  const lobbyUserIdRef = useRef<string>('');
  const userNameRef = useRef<string>('');
  const gameIdRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
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
      (data) => applyLobbyState(JSON.parse(data) as LobbyState),
    );
  };

  const handleExitLobby = async () => {
    localStorage.removeItem(`lobby-user-id-${lobbyIdRef.current}-${userNameRef.current}`);
    await exitLobby(lobbyIdRef.current, lobbyUserIdRef.current);
    lobbyWsRef.current?.close();
    lobbyWsRef.current = null;
    lobbyIdRef.current = '';
    lobbyUserIdRef.current = '';
    setLobbyUserId('');
    setLobbyState(null);
    setScreen('home');
  };

  const handleJoinLobby = async (name: string, lobbyId: string): Promise<string | null> => {
    const result = await joinLobby(lobbyId, name);
    if ('error' in result) return result.error;
    lobbyIdRef.current = lobbyId;
    lobbyUserIdRef.current = result.lobbyUserId;
    userNameRef.current = name;
    setLobbyUserId(result.lobbyUserId);
    localStorage.setItem(`lobby-user-id-${lobbyId}-${name}`, result.lobbyUserId);
    connectToLobbySocket(lobbyId, result.lobbyUserId);
    setScreen('lobby-room');
    return null;
  };

  const handleRejoinLobby = (lobbyId: string, userName: string) => {
    const storedLobbyUserId = localStorage.getItem(`lobby-user-id-${lobbyId}-${userName}`);
    if (!storedLobbyUserId) return;
    lobbyIdRef.current = lobbyId;
    lobbyUserIdRef.current = storedLobbyUserId;
    userNameRef.current = userName;
    setLobbyUserId(storedLobbyUserId);
    connectToLobbySocket(lobbyId, storedLobbyUserId);
    setScreen('lobby-room');
  };

  const handleStartNewLobby = async (name: string) => {
    const { lobbyId, lobbyUserId } = await startLobby(name);
    lobbyIdRef.current = lobbyId;
    lobbyUserIdRef.current = lobbyUserId;
    userNameRef.current = name;
    setLobbyUserId(lobbyUserId);
    localStorage.setItem(`lobby-user-id-${lobbyId}-${name}`, lobbyUserId);
    connectToLobbySocket(lobbyId, lobbyUserId);
    setScreen('lobby-room');
  };

  const handleJoinGame = async (gameId: string, lobbyUserId: string) => {
    const { playerId } = await joinGame(gameId, lobbyUserId);
    if (!playerId) {
      throw new Error('Unable to join game: no playerId returned');
    }

    gameIdRef.current = gameId;
    playerIdRef.current = playerId;

    gameWsRef.current = getSocketHandler(
      () => openPlayerStateSocket(gameId, playerId),
      (data) => applyPlayerState(JSON.parse(data) as PlayerState),
    );

    // Show the game screen. There may be a delay before we receive the first player state update but it will populate once we do.
    setScreen('game');
  };

  const applyLobbyState = (newLobbyState: LobbyState) => {
    setLobbyState(newLobbyState);

    // When lobbyState.status changes to "in-game", attempt to join the game and then switch to displaying the game screen.
    // If playerId isn't set we know we haven't joined the game yet.
    if (!playerIdRef.current && newLobbyState.status === 'in-game' && newLobbyState.gameId) {
      handleJoinGame(newLobbyState.gameId, lobbyUserIdRef.current);
    }
  };

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
    if (!gameIdRef.current || !playerIdRef.current) return;
    setMessage(null);
    const result = await playCards(gameIdRef.current, playerIdRef.current, chosenHand);
    if (!result.isValid) {
      setMessage(result.invalidMessageLong ?? 'Invalid play.');
      return;
    }
    setChosenHand([]);
  };

  const handlePass = async () => {
    if (!gameIdRef.current || !playerIdRef.current) return;
    setMessage(null);
    const result = await playPass(gameIdRef.current, playerIdRef.current);
    if (!result.isValid) {
      setMessage(result.invalidMessageLong ?? 'Cannot pass.');
    }
  };

  // Home screen with options to create or join a lobby.
  if (screen === 'home') {
    return <LobbyHome onJoinLobby={handleJoinLobby} onRejoinLobby={handleRejoinLobby} onStartNewLobby={handleStartNewLobby} />;
  }

  // Lobby room screen.
  if (screen === 'lobby-room' && lobbyState) {
    return (
      <LobbyRoom
        lobbyState={lobbyState}
        lobbyUserId={lobbyUserId}
        onStart={handleStartGame}
        onExitLobby={handleExitLobby}
        onSendMessage={(text) => {
          const user = lobbyState.users.find((u) => u.id === lobbyUserIdRef.current);
          if (user) sendLobbyMessage(lobbyIdRef.current, lobbyUserIdRef.current, user.name, text);
        }}
      />
    );
  }

  // Game screen.
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
                <PlayButton onClick={handlePlay} disabled={chosenHand.length === 0 || activePlayerNumber !== myPlayerNumber} />
                <PassButton onClick={handlePass} disabled={myPlayerNumber !== activePlayerNumber || chosenHand.length > 0} />
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
