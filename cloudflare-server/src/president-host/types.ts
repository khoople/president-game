export interface LobbyUser {
  id: string;
  name: string;
  joinedAt?: number;
  isHost: boolean;
  isDisconnected: boolean;
  inVoice: boolean;
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

export interface GetLobbyState {
  (lobbyId: string): Promise<LobbyState | null>;
}

export interface SaveLobbyState {
  (lobbyId: string, lobbyState: LobbyState): Promise<void>;
}

export interface SendLobbyState {
  (lobbyId: string, lobbyState: LobbyState): Promise<void>;
}

export interface SendPlayerState {
  (playerId: string, state: PlayerState): Promise<void>;
}

export interface GetGameState {
  (gameId: string): Promise<GameState | null>;
}

export interface SaveGameState {
  (gameId: string, gameState: GameState): Promise<void>;
}

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

export interface KickUserResponse extends Partial<LobbyState> {
  error?: string;
}

export interface SetVoiceStatusResponse extends Partial<LobbyState> {
  error?: string;
}

export type DrinkingReason = 'passed' | 'social' | 'skipped';

export type PlayerMessageClass = 'notice' | 'danger' | 'success';

export interface PlayResponse {
  isValid: boolean;
  invalidCode?: string;
  invalidMessageShort?: string;
  invalidMessageLong?: string;
}

export interface StartGameResponse {
  gameId: string;
}

export interface JoinGameResponse {
  playerId: string | null;
}

export interface Player {
  playerId: string;
  lobbyUserId: string;
  playerNumber: number;
  playerName: string;
  isHost: boolean;
  hasJoined: boolean;
  hand: string[];
  isDisconnected: boolean;
  winPosition: number | null;
  isDrinking: boolean;
  drinkingReason: DrinkingReason | null;
}

export interface GameState {
  id: string;
  lobbyId: string;
  players: Player[];
  discard: string[][];
  activeHand: string[];
  activePlayerNumber: number;
  activeHandPlayedBy: number | null;
  status: 'PLAYING' | 'GAME_OVER';
  gameMessage: string;
}

export interface Opponent {
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
  opponents: Opponent[];
  activePlayerNumber: number;
  playerWinPosition: number | null;
  gameStatus: 'PLAYING' | 'GAME_OVER';
  isDrinking: boolean;
  drinkingReason: DrinkingReason | null;
  gameMessage: string;
  playerMessage: string;
  playerMessageClass: PlayerMessageClass;
}

export interface Play {
  gameId: string;
  playerId: string;
  action: string;
  chosenHand: string[];
  targetPlayerNumber?: number;
}
