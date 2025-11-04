import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatbotService } from './services/chatbot.service';

interface ChatPayload {
  projectId: string;
  message: string;
  conversationId?: string;
  apiKey?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ai-chat',
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AiGateway.name);
  private activeConnections: Map<string, { projectId: string; conversationId?: string }> = new Map();

  constructor(private readonly chatbotService: ChatbotService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.activeConnections.delete(client.id);
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(@MessageBody() payload: ChatPayload, @ConnectedSocket() client: Socket) {
    try {
      this.logger.log(`Received message from ${client.id}: ${payload.message.substring(0, 50)}...`);

      // Validate payload
      if (!payload.projectId || !payload.message) {
        client.emit('chat:error', { message: 'Invalid payload: projectId and message are required' });
        return;
      }

      // Store connection info
      this.activeConnections.set(client.id, {
        projectId: payload.projectId,
        conversationId: payload.conversationId,
      });

      // Emit typing indicator
      client.emit('chat:typing', { isTyping: true });

      // Get AI response
      const response = await this.chatbotService.chat(
        payload.projectId,
        payload.message,
        payload.conversationId,
      );

      // Stop typing indicator
      client.emit('chat:typing', { isTyping: false });

      // Send response
      client.emit('chat:response', response);

      // Also broadcast to room if multiple clients are watching the same conversation
      if (response.conversationId) {
        client.to(`conversation:${response.conversationId}`).emit('chat:update', {
          conversationId: response.conversationId,
          message: payload.message,
          response: response.response,
        });
      }
    } catch (error) {
      this.logger.error('Error handling chat message:', error);
      client.emit('chat:error', {
        message: error.message || 'Failed to process message',
      });
      client.emit('chat:typing', { isTyping: false });
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinConversation(
    @MessageBody() payload: { conversationId: string; projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const roomName = `conversation:${payload.conversationId}`;
      await client.join(roomName);

      this.logger.log(`Client ${client.id} joined conversation ${payload.conversationId}`);

      // Send conversation history
      const history = await this.chatbotService.getConversationHistory(
        payload.conversationId,
        payload.projectId,
      );

      client.emit('chat:history', { conversationId: payload.conversationId, history });
    } catch (error) {
      this.logger.error('Error joining conversation:', error);
      client.emit('chat:error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveConversation(
    @MessageBody() payload: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `conversation:${payload.conversationId}`;
    await client.leave(roomName);
    this.logger.log(`Client ${client.id} left conversation ${payload.conversationId}`);
  }

  @SubscribeMessage('chat:typing')
  handleTypingIndicator(
    @MessageBody() payload: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast typing indicator to other clients in the same conversation
    client.to(`conversation:${payload.conversationId}`).emit('chat:user-typing', {
      clientId: client.id,
      isTyping: payload.isTyping,
    });
  }

  // Method to broadcast updates from other services
  broadcastToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  // Method to get active connections count
  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }
}
