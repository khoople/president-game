export type SocketHandler = { close: () => void };

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

export function getSocketHandler(
  createSocket: () => WebSocket,
  onMessage: (data: string) => void,
): SocketHandler {
  let cancelled = false;
  let ws: WebSocket | null = null;
  let attempt = 0;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

  // Send "ping" to websocket periodically to detect if connection is lost, and
  // attempt to reconnect if no "pong" response is received within the timeout period.
  function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send('ping');
        heartbeatTimeout = setTimeout(() => {
          ws?.close();
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatInterval !== null) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    if (heartbeatTimeout !== null) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
  }

  function connect() {
    if (cancelled) return;
    ws = createSocket();
    ws.onopen = () => {
      attempt = 0;
      startHeartbeat();
    };
    ws.onmessage = (event) => {
      if (event.data === 'pong') {
        if (heartbeatTimeout !== null) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
        return;
      }
      onMessage(event.data as string);
    };
    ws.onerror = () => ws?.close();
    ws.onclose = (event) => {
      stopHeartbeat();
      if (cancelled || event.code === 1000) return;
      const delay = Math.min(500 * 2 ** attempt, 30000);
      attempt++;
      retryTimeout = setTimeout(connect, delay);
    };
  }

  // On mobile devices if screen is locked or user switches to another app, the WebSocket connection
  // may stop receieving state updates. Attempt to reconnect when the user returns to the page.
  function onVisible() {
    if (cancelled || document.visibilityState !== 'visible') return;
    stopHeartbeat();
    if (retryTimeout !== null) { clearTimeout(retryTimeout); retryTimeout = null; }
    if (ws !== null) {
      const prev = ws;
      ws = null;
      prev.onclose = null;
      try { prev.close(); } catch (_) {}
    }
    attempt = 0;
    connect();
  }

  document.addEventListener('visibilitychange', onVisible);

  connect();

  return {
    close() {
      cancelled = true;
      stopHeartbeat();
      document.removeEventListener('visibilitychange', onVisible);
      if (retryTimeout !== null) clearTimeout(retryTimeout);
      ws?.close(1000, 'Closed by client');
    },
  };
}
