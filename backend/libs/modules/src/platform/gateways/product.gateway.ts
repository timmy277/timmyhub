import { Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
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
import type { ReviewCommentItem, ReviewItem } from '@timmyhub/contracts'
import { PRODUCT_REALTIME_EVENT, REALTIME_NAMESPACE, roomFor } from '@timmyhub/contracts'
import { ENGAGEMENT_EVENT } from '@timmyhub/modules/engagement'

interface ReviewCreatedPayload {
    productId: string
    review: ReviewItem
}

interface ReviewRepliedPayload {
    reviewId: string
    productId: string
    comment: ReviewCommentItem
}

interface RatingUpdatedPayload {
    productId: string
    averageRating: number
    reviewCount: number
}

@WebSocketGateway({
    namespace: REALTIME_NAMESPACE.PRODUCT,
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class ProductGateway implements OnGatewayConnection, OnGatewayDisconnect {
    // ===== Dependencies =====
    private readonly logger = new Logger(ProductGateway.name)

    @WebSocketServer()
    server!: Server

    // ===== Lifecycle =====

    handleConnection(client: Socket): void {
        this.logger.debug(`Client ${client.id} connected to ${REALTIME_NAMESPACE.PRODUCT}`)
        client.emit('connection:ready', {
            socketId: client.id,
            serverTime: new Date().toISOString(),
        })
    }

    handleDisconnect(client: Socket): void {
        this.logger.debug(`Client ${client.id} disconnected from ${REALTIME_NAMESPACE.PRODUCT}`)
    }

    // ===== Client Handlers =====

    @SubscribeMessage(PRODUCT_REALTIME_EVENT.SUBSCRIBE)
    handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { productId: string }): void {
        if (!data?.productId) return
        const room: string = roomFor.product(data.productId)
        void client.join(room)
        this.logger.debug(`Client ${client.id} joined room ${room}`)
    }

    @SubscribeMessage(PRODUCT_REALTIME_EVENT.UNSUBSCRIBE)
    handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { productId: string }): void {
        if (!data?.productId) return
        const room: string = roomFor.product(data.productId)
        void client.leave(room)
        this.logger.debug(`Client ${client.id} left room ${room}`)
    }

    // ===== Domain Event Handlers (In-process fan-out) =====

    @OnEvent(ENGAGEMENT_EVENT.REVIEW_CREATED)
    handleReviewCreated(payload: ReviewCreatedPayload): void {
        const room: string = roomFor.product(payload.productId)
        this.server.to(room).emit(PRODUCT_REALTIME_EVENT.REVIEW_CREATED, {
            productId: payload.productId,
            review: payload.review,
        })
        this.logger.debug(`Emitted ${PRODUCT_REALTIME_EVENT.REVIEW_CREATED} to room ${room}`)
    }

    @OnEvent(ENGAGEMENT_EVENT.REVIEW_REPLIED)
    handleReviewReplied(payload: ReviewRepliedPayload): void {
        const room: string = roomFor.product(payload.productId)
        this.server.to(room).emit(PRODUCT_REALTIME_EVENT.COMMENT_CREATED, {
            reviewId: payload.reviewId,
            comment: payload.comment,
        })
        this.logger.debug(`Emitted ${PRODUCT_REALTIME_EVENT.COMMENT_CREATED} to room ${room}`)
    }

    @OnEvent(ENGAGEMENT_EVENT.RATING_UPDATED)
    handleRatingUpdated(payload: RatingUpdatedPayload): void {
        const room: string = roomFor.product(payload.productId)
        this.server.to(room).emit(PRODUCT_REALTIME_EVENT.RATING_UPDATED, payload)
        this.logger.debug(`Emitted ${PRODUCT_REALTIME_EVENT.RATING_UPDATED} to room ${room}`)
    }
}
