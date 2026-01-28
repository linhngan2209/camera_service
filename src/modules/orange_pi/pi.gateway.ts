import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { PiService } from './pi.service';

@WebSocketGateway({
  path: '/ws/pi',
  cors: { origin: '*' },
})
export class PiGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly piService: PiService) {}

  handleConnection(client: WebSocket) {

    let piId: string | null = null;

    client.on('message', async (raw: Buffer) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'register') {
          piId = data.id;
          if (piId) {
            await this.piService.register(piId);
            console.log(`📡 Pi registered: ${piId}`);
          }
        }

        if (data.type === 'PING') {
          if (!piId && data.pi_id) {
            piId = data.pi_id; 
          }

          if (!piId) return;

          await this.piService.heartbeat(piId);

          client.send(
            JSON.stringify({
              type: 'PONG',
            }),
          );
        }
      } catch (e) {
      }
    });

    client.on('close', async () => {

      if (piId) {
        await this.piService.offline(piId);
      }
    });
  }
}
