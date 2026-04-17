// Lobby types

export interface LobbyUser {
  id: string;
  name: string;
  joinedAt?: number;
  isHost: boolean;
  isDisconnected: boolean;
}

export interface LobbyMessage {
  id: string;
  lobbyUserId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface LobbyState {
  lobbyId: string;
  users: LobbyUser[];
  messages: LobbyMessage[];
  gameId?: string;
  status: 'waiting' | 'in-game' | 'closed';
}

// Lobby response types

export interface StartLobbyResponse {
  lobbyId?: string;
  lobbyUserId?: string;
  error?: string;
}

export interface JoinLobbyResponse {
  lobbyUserId?: string;
  error?: string;
}

export interface ExitLobbyResponse extends Partial<LobbyState> {
  error?: string;
}

export interface SendMessageResponse extends Partial<LobbyState> {
  error?: string;
}

export interface UpdateLobbyResponse extends Partial<LobbyState> {
  error?: string;
}

// Game response types

export interface StartGameResponse {
  gameId: string;
}

export interface JoinGameResponse {
  playerId: string | null;
}

export interface PlayResponse {
  isValid: boolean;
  invalidCode?: string;
  invalidMessageShort?: string;
  invalidMessageLong?: string;
}

// Player state types

export type DrinkingReason = 'passed' | 'social' | 'skipped';

export interface OpponentPlayerState {
  playerNumber: number;
  playerName: string;
  numCards: number;
  isDisconnected: boolean;
  winPosition: number | null;
  isDrinking: boolean;
}

export interface PlayerState {
  playerId: string;
  playerNumber: number;
  playerName: string;
  playerHand: string[];
  activeHand: string[];
  discard: string[][];
  timestamp: string;
  opponents: OpponentPlayerState[];
  activePlayerNumber: number;
  playerWinPosition: number | null;
  gameStatus: 'PLAYING' | 'GAME_OVER';
  isDrinking: boolean;
  drinkingReason: DrinkingReason | null;
}
