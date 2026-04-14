import { DurableObject } from 'cloudflare:workers';

const ALARM_TTL_MS = 60 * 60 * 1000; // 1 hour

export abstract class BaseDurableObject<TAttachment> extends DurableObject<Env> {
  protected sessions: Map<WebSocket, TAttachment> = new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment() as TAttachment | null;
      if (attachment) {
        this.sessions.set(ws, attachment);
      }
    });

    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  // Hook for subclasses to react to a WebSocket disconnecting.
  protected async onWebSocketDisconnected(attachment: TAttachment): Promise<void> {}

  protected async resetAlarm(): Promise<void> {
    // An alarm will be set for 1 hour after any activity. This ensures that if the DO becomes idle
    // (e.g. all games finish and all clients disconnect) it will eventually be cleaned up and free resources.
    await this.ctx.storage.setAlarm(Date.now() + ALARM_TTL_MS);
  }

  async alarm(): Promise<void> {
    // As long as no one is connected to the state websocket, we can assume this DO is idle and clean up all state to free resources.
    // If there are active connections, reset the alarm to check again in the future.
    if (this.ctx.getWebSockets().length === 0) {
      await this.ctx.storage.deleteAll();
    } else {
      await this.resetAlarm();
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Interactions happen via HTTP POST, not WebSocket messages.
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const attachment = this.sessions.get(ws);
    this.sessions.delete(ws);
    if (attachment) await this.onWebSocketDisconnected(attachment);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
    const attachment = this.sessions.get(ws);
    this.sessions.delete(ws);
    ws.close(1011, 'WebSocket error');
    if (attachment) await this.onWebSocketDisconnected(attachment);
  }
}
