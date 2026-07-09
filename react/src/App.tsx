import { useEffect, useReducer, useRef, useState } from 'react';
import { startGame, joinGame, openPlayerStateSocket, exitGame, startNextRound } from './api/game';
import { exitLobby, updateLobby, openLobbyStateSocket, sendLobbyMessage, kickUser, setVoiceStatus, sendRtcSignal, fetchIceServers } from './api/lobby';
import type { DrinkingReason, LobbyState, PlayerState, RtcSignalMessage } from './president-client/types';
import { VoiceChatManager } from './president-client/voice';
import Drink from './components/game/Drink';
import GameScreen from './components/game/GameScreen';
import LobbyHome from './components/lobby/LobbyHome';
import LobbyRoom from './components/lobby/LobbyRoom';
import { getSocketHandler, type SocketHandler } from './api/socket-handler';

type Screen = 'home' | 'lobby-room' | 'game' | 'drink';

type State = {
  screen: Screen;
  lobbyState: LobbyState | null;
  playerState: PlayerState | null;
  lobbyUserId: string | null;
  gameId: string | null;
  chatPreview: { name: string; text: string } | null;
  drinkingReason: DrinkingReason | null;
};

const initialState: State = {
  screen: 'home',
  lobbyState: null,
  playerState: null,
  lobbyUserId: null,
  gameId: null,
  chatPreview: null,
  drinkingReason: null,
};

type Action =
  | { type: 'LOBBY_JOINED'; lobbyUserId: string }
  | { type: 'LOBBY_EXITED' }
  | { type: 'LOBBY_STATE_RECEIVED'; lobbyState: LobbyState }
  | { type: 'LOBBY_ROOM_SHOWN' }
  | { type: 'GAME_JOINED'; gameId: string }
  | { type: 'GAME_SCREEN_SHOWN' }
  | { type: 'PLAYER_STATE_RECEIVED'; playerState: PlayerState }
  | { type: 'GAME_EXITED' }
  | { type: 'CHAT_PREVIEW_SHOWN'; name: string; text: string }
  | { type: 'DRINK_STARTED'; reason: DrinkingReason };

function handleStateUpdate(state: State, action: Action): State {
  switch (action.type) {
    case 'LOBBY_JOINED':
      return { ...state, screen: 'lobby-room', lobbyUserId: action.lobbyUserId };
    case 'LOBBY_EXITED':
      return initialState;
    case 'LOBBY_STATE_RECEIVED':
      return { ...state, lobbyState: action.lobbyState };
    case 'LOBBY_ROOM_SHOWN':
      return { ...state, screen: 'lobby-room', chatPreview: null };
    case 'GAME_JOINED':
      return { ...state, gameId: action.gameId };
    case 'GAME_SCREEN_SHOWN':
      return { ...state, screen: 'game', chatPreview: null };
    case 'PLAYER_STATE_RECEIVED':
      return { ...state, playerState: action.playerState };
    case 'GAME_EXITED':
      return { ...state, playerState: null, gameId: null };
    case 'CHAT_PREVIEW_SHOWN':
      return { ...state, chatPreview: { name: action.name, text: action.text } };
    case 'DRINK_STARTED':
      return { ...state, screen: 'drink', drinkingReason: action.reason };
  }
}

function App() {
  const [state, updateState] = useReducer(handleStateUpdate, initialState);
  const { screen, lobbyState, playerState, lobbyUserId, gameId, chatPreview, drinkingReason } = state;
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const lastMessageCountRef = useRef<number>(0);
  const lobbyIdRef = useRef<string>('');
  const userNameRef = useRef<string>('');
  const gameIdRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const lobbyWsRef = useRef<SocketHandler | null>(null);
  const gameWsRef = useRef<SocketHandler | null>(null);
  const voiceRef = useRef<VoiceChatManager | null>(null);
  const [voiceUi, setVoiceUi] = useState({ joined: false, muted: false });

  const handleStartGame = async () => {
    if (!lobbyState || !lobbyUserId) throw new Error('Cannot start game: no lobby state');

    const { gameId } = await startGame(lobbyIdRef.current, lobbyState.users);
    const { playerId } = await joinGame(gameId, lobbyUserId);
    if (!playerId) throw new Error('Join failed: no playerId returned');

    gameIdRef.current = gameId;
    playerIdRef.current = playerId;

    gameWsRef.current = getSocketHandler(
      () => openPlayerStateSocket(gameId, playerId),
      (data) => updateState({ type: 'PLAYER_STATE_RECEIVED', playerState: JSON.parse(data) as PlayerState }),
    );

    await updateLobby(lobbyIdRef.current, lobbyUserId, { gameId, status: 'in-game' });
    lastMessageCountRef.current = lobbyState.messages.length;
    updateState({ type: 'GAME_JOINED', gameId });
    updateState({ type: 'GAME_SCREEN_SHOWN' });
  };

  const connectToLobbySocket = (lobbyId: string, userId: string) => {
    lobbyWsRef.current?.close();
    lobbyWsRef.current = getSocketHandler(
      () => openLobbyStateSocket(lobbyId, userId),
      (data) => {
        const parsed = JSON.parse(data) as LobbyState | RtcSignalMessage;
        if ('type' in parsed && parsed.type === 'rtc-signal') {
          voiceRef.current?.handleSignal(parsed.from, parsed.signal);
          return;
        }
        applyLobbyState(parsed as LobbyState, userId);
      },
    );
  };

  const teardownVoice = () => {
    voiceRef.current?.leave();
    voiceRef.current = null;
    setVoiceUi({ joined: false, muted: false });
  };

  const handleJoinVoice = async (userId: string) => {
    if (voiceRef.current?.joined) return;
    const manager = new VoiceChatManager(
      userId,
      (toUserId, signal) => sendRtcSignal(lobbyIdRef.current, userId, toUserId, signal).catch(() => {}),
      async () => (await fetchIceServers()).iceServers,
    );
    try {
      await manager.join();
    } catch (e) {
      console.error('Unable to join voice chat:', e);
      return;
    }
    voiceRef.current = manager;
    setVoiceUi({ joined: true, muted: false });
    await setVoiceStatus(lobbyIdRef.current, userId, true);
  };

  const handleLeaveVoice = (userId: string) => {
    teardownVoice();
    setVoiceStatus(lobbyIdRef.current, userId, false).catch(() => {});
  };

  const handleToggleMute = () => {
    setVoiceUi((prev) => {
      voiceRef.current?.setMuted(!prev.muted);
      return { ...prev, muted: !prev.muted };
    });
  };

  const handleExitLobby = async () => {
    teardownVoice();
    // Disconnect from websocket first to avoid receiving updates while we're in the process of exiting.
    lobbyWsRef.current?.close();
    lobbyWsRef.current = null;

    localStorage.removeItem(`lobby-user-id-${lobbyIdRef.current}-${userNameRef.current}`);
    const isHost = lobbyState?.users.find((u) => u.id === lobbyUserId)?.isHost ?? false;
    if (lobbyUserId) {
      if (isHost) {
        await updateLobby(lobbyIdRef.current, lobbyUserId, { status: 'closed' });
      } else {
        await exitLobby(lobbyIdRef.current, lobbyUserId);
      }
    }
    lobbyIdRef.current = '';
    updateState({ type: 'LOBBY_EXITED' });
  };

  const handleLobbyEntered = ({ lobbyId, userName, lobbyUserId }: { lobbyId: string; userName: string; lobbyUserId: string }) => {
    lobbyIdRef.current = lobbyId;
    userNameRef.current = userName;
    connectToLobbySocket(lobbyId, lobbyUserId);
    updateState({ type: 'LOBBY_JOINED', lobbyUserId });
  };

  const handleJoinGame = async (gameId: string, userId: string) => {
    const { playerId } = await joinGame(gameId, userId);
    if (!playerId) {
      throw new Error('Unable to join game: no playerId returned');
    }

    gameIdRef.current = gameId;
    playerIdRef.current = playerId;

    gameWsRef.current = getSocketHandler(
      () => openPlayerStateSocket(gameId, playerId),
      (data) => updateState({ type: 'PLAYER_STATE_RECEIVED', playerState: JSON.parse(data) as PlayerState }),
    );

    lastMessageCountRef.current = lobbyState?.messages.length ?? 0;
    // Show the game screen. There may be a delay before we receive the first player state update but it will populate once we do.
    updateState({ type: 'GAME_JOINED', gameId });
    updateState({ type: 'GAME_SCREEN_SHOWN' });
  };

  const handleNextRound = async () => {
    if (!gameIdRef.current || !playerIdRef.current) return;
    await startNextRound(gameIdRef.current, playerIdRef.current);
  };

  const handleQuitGame = async () => {
    if (playerState?.gameStatus !== 'GAME_OVER' && gameIdRef.current && playerIdRef.current) {
      await exitGame(gameIdRef.current, playerIdRef.current);
    }
    gameWsRef.current?.close();
    gameWsRef.current = null;
    playerIdRef.current = null;
    gameIdRef.current = null;
    updateState({ type: 'GAME_EXITED' });
    await handleExitLobby();
  };

  const handleKicked = () => {
    teardownVoice();
    lobbyWsRef.current?.close();
    lobbyWsRef.current = null;
    gameWsRef.current?.close();
    gameWsRef.current = null;
    playerIdRef.current = null;
    gameIdRef.current = null;
    localStorage.removeItem(`lobby-user-id-${lobbyIdRef.current}-${userNameRef.current}`);
    lobbyIdRef.current = '';
    updateState({ type: 'LOBBY_EXITED' });
  };

  const applyLobbyState = (newLobbyState: LobbyState, myLobbyUserId: string) => {
    if (!newLobbyState.users.some((u) => u.id === myLobbyUserId)) {
      handleKicked();
      return;
    }

    updateState({ type: 'LOBBY_STATE_RECEIVED', lobbyState: newLobbyState });

    // When lobbyState.status changes to "in-game", attempt to join the game and then switch to displaying the game screen.
    // If playerId isn't set we know we haven't joined the game yet.
    if (!playerIdRef.current && newLobbyState.status === 'in-game' && newLobbyState.gameId) {
      handleJoinGame(newLobbyState.gameId, myLobbyUserId);
    }

    // When the lobby is reset to 'closed' while in-game, all players are forced quit game.
    if (playerIdRef.current && newLobbyState.status === 'closed') {
      handleQuitGame();
    }

    if (playerIdRef.current
      && newLobbyState.messages.length > lastMessageCountRef.current
      && newLobbyState.messages[newLobbyState.messages.length - 1].lobbyUserId !== myLobbyUserId
    ) {
      const latest = newLobbyState.messages[newLobbyState.messages.length - 1];
      updateState({ type: 'CHAT_PREVIEW_SHOWN', name: latest.userName, text: latest.text });
    }
    lastMessageCountRef.current = newLobbyState.messages.length;

    if (voiceRef.current?.joined) {
      const me = newLobbyState.users.find((u) => u.id === myLobbyUserId);
      if (me && !me.inVoice) {
        setVoiceStatus(lobbyIdRef.current, myLobbyUserId, true).catch(() => {});
      }
      voiceRef.current.reconcile(
        newLobbyState.users.filter((u) => u.inVoice && u.id !== myLobbyUserId).map((u) => u.id),
      );
    }
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      lobbyWsRef.current?.close();
      gameWsRef.current?.close();
      voiceRef.current?.leave();
      voiceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (playerState?.isDrinking && playerState.drinkingReason && screen !== 'drink') {
      updateState({ type: 'DRINK_STARTED', reason: playerState.drinkingReason });
    }
  }, [playerState?.isDrinking, playerState?.drinkingReason]);

  // Home screen with options to create or join a lobby.
  if (screen === 'home') {
    return <LobbyHome onLobbyEntered={handleLobbyEntered} />;
  }

  if (screen === 'lobby-room' && lobbyState && lobbyUserId) {
    return (
      <LobbyRoom
        lobbyState={lobbyState}
        lobbyUserId={lobbyUserId}
        onStart={handleStartGame}
        onEndGame={handleQuitGame}
        onExitLobby={handleExitLobby}
        onReturnToGame={() => updateState({ type: 'GAME_SCREEN_SHOWN' })}
        onQuitGame={handleQuitGame}
        onSendMessage={(text) => {
          const user = lobbyState.users.find((u) => u.id === lobbyUserId);
          if (user) sendLobbyMessage(lobbyIdRef.current, lobbyUserId, user.name, text);
        }}
        onKickUser={(targetUserId) => kickUser(lobbyIdRef.current, lobbyUserId, targetUserId)}
        inVoice={voiceUi.joined}
        isMuted={voiceUi.muted}
        onJoinVoice={() => handleJoinVoice(lobbyUserId)}
        onLeaveVoice={() => handleLeaveVoice(lobbyUserId)}
        onToggleMute={handleToggleMute}
      />
    );
  }

  if (screen === 'drink' && drinkingReason && gameId && playerState) {
    return (
      <Drink
        drinkingReason={drinkingReason}
        gameId={gameId}
        playerId={playerState.playerId}
        onClose={() => updateState({ type: 'GAME_SCREEN_SHOWN' })}
      />
    );
  }

  if (screen === 'game') {
    if (!playerState || !gameId) return null;
    const isHost = lobbyState?.users.find((u) => u.id === lobbyUserId)?.isHost ?? false;
    return (
      <GameScreen
        playerState={playerState}
        gameId={gameId}
        isMobile={isMobile}
        chatPreview={chatPreview}
        isHost={isHost}
        onReturnToLobby={() => updateState({ type: 'LOBBY_ROOM_SHOWN' })}
        onQuit={handleQuitGame}
        onNextRound={handleNextRound}
      />
    );
  }
}

export default App;
