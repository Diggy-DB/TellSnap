import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class JobsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private subscriptions = new Map<string, Set<string>>(); // jobId -> socketIds

  constructor(private redis: RedisService) {
    this.setupRedisSubscriber();
  }

  private async setupRedisSubscriber() {
    const subscriber = this.redis.getClient().duplicate();
    await subscriber.subscribe('job:progress', 'job:complete');

    subscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);
      const socketIds = this.subscriptions.get(data.jobId);

      if (socketIds) {
        socketIds.forEach((socketId) => {
          this.server.to(socketId).emit(channel, data);
        });
      }
    });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove from all subscriptions
    this.subscriptions.forEach((socketIds, jobId) => {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.subscriptions.delete(jobId);
      }
    });
  }

  @SubscribeMessage('subscribe:job')
  handleSubscribe(client: Socket, jobId: string) {
    if (!this.subscriptions.has(jobId)) {
      this.subscriptions.set(jobId, new Set());
    }
    this.subscriptions.get(jobId)!.add(client.id);
    
    return { success: true, jobId };
  }

  @SubscribeMessage('unsubscribe:job')
  handleUnsubscribe(client: Socket, jobId: string) {
    const socketIds = this.subscriptions.get(jobId);
    if (socketIds) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.subscriptions.delete(jobId);
      }
    }
    
    return { success: true, jobId };
  }
}
