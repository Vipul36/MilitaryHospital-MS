import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface RealtimeEventPayload {
  type: 'BED_UPDATE' | 'APPOINTMENT_UPDATED' | 'INVENTORY_ALERT' | 'LAB_REPORT_COMPLETED' | 'SYSTEM_NOTIFICATION';
  timestamp: string;
  data: Record<string, any>;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer | null = null;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (socket: WebSocket) => {
      // Send welcome handshake
      const welcomeMsg: RealtimeEventPayload = {
        type: 'SYSTEM_NOTIFICATION',
        timestamp: new Date().toISOString(),
        data: { message: 'Connected to MHSHMS Real-time Data Sync Feed' }
      };
      socket.send(JSON.stringify(welcomeMsg));

      socket.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'PING') {
            socket.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch {
          // ignore malformed client messages
        }
      });
    });

    console.log('[WebSocketService] WebSocket Server initialized at /ws');
  }

  public broadcast(type: RealtimeEventPayload['type'], data: Record<string, any>): void {
    if (!this.wss) return;

    const payload: RealtimeEventPayload = {
      type,
      timestamp: new Date().toISOString(),
      data
    };

    const message = JSON.stringify(payload);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public getConnectedClientsCount(): number {
    if (!this.wss) return 0;
    return this.wss.clients.size;
  }
}

export const wsService = WebSocketService.getInstance();
