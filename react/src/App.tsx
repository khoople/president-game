import { useEffect, useRef, useState } from 'react';
import { startGame, joinGame, openPlayerStateSocket, playCards, playPass, playDrink, exitGame } from './api/game';
import { startLobby, joinLobby, exitLobby, updateLobby, openLobbyStateSocket, sendLobbyMessage } from './api/lobby';
import type { DrinkingReason, LobbyState, PlayerState } from './president-client/types';
import Drink from './components/game/Drink';
import GameScreen from './components/game/GameScreen';
import LobbyHome from './components/lobby/LobbyHome';
import LobbyRoom from './components/lobby/LobbyRoom';

import { getSocketHandler, type SocketHandler } from './api/socket-handler';

type Screen = 'home' | 'lobby-room' | 'game' | 'drink';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [lobbyUserId, setLobbyUserId] = useState<string>('');
  const [chatPreview, setChatPreview] = useState<{ name: string; text: string } | null>(null);
  const [drinkingReason, setDrinkingReason] = useState<DrinkingReason | null>(null);
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

  useEffect(() => {
    if (playerState?.isDrinking && playerState.drinkingReason && screen !== 'drink') {
      setDrinkingReason(playerState.drinkingReason);
      setScreen('drink');
    }
  }, [playerState?.isDrinking, playerState?.drinkingReason]);

  const handlePlayCards = async (chosenHand: string[]): Promise<string | null> => {
    if (!gameIdRef.current || !playerIdRef.current) return null;
    const result = await playCards(gameIdRef.current, playerIdRef.current, chosenHand);
    return result.isValid ? null : (result.invalidMessageLong ?? 'Invalid play.');
  };

  const handlePassCards = async (): Promise<string | null> => {
    if (!gameIdRef.current || !playerIdRef.current) return null;
    const result = await playPass(gameIdRef.current, playerIdRef.current);
    return result.isValid ? null : (result.invalidMessageLong ?? 'Cannot pass.');
  };

  const handleReturnToLobby = () => {
    setChatPreview(null);
    setScreen('lobby-room');
  };

  const handleDoneDrinking = () => {
    if (gameIdRef.current && playerIdRef.current) playDrink(gameIdRef.current, playerIdRef.current);
    setScreen('game');
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

  if (screen === 'drink') {
    return <Drink onClose={handleDoneDrinking} drinkingReason={drinkingReason!} />;
  }

  if (screen === 'game') {
    if (!playerState) return null;
    return (
      <GameScreen
        playerState={playerState}
        isMobile={isMobile}
        chatPreview={chatPreview}
        onReturnToLobby={handleReturnToLobby}
        onPlay={handlePlayCards}
        onPass={handlePassCards}
        onQuit={handleQuitGame}
      />
    );
  }
}

export default App;
