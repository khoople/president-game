import { useEffect, useRef, useState } from 'react';
import PlayerHand from './components/game/PlayerHand';
import GameCenter from './components/game/GameCenter';
import PlayButton from './components/game/PlayButton';
import PassButton from './components/game/PassButton';
import Turn from './components/game/Turn';
import PlayerList from './components/game/PlayerList';
import { startGame, joinGame, openPlayerStateSocket, playCards, playPass, exitGame } from './api/game';
import { startLobby, joinLobby, exitLobby, updateLobby, openLobbyStateSocket, sendLobbyMessage } from './api/lobby';
import type { LobbyState, PlayerState } from './president-client/types';
import { sortHand } from './president-client/card';
import MessageDisplay from './components/game/MessageDisplay';
import LobbyHome from './components/lobby/LobbyHome';
import LobbyRoom from './components/lobby/LobbyRoom';

import { getSocketHandler, type SocketHandler } from './api/socket-handler';

type Screen = 'home' | 'lobby-room' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [chosenHand, setChosenHand] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [lobbyUserId, setLobbyUserId] = useState<string>('');
  const [chatPreview, setChatPreview] = useState<{ name: string; text: string } | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const lobbyIdRef = useRef<string>('');
  const lobbyUserIdRef = useRef<string>('');
  const userNameRef = useRef<string>('');
  const gameIdRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const lobbyWsRef = useRef<SocketHandler | null>(null);
  const gameWsRef = useRef<SocketHandler | null>(null);

  const handleStartGame = async () => {
    if (!lobbyState) throw new Error('Cannot start game: no lobby state');

    const { gameId } = await startGame(lobbyIdRef.current, lobbyState.users);
    const { playerId } = await joinGame(gameId, lobbyUserIdRef.current);
    if (!playerId) throw new Error('Join failed: no playerId returned');

    gameIdRef.current = gameId;
    playerIdRef.current = playerId;

    gameWsRef.current = getSocketHandler(
      () => openPlayerStateSocket(gameId, playerId),
      (data) => setPlayerState(JSON.parse(data) as PlayerState),
    );

    await updateLobby(lobbyIdRef.current, lobbyUserIdRef.current, { gameId, status: 'in-game' });
    lastMessageCountRef.current = lobbyState.messages.length;
    setChatPreview(null);
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
    if (result.error) return result.error;
    if (!result.lobbyUserId) return 'Unknown error joining lobby.';
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
    const result = await startLobby(name);
    if (result.error || !result.lobbyId || !result.lobbyUserId) return;
    const { lobbyId, lobbyUserId } = result;
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
      (data) => setPlayerState(JSON.parse(data) as PlayerState),
    );

    lastMessageCountRef.current = lobbyState?.messages.length ?? 0;
    setChatPreview(null);
    // Show the game screen. There may be a delay before we receive the first player state update but it will populate once we do.
    setScreen('game');
  };

  const handleQuitGame = async () => {
    if (playerState?.gameStatus !== 'GAME_OVER' && gameIdRef.current && playerIdRef.current) {
      await exitGame(gameIdRef.current, playerIdRef.current);
    }
    gameWsRef.current?.close();
    gameWsRef.current = null;
    playerIdRef.current = null;
    gameIdRef.current = null;
    setPlayerState(null);
    await handleExitLobby();
  };

  const applyLobbyState = (newLobbyState: LobbyState) => {
    setLobbyState(newLobbyState);

    // When lobbyState.status changes to "in-game", attempt to join the game and then switch to displaying the game screen.
    // If playerId isn't set we know we haven't joined the game yet.
    if (!playerIdRef.current && newLobbyState.status === 'in-game' && newLobbyState.gameId) {
      handleJoinGame(newLobbyState.gameId, lobbyUserIdRef.current);
    }

    // When the lobby is reset to 'closed' while in-game, all players are forced quit game.
    if (playerIdRef.current && newLobbyState.status === 'closed') {
      handleQuitGame();
    }

    if (playerIdRef.current
      && newLobbyState.messages.length > lastMessageCountRef.current
      && newLobbyState.messages[newLobbyState.messages.length - 1].lobbyUserId !== lobbyUserIdRef.current
    ) {
      const latest = newLobbyState.messages[newLobbyState.messages.length - 1];
      setChatPreview({ name: latest.userName, text: latest.text });
    }
    lastMessageCountRef.current = newLobbyState.messages.length;
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

  if (screen === 'game') {
    if (!playerState) return null;
    return (
      <div style={{ width: '100vw', height: '100dvh', background: '#2d6a2d', padding: '8px', paddingTop: 0, paddingBottom: 'max(4px, env(safe-area-inset-bottom))', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.35)', marginLeft: '-8px', marginRight: '-8px', paddingLeft: '8px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px', flexShrink: 0, gap: '8px' }}>
          {chatPreview && (
            <div
              onClick={() => { setScreen('lobby-room'); setChatPreview(null); }}
              style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}
            >
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#3498db', whiteSpace: 'nowrap', flexShrink: 0 }}>{chatPreview.name}:</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chatPreview.text}</span>
            </div>
          )}
          <button
            onClick={() => { setScreen('lobby-room'); setChatPreview(null); }}
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
            activePlayerNumber={playerState.activePlayerNumber}
            isMobile={isMobile}
          />
          <Turn
            isMyTurn={playerState.playerNumber === playerState.activePlayerNumber}
            activePlayerName={playerState.opponents.find((o) => o.playerNumber === playerState.activePlayerNumber)?.playerName ?? playerState.playerName}
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
              onClick={handleQuitGame}
              style={{ padding: '12px 32px', fontSize: '16px', fontWeight: '900', letterSpacing: '1px', background: '#c0392b', color: 'white', border: '2px solid #922b21', borderRadius: '8px', cursor: 'pointer', boxShadow: '2px 2px 6px rgba(0,0,0,0.4)' }}
            >
              EXIT GAME
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <PlayButton onClick={handlePlay} disabled={chosenHand.length === 0 || playerState.activePlayerNumber !== playerState.playerNumber} />
              <PassButton onClick={handlePass} disabled={playerState.playerNumber !== playerState.activePlayerNumber || chosenHand.length > 0} />
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default App;
