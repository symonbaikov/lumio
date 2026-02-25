import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Notification } from '../../entities/notification.entity';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`Socket ${client.id} rejected: missing token`);
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(token, {
        secret:
          this.configService.get<string>('JWT_ACCESS_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      if (!userId) {
        this.logger.warn(`Socket ${client.id} rejected: token missing subject`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.join(this.getUserRoom(userId));
    } catch (error) {
      this.logger.warn(`Socket ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      client.leave(this.getUserRoom(userId));
    }
  }

  @SubscribeMessage('join-workspace')
  handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { workspaceId?: string },
  ): void {
    if (!payload.workspaceId) {
      return;
    }
    client.join(this.getWorkspaceRoom(payload.workspaceId));
  }

  @SubscribeMessage('leave-workspace')
  handleLeaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { workspaceId?: string },
  ): void {
    if (!payload.workspaceId) {
      return;
    }
    client.leave(this.getWorkspaceRoom(payload.workspaceId));
  }

  @OnEvent('notification.created')
  handleNotificationCreated(notification: Notification): void {
    this.server
      .to(this.getUserRoom(notification.recipientId))
      .emit('notification:new', notification);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header !== 'string' || header.length === 0) {
      return null;
    }

    if (header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return header;
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private getWorkspaceRoom(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }
}
