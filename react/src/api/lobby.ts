import API_BASE_URL from '../config';
export type { LobbyUser, LobbyMessage, LobbyState } from '../president-client/types';
import type { LobbyState } from '../president-client/types';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function joinLobby(lobbyId: string, userName: string): Promise<{ lobbyUserId: string } | { error: string }> {
  const res = await fetch(`${API_BASE_URL}/lobby/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId, userName }),
  });
  return res.json();
}

export async function exitLobby(lobbyId: string, lobbyUserId: string): Promise<LobbyState> {
  return postJson('/lobby/exit', { lobbyId, lobbyUserId });
}

export async function startLobby(userName: string): Promise<{ lobbyId: string; lobbyUserId: string }> {
  return postJson('/lobby/start', { userName });
}

export async function sendLobbyMessage(lobbyId: string, lobbyUserId: string, userName: string, text: string): Promise<LobbyState> {
  return postJson('/lobby/message', { lobbyId, lobbyUserId, userName, text });
}

export async function updateLobby(lobbyId: string, lobbyUserId: string, updates: { status?: LobbyState['status']; gameId?: string }): Promise<LobbyState> {
  return postJson('/lobby/update', { lobbyId, lobbyUserId, ...updates });
}

export function openLobbyStateSocket(lobbyId: string, lobbyUserId: string): WebSocket {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return new WebSocket(`${wsBase}/lobby/lobby-state?lobbyId=${lobbyId}&lobbyUserId=${lobbyUserId}`);
}
