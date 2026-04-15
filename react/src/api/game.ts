import API_BASE_URL from '../config';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function startGame(lobbyId: string, lobbyUsers: { id: string; name: string; isHost: boolean }[]): Promise<{ gameId: string }> {
  return postJson('/game/start', { lobbyId, lobbyUsers });
}

export async function joinGame(gameId: string, lobbyUserId: string): Promise<{ playerId: string | null }> {
  return postJson('/game/join', { gameId, lobbyUserId });
}

export function openPlayerStateSocket(gameId: string, playerId: string): WebSocket {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return new WebSocket(`${wsBase}/game/player-state?gameId=${gameId}&playerId=${playerId}`);
}

export async function playCards(gameId: string, playerId: string, chosenHand: string[]): Promise<{ isValid: boolean; invalidMessageLong?: string }> {
  return postJson('/game/play', { gameId, playerId, action: 'PLAY', chosenHand });
}

export async function playPass(gameId: string, playerId: string): Promise<{ isValid: boolean; invalidMessageLong?: string }> {
  return postJson('/game/play', { gameId, playerId, action: 'PASS' });
}

export async function exitGame(gameId: string, playerId: string): Promise<void> {
  await postJson('/game/exit', { gameId, playerId });
}
