import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PiService } from './pi.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PiGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly piService: PiService) {}

  @SubscribeMessage('PING')
  async handlePing(
    @MessageBody() data: { hardwareId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.hardwareId) return;

    await this.piService.heartbeat(data.hardwareId);

    client.emit('PONG');
  }
}
