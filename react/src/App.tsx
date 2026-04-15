import { useEffect, useRef, useState } from 'react';
import PlayerHand from './components/game/PlayerHand';
import GameCenter from './components/game/GameCenter';
import PlayButton from './components/game/PlayButton';
import PassButton from './components/game/PassButton';
import Turn from './components/game/Turn';
import PlayerList from './components/game/PlayerList';
import { startGame, joinGame, openPlayerStateSocket, playCards, playPass, exitGame } from './api/game';
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
  const [myPlayerName, setMyPlayerName] = useState<string>('');
  const [myWinPosition, setMyWinPosition] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<'PLAYING' | 'GAME_OVER'>('PLAYING');
  const [message, setMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
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
    setMyPlayerName(playerState.playerName);
    setMyWinPosition(playerState.playerWinPosition ?? null);
    setGameStatus(playerState.gameStatus ?? 'PLAYING');
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
    // Disconnect from websocket first to avoid receiving updates while we're in the process of exiting.
    lobbyWsRef.current?.close();
    lobbyWsRef.current = null;

    localStorage.removeItem(`lobby-user-id-${lobbyIdRef.current}-${userNameRef.current}`);
    const isHost = lobbyState?.users.find((u) => u.id === lobbyUserIdRef.current)?.isHost ?? false;
    if (isHost) {
      await updateLobby(lobbyIdRef.current, lobbyUserIdRef.current, { status: 'closed' });
    } else {
      await exitLobby(lobbyIdRef.current, lobbyUserIdRef.current);
    }
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

  const handleQuitGame = async () => {
    if (gameStatus !== 'GAME_OVER' && gameIdRef.current && playerIdRef.current) {
      await exitGame(gameIdRef.current, playerIdRef.current);
    }
    gameWsRef.current?.close();
    gameWsRef.current = null;
    playerIdRef.current = null;
    gameIdRef.current = null;
    await handleExitLobby();
  };

  const applyLobbyState = (newLobbyState: LobbyState) => {
    setLobbyState(newLobbyState);

    // When lobbyState.status changes to "in-game", attempt to join the game and then switch to displaying the game screen.
    // If playerId isn't set we know we haven't joined the game yet.
    if (!playerIdRef.current && newLobbyState.status === 'in-game' && newLobbyState.gameId) {
      handleJoinGame(newLobbyState.gameId, lobbyUserIdRef.current);
    }

    // When the lobby is reset to 'waiting' while in-game, all players quit game and return to lobby.
    if (playerIdRef.current && newLobbyState.status === 'closed') {
      handleQuitGame();
    }
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
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
        onEndGame={handleQuitGame}
        onExitLobby={handleExitLobby}
        onReturnToGame={() => setScreen('game')}
        onQuitGame={handleQuitGame}
        onSendMessage={(text) => {
          const user = lobbyState.users.find((u) => u.id === lobbyUserIdRef.current);
          if (user) sendLobbyMessage(lobbyIdRef.current, lobbyUserIdRef.current, user.name, text);
        }}
      />
    );
  }

  // Game screen.
  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#2d6a2d', padding: '8px', paddingBottom: 'max(4px, env(safe-area-inset-bottom))', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
        <button
          onClick={() => setScreen('lobby-room')}
          style={{ position: 'absolute', top: 0, right: 0, padding: '3px 14px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: '#ccc', background: 'linear-gradient(to bottom, #3a3a3a, #1a1a1a)', border: '1px solid #111', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 1px 1px 3px rgba(0,0,0,0.8)' }}
        >
          LOBBY
        </button>
        <PlayerList
          opponents={opponents}
          myPlayerNumber={myPlayerNumber}
          myPlayerName={myPlayerName}
          myNumCards={playerHand.length}
          myWinPosition={myWinPosition}
          activePlayerNumber={activePlayerNumber}
          isMobile={isMobile}
        />
        <Turn
          isMyTurn={myPlayerNumber === activePlayerNumber}
          activePlayerName={opponents.find((o) => o.playerNumber === activePlayerNumber)?.playerName ?? myPlayerName}
          myWinPosition={myWinPosition}
          gameStatus={gameStatus}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GameCenter activeHand={activeHand} discard={discard} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <MessageDisplay message={message} />
        <PlayerHand
          cards={playerHand}
          chosenCards={chosenHand}
          onCardClick={handleCardClick}
        />
        {gameStatus === 'GAME_OVER' ? (
          <button
            onClick={() => setScreen('lobby-room')}
            style={{ padding: '12px 32px', fontSize: '16px', fontWeight: '900', letterSpacing: '1px', background: '#c0392b', color: 'white', border: '2px solid #922b21', borderRadius: '8px', cursor: 'pointer', boxShadow: '2px 2px 6px rgba(0,0,0,0.4)' }}
          >
            BACK TO LOBBY
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <PlayButton onClick={handlePlay} disabled={chosenHand.length === 0 || activePlayerNumber !== myPlayerNumber} />
            <PassButton onClick={handlePass} disabled={myPlayerNumber !== activePlayerNumber || chosenHand.length > 0} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
