import API_BASE_URL from '../config';
export type { LobbyUser, LobbyMessage, LobbyState } from '../president-client/types';
import type {
  LobbyState,
  StartLobbyResponse,
  JoinLobbyResponse,
  ExitLobbyResponse,
  SendMessageResponse,
  UpdateLobbyResponse,
  KickUserResponse,
  SetVoiceStatusResponse,
  RtcSignal,
  IceServersResponse,
} from '../president-client/types';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function startLobby(userName: string): Promise<StartLobbyResponse> {
  return postJson('/lobby/start', { userName });
}

export async function joinLobby(lobbyId: string, userName: string): Promise<JoinLobbyResponse> {
  return postJson('/lobby/join', { lobbyId, userName });
}

export async function exitLobby(lobbyId: string, lobbyUserId: string): Promise<ExitLobbyResponse> {
  return postJson('/lobby/exit', { lobbyId, lobbyUserId });
}

export async function sendLobbyMessage(lobbyId: string, lobbyUserId: string, userName: string, text: string): Promise<SendMessageResponse> {
  return postJson('/lobby/message', { lobbyId, lobbyUserId, userName, text });
}

export async function updateLobby(lobbyId: string, lobbyUserId: string, updates: { status?: LobbyState['status']; gameId?: string }): Promise<UpdateLobbyResponse> {
  return postJson('/lobby/update', { lobbyId, lobbyUserId, ...updates });
}

export async function kickUser(lobbyId: string, lobbyUserId: string, targetUserId: string): Promise<KickUserResponse> {
  return postJson('/lobby/kick', { lobbyId, lobbyUserId, targetUserId });
}

export async function setVoiceStatus(lobbyId: string, lobbyUserId: string, inVoice: boolean): Promise<SetVoiceStatusResponse> {
  return postJson('/lobby/voice', { lobbyId, lobbyUserId, inVoice });
}

export async function sendRtcSignal(lobbyId: string, fromUserId: string, toUserId: string, signal: RtcSignal): Promise<{ delivered: boolean }> {
  return postJson('/lobby/signal', { lobbyId, fromUserId, toUserId, signal });
}

export async function fetchIceServers(): Promise<IceServersResponse> {
  const res = await fetch(`${API_BASE_URL}/voice/ice-servers`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<IceServersResponse>;
}

export function openLobbyStateSocket(lobbyId: string, lobbyUserId: string): WebSocket {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return new WebSocket(`${wsBase}/lobby/lobby-state?lobbyId=${lobbyId}&lobbyUserId=${lobbyUserId}`);
}
