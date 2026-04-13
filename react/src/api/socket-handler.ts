export type SocketHandler = { close: () => void };

export function getSocketHandler(
  createSocket: () => WebSocket,
  onMessage: (data: string) => void,
): SocketHandler {
  let cancelled = false;
  let ws: WebSocket | null = null;
  let attempt = 0;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    if (cancelled) return;
    ws = createSocket();
    ws.onopen = () => { attempt = 0; };
    ws.onmessage = (event) => onMessage(event.data as string);
    ws.onerror = () => ws?.close();
    ws.onclose = (event) => {
      if (cancelled || event.code === 1000) return;
      const delay = Math.min(500 * 2 ** attempt, 30000);
      attempt++;
      retryTimeout = setTimeout(connect, delay);
    };
  }

  connect();

  return {
    close() {
      cancelled = true;
      if (retryTimeout !== null) clearTimeout(retryTimeout);
      ws?.close(1000, 'Closed by client');
    },
  };
}
