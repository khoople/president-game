export interface LobbyUser {
  id: string;
  name: string;
  joinedAt?: number;
  isHost: boolean;
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
  status: 'waiting' | 'in-game' | 'ended';
}

export interface GetLobbyStateInterface {
  (lobbyId: string): Promise<LobbyState | null>;
}

export interface SaveLobbyStateInterface {
  (lobbyId: string, lobbyState: LobbyState): Promise<void>;
}

export interface BroadcastLobbyStateInterface {
  (lobbyId: string, lobbyState: LobbyState): Promise<void>;
}

export interface SendPlayerStateInterface {
  (playerId: string, state: PlayerState): Promise<void>;
}

export interface GetGameStateInterface {
  (gameId: string): Promise<GameState | null>;
}

export interface SaveGameStateInterface {
  (gameId: string, gameState: GameState): Promise<void>;
}

export interface PlayResponseInterface {
  isValid: boolean;
  invalidCode?: string;
  invalidMessageShort?: string;
  invalidMessageLong?: string;
}

export interface StartGameResponseInterface {
  gameId: string;
}

export interface JoinGameResponseInterface {
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
}

export interface GameState {
  id: string;
  lobbyId: string;
  players: Player[];
  discard: string[][];
  activeHand: string[];
  activePlayerNumber: number;
  activeHandPlayedBy: number | null;
}

export interface Opponent {
  playerNumber: number;
  playerName: string;
  numCards: number;
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
}

export interface Play {
  gameId: string;
  playerId: string;
  action: string;
  chosenHand: string[];
  targetPlayerNumber?: number;
}
