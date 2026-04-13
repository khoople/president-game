// Lobby types

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

// Player state types

export interface OpponentPlayerState {
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
  opponents: OpponentPlayerState[];
  activePlayerNumber: number;
}
