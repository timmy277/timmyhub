import { Logger } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import type { ChatMessageDto } from '@timmyhub/contracts'
import { CHAT_REALTIME_EVENT, REALTIME_NAMESPACE, roomFor } from '@timmyhub/contracts'

@WebSocketGateway({
    namespace: REALTIME_NAMESPACE.CHAT,
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    // ===== Dependencies =====
    private readonly logger = new Logger(ChatGateway.name)

    @WebSocketServer()
    server!: Server

    // ===== Lifecycle =====

    handleConnection(client: Socket): void {
        const userId =
            (client.handshake.auth?.userId as string | undefined) ||
            (client.handshake.query?.userId as string | undefined)

        if (userId) {
            const userRoom = roomFor.user(userId)
            void client.join(userRoom)
            this.logger.debug(`Client ${client.id} joined user room ${userRoom}`)
        }

        client.emit('connection:ready', {
            socketId: client.id,
            serverTime: new Date().toISOString(),
        })
    }

    handleDisconnect(client: Socket): void {
        this.logger.debug(`Client ${client.id} disconnected from ${REALTIME_NAMESPACE.CHAT}`)
    }

    // ===== Client Handlers =====

    @SubscribeMessage(CHAT_REALTIME_EVENT.CONVERSATION_SUBSCRIBE)
    handleSubscribeConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ): void {
        if (!data?.conversationId) return
        const room = roomFor.conversation(data.conversationId)
        void client.join(room)
        this.logger.debug(`Client ${client.id} joined conversation room ${room}`)
    }

    @SubscribeMessage(CHAT_REALTIME_EVENT.CONVERSATION_UNSUBSCRIBE)
    handleUnsubscribeConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ): void {
        if (!data?.conversationId) return
        const room = roomFor.conversation(data.conversationId)
        void client.leave(room)
        this.logger.debug(`Client ${client.id} left conversation room ${room}`)
    }

    @SubscribeMessage(CHAT_REALTIME_EVENT.TYPING)
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; userId: string; isTyping: boolean },
    ): void {
        if (!data?.conversationId) return
        const room = roomFor.conversation(data.conversationId)
        client.to(room).emit(CHAT_REALTIME_EVENT.TYPING_CHANGED, {
            conversationId: data.conversationId,
            userId: data.userId,
            isTyping: data.isTyping,
        })
    }

    @SubscribeMessage(CHAT_REALTIME_EVENT.READ)
    handleRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; userId: string; lastReadMessageId?: string },
    ): void {
        if (!data?.conversationId || !data?.userId) return
        this.emitConversationRead(data.conversationId, data.userId, data.lastReadMessageId)
    }

    // ===== Server Emitters =====

    emitNewMessage(conversationId: string, message: ChatMessageDto, notifyUserIds: string[] = []): void {
        const convRoom = roomFor.conversation(conversationId)
        this.server.to(convRoom).emit(CHAT_REALTIME_EVENT.MESSAGE_CREATED, message)
        this.logger.debug(`Emitted ${CHAT_REALTIME_EVENT.MESSAGE_CREATED} to room ${convRoom}`)

        // Bắn cập nhật danh sách hội thoại tới từng user liên quan
        for (const userId of notifyUserIds) {
            const userRoom = roomFor.user(userId)
            this.server.to(userRoom).emit(CHAT_REALTIME_EVENT.CONVERSATION_UPDATED, {
                conversationId,
                lastMessage: message,
            })
            this.logger.debug(`Emitted ${CHAT_REALTIME_EVENT.CONVERSATION_UPDATED} to room ${userRoom}`)
        }
    }

    emitConversationRead(
        conversationId: string,
        readerUserId: string,
        recipientUserIds: string[] = [],
        lastReadMessageId?: string,
    ): void {
        const payload = {
            conversationId,
            userId: readerUserId,
            lastReadMessageId,
        }

        // 1. Phát tới phòng hội thoại
        const convRoom = roomFor.conversation(conversationId)
        this.server.to(convRoom).emit(CHAT_REALTIME_EVENT.READ_CHANGED, payload)

        // 2. Phát tới các user liên quan (để đồng bộ multi-tab cho reader và live read-receipt cho sender)
        const allTargetUserIds = Array.from(new Set([readerUserId, ...recipientUserIds]))
        for (const targetId of allTargetUserIds) {
            const userRoom = roomFor.user(targetId)
            this.server.to(userRoom).emit(CHAT_REALTIME_EVENT.READ_CHANGED, payload)
        }
        this.logger.debug(
            `Emitted ${CHAT_REALTIME_EVENT.READ_CHANGED} to conv ${conversationId} and users ${allTargetUserIds.join(', ')}`,
        )
    }
}
