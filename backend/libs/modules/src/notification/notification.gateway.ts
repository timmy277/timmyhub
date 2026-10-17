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
import type { NotificationItemDto } from '@timmyhub/contracts'
import { NOTIFICATION_REALTIME_EVENT, REALTIME_NAMESPACE, roomFor } from '@timmyhub/contracts'

@WebSocketGateway({
    namespace: REALTIME_NAMESPACE.NOTIFICATIONS,
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    // ===== Dependencies =====
    private readonly logger = new Logger(NotificationGateway.name)

    @WebSocketServer()
    server!: Server

    // ===== Lifecycle =====

    handleConnection(client: Socket): void {
        const userId =
            (client.handshake.auth?.userId as string | undefined) ||
            (client.handshake.query?.userId as string | undefined)

        if (userId) {
            const room = roomFor.user(userId)
            void client.join(room)
            this.logger.debug(`Client ${client.id} joined room ${room} on connection`)
        }

        client.emit('connection:ready', {
            socketId: client.id,
            serverTime: new Date().toISOString(),
        })
    }

    handleDisconnect(client: Socket): void {
        this.logger.debug(`Client ${client.id} disconnected from ${REALTIME_NAMESPACE.NOTIFICATIONS}`)
    }

    // ===== Client Handlers =====

    @SubscribeMessage('notification:subscribe')
    handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }): void {
        if (!data?.userId) return
        const room = roomFor.user(data.userId)
        void client.join(room)
        this.logger.debug(`Client ${client.id} subscribed to room ${room}`)
    }

    @SubscribeMessage('notification:unsubscribe')
    handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }): void {
        if (!data?.userId) return
        const room = roomFor.user(data.userId)
        void client.leave(room)
        this.logger.debug(`Client ${client.id} unsubscribed from room ${room}`)
    }

    // ===== Server Emitters =====

    emitNewNotification(userId: string, notification: NotificationItemDto): void {
        const room = roomFor.user(userId)
        this.server.to(room).emit(NOTIFICATION_REALTIME_EVENT.NEW, notification)
        this.logger.debug(`Emitted ${NOTIFICATION_REALTIME_EVENT.NEW} to room ${room}`)
    }

    emitNotificationRead(userId: string, id: string): void {
        const room = roomFor.user(userId)
        this.server.to(room).emit(NOTIFICATION_REALTIME_EVENT.READ, { id })
        this.logger.debug(`Emitted ${NOTIFICATION_REALTIME_EVENT.READ} to room ${room} for id ${id}`)
    }

    emitNotificationReadAll(userId: string): void {
        const room = roomFor.user(userId)
        this.server.to(room).emit(NOTIFICATION_REALTIME_EVENT.READ_ALL, { userId })
        this.logger.debug(`Emitted ${NOTIFICATION_REALTIME_EVENT.READ_ALL} to room ${room}`)
    }
}
