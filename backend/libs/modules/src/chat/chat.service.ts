import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '@timmyhub/prisma'
import { ApiError } from '@timmyhub/contracts'
import type {
    ChatMessageDto,
    ChatMessageListResponseDto,
    ConversationDto,
    ConversationListResponseDto,
    ConversationPeerDto,
    CreateConversationInput,
    SendChatMessageInput,
} from '@timmyhub/contracts'

import { CHAT_EVENT } from './chat.constants'
import { ChatGateway } from './chat.gateway'

@Injectable()
export class ChatService {
    // ===== Dependencies =====
    private readonly logger = new Logger(ChatService.name)

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        private readonly chatGateway: ChatGateway,
    ) {}

    // ===== Helpers =====

    private async resolvePeerInfo(peerId: string): Promise<ConversationPeerDto> {
        // Kiểm tra xem peerId có phải là một shop (SellerProfile) không
        const sellerProfile = await this.prisma.sellerProfile.findFirst({
            where: {
                OR: [{ id: peerId }, { userId: peerId }],
            },
        })

        if (sellerProfile) {
            return {
                id: sellerProfile.userId,
                name: sellerProfile.shopName,
                avatar: sellerProfile.shopLogo,
                isSeller: true,
                shopSlug: sellerProfile.shopSlug,
            }
        }

        // Nếu là người dùng thông thường
        const user = await this.prisma.user.findUnique({
            where: { id: peerId },
            include: { profile: true },
        })

        if (user) {
            const displayName =
                user.profile?.displayName ||
                [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
                user.email.split('@')[0] ||
                'Người dùng'

            return {
                id: user.id,
                name: displayName,
                avatar: user.profile?.avatar,
                isSeller: false,
            }
        }

        return {
            id: peerId,
            name: 'Người dùng TimmyHub',
            avatar: null,
            isSeller: false,
        }
    }

    private separateMediaUrls(urls: string[]): { imageUrls: string[]; videoUrls: string[] } {
        const videoExtensions = ['.mp4', '.webm', '.mov', '.ogg', '.m4v']
        const imageUrls: string[] = []
        const videoUrls: string[] = []

        for (const url of urls) {
            const lower = url.toLowerCase().split('?')[0] || ''
            if (videoExtensions.some((ext) => lower.endsWith(ext))) {
                videoUrls.push(url)
            } else {
                imageUrls.push(url)
            }
        }

        return { imageUrls, videoUrls }
    }

    // ===== Queries =====

    async getConversations(userId: string): Promise<ConversationListResponseDto> {
        // Tìm mọi cuộc hội thoại mà user là buyerId hoặc sellerId (hoặc sellerProfile của user)
        const sellerProfile = await this.prisma.sellerProfile.findUnique({
            where: { userId },
        })
        const sellerIdMatch = sellerProfile?.id

        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { buyerId: userId },
                    { sellerId: userId },
                    ...(sellerIdMatch ? [{ sellerId: sellerIdMatch }] : []),
                ],
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        })

        let totalUnreadCount = 0
        const items: ConversationDto[] = []

        for (const conv of conversations) {
            // Xác định peerId
            const isUserBuyer = conv.buyerId === userId
            const peerId = isUserBuyer ? conv.sellerId : conv.buyerId
            const peer = await this.resolvePeerInfo(peerId)

            // Đếm số tin chưa đọc trong hội thoại này
            const unreadCount = await this.prisma.chatMessage.count({
                where: {
                    conversationId: conv.id,
                    senderId: { not: userId },
                    isRead: false,
                },
            })

            totalUnreadCount += unreadCount

            const lastMsg = conv.messages[0]

            items.push({
                id: conv.id,
                buyerId: conv.buyerId,
                sellerId: conv.sellerId,
                orderId: conv.orderId,
                lastMessageAt: (conv.lastMessageAt ?? lastMsg?.createdAt ?? conv.createdAt).toISOString(),
                lastMessage: lastMsg?.content ?? (lastMsg?.imageUrls?.length ? '[Hình ảnh/Video]' : null),
                lastSenderId: lastMsg?.senderId ?? null,
                unreadCount,
                peer,
                createdAt: conv.createdAt.toISOString(),
            })
        }

        return {
            items,
            totalUnreadCount,
        }
    }

    async getConversationDetail(userId: string, conversationId: string): Promise<ConversationDto> {
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        })

        if (!conv) {
            throw new ApiError('NOT_FOUND')
        }

        const sellerProfile = await this.prisma.sellerProfile.findUnique({ where: { userId } })
        const isParticipant =
            conv.buyerId === userId || conv.sellerId === userId || (sellerProfile && conv.sellerId === sellerProfile.id)

        if (!isParticipant) {
            throw new ApiError('FORBIDDEN')
        }

        const peerId = conv.buyerId === userId ? conv.sellerId : conv.buyerId
        const peer = await this.resolvePeerInfo(peerId)

        const unreadCount = await this.prisma.chatMessage.count({
            where: {
                conversationId: conv.id,
                senderId: { not: userId },
                isRead: false,
            },
        })

        const lastMsg = conv.messages[0]

        return {
            id: conv.id,
            buyerId: conv.buyerId,
            sellerId: conv.sellerId,
            orderId: conv.orderId,
            lastMessageAt: (conv.lastMessageAt ?? lastMsg?.createdAt ?? conv.createdAt).toISOString(),
            lastMessage: lastMsg?.content ?? (lastMsg?.imageUrls?.length ? '[Hình ảnh/Video]' : null),
            lastSenderId: lastMsg?.senderId ?? null,
            unreadCount,
            peer,
            createdAt: conv.createdAt.toISOString(),
        }
    }

    async getMessages(
        userId: string,
        conversationId: string,
        limit = 50,
        cursor?: string,
    ): Promise<ChatMessageListResponseDto> {
        // Kiểm tra quyền
        await this.getConversationDetail(userId, conversationId)

        const rawMessages = await this.prisma.chatMessage.findMany({
            where: { conversationId },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: { createdAt: 'desc' },
        })

        const hasMore = rawMessages.length > limit
        const messages = hasMore ? rawMessages.slice(0, limit) : rawMessages
        const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1]?.id : null

        // Chuyển sang thứ tự thời gian tăng dần (cũ -> mới) để hiển thị trong chat
        const chronological = [...messages].reverse()

        // Lấy thông tin người gửi & sản phẩm/đơn hàng gắn kèm
        const items: ChatMessageDto[] = []
        for (const msg of chronological) {
            const { imageUrls, videoUrls } = this.separateMediaUrls(msg.imageUrls)

            let attachedProduct = undefined
            if (msg.attachedProductId) {
                const prod = await this.prisma.product.findUnique({
                    where: { id: msg.attachedProductId },
                    select: { id: true, name: true, slug: true, minPrice: true, images: true },
                })
                if (prod) {
                    attachedProduct = {
                        id: prod.id,
                        name: prod.name,
                        slug: prod.slug,
                        price: prod.minPrice ? Number(prod.minPrice) : 0,
                        thumbnailUrl: prod.images?.[0] ?? null,
                    }
                }
            }

            let attachedOrder = undefined
            if (msg.attachedOrderId) {
                const ord = await this.prisma.order.findUnique({
                    where: { id: msg.attachedOrderId },
                    select: { id: true, totalAmount: true, status: true, createdAt: true },
                })
                if (ord) {
                    attachedOrder = {
                        id: ord.id,
                        orderNumber: ord.id.slice(-8).toUpperCase(),
                        totalAmount: Number(ord.totalAmount),
                        status: ord.status,
                        createdAt: ord.createdAt.toISOString(),
                    }
                }
            }

            // Lấy profile người gửi
            const senderUser = await this.prisma.user.findUnique({
                where: { id: msg.senderId },
                include: { profile: true },
            })
            const senderName =
                senderUser?.profile?.displayName ||
                [senderUser?.profile?.firstName, senderUser?.profile?.lastName].filter(Boolean).join(' ') ||
                'Người dùng'

            items.push({
                id: msg.id,
                conversationId: msg.conversationId,
                senderId: msg.senderId,
                senderName,
                senderAvatar: senderUser?.profile?.avatar ?? null,
                content: msg.content,
                imageUrls,
                videoUrls,
                attachedProductId: msg.attachedProductId,
                attachedProduct,
                attachedOrderId: msg.attachedOrderId,
                attachedOrder,
                isRead: msg.isRead,
                createdAt: msg.createdAt.toISOString(),
            })
        }

        return {
            items,
            hasMore,
            nextCursor,
        }
    }

    // ===== Commands =====

    async sendMessage(userId: string, input: SendChatMessageInput): Promise<ChatMessageDto> {
        let conversationId = input.conversationId

        if (!conversationId && input.recipientId) {
            // Tìm hoặc tạo hội thoại với recipientId
            const targetId = input.recipientId

            // Tìm cuộc trò chuyện hiện có
            const existing = await this.prisma.conversation.findFirst({
                where: {
                    OR: [
                        { buyerId: userId, sellerId: targetId },
                        { buyerId: targetId, sellerId: userId },
                    ],
                },
            })

            if (existing) {
                conversationId = existing.id
            } else {
                // Kiểm tra xem ai là seller
                const recipientSeller = await this.prisma.sellerProfile.findFirst({
                    where: { OR: [{ id: targetId }, { userId: targetId }] },
                })
                const userSeller = await this.prisma.sellerProfile.findUnique({
                    where: { userId },
                })

                let bId = userId
                let sId = targetId

                if (recipientSeller) {
                    bId = userId
                    sId = recipientSeller.userId
                } else if (userSeller) {
                    bId = targetId
                    sId = userSeller.userId
                } else {
                    // Chat giữa 2 user thường: chuẩn hoá buyerId < sellerId để khớp unique index
                    bId = userId < targetId ? userId : targetId
                    sId = userId < targetId ? targetId : userId
                }

                const created = await this.prisma.conversation.create({
                    data: {
                        buyerId: bId,
                        sellerId: sId,
                        orderId: input.attachedOrderId ?? null,
                    },
                })
                conversationId = created.id
            }
        }

        if (!conversationId) {
            throw new ApiError('BAD_REQUEST')
        }

        // Lấy thông tin cuộc trò chuyện
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        })
        if (!conv) {
            throw new ApiError('NOT_FOUND')
        }

        // Hợp nhất hình ảnh và video vào imageUrls lưu trong DB
        const mediaUrls = [...(input.imageUrls ?? []), ...(input.videoUrls ?? [])]

        const message = await this.prisma.chatMessage.create({
            data: {
                conversationId,
                senderId: userId,
                content: input.content || null,
                imageUrls: mediaUrls,
                attachedProductId: input.attachedProductId ?? null,
                attachedOrderId: input.attachedOrderId ?? null,
                isRead: false,
            },
        })

        // Cập nhật lastMessageAt trên Conversation
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: message.createdAt },
        })

        // Lấy thông tin sender
        const senderUser = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        })
        const senderName =
            senderUser?.profile?.displayName ||
            [senderUser?.profile?.firstName, senderUser?.profile?.lastName].filter(Boolean).join(' ') ||
            'Người dùng'

        const { imageUrls, videoUrls } = this.separateMediaUrls(mediaUrls)

        let attachedProduct = undefined
        if (input.attachedProductId) {
            const prod = await this.prisma.product.findUnique({
                where: { id: input.attachedProductId },
                select: { id: true, name: true, slug: true, minPrice: true, images: true },
            })
            if (prod) {
                attachedProduct = {
                    id: prod.id,
                    name: prod.name,
                    slug: prod.slug,
                    price: prod.minPrice ? Number(prod.minPrice) : 0,
                    thumbnailUrl: prod.images?.[0] ?? null,
                }
            }
        }

        let attachedOrder = undefined
        if (input.attachedOrderId) {
            const ord = await this.prisma.order.findUnique({
                where: { id: input.attachedOrderId },
                select: { id: true, totalAmount: true, status: true, createdAt: true },
            })
            if (ord) {
                attachedOrder = {
                    id: ord.id,
                    orderNumber: ord.id.slice(-8).toUpperCase(),
                    totalAmount: Number(ord.totalAmount),
                    status: ord.status,
                    createdAt: ord.createdAt.toISOString(),
                }
            }
        }

        const messageDto: ChatMessageDto = {
            id: message.id,
            conversationId,
            senderId: userId,
            senderName,
            senderAvatar: senderUser?.profile?.avatar ?? null,
            content: message.content,
            imageUrls,
            videoUrls,
            attachedProductId: message.attachedProductId,
            attachedProduct,
            attachedOrderId: message.attachedOrderId,
            attachedOrder,
            isRead: false,
            createdAt: message.createdAt.toISOString(),
        }

        // Xác định đối tác để gửi notification / socket update
        const recipientUserId = conv.buyerId === userId ? conv.sellerId : conv.buyerId

        // Phát WebSocket realtime
        this.chatGateway.emitNewMessage(conversationId, messageDto, [userId, recipientUserId])

        // Phát domain event
        this.eventEmitter.emit(CHAT_EVENT.MESSAGE_SENT, messageDto)

        return messageDto
    }

    async createConversation(userId: string, input: CreateConversationInput): Promise<ConversationDto> {
        const targetId = input.targetUserId

        // Tìm hoặc tạo
        let conv = await this.prisma.conversation.findFirst({
            where: {
                OR: [
                    { buyerId: userId, sellerId: targetId },
                    { buyerId: targetId, sellerId: userId },
                ],
            },
        })

        if (!conv) {
            const recipientSeller = await this.prisma.sellerProfile.findFirst({
                where: { OR: [{ id: targetId }, { userId: targetId }] },
            })
            const userSeller = await this.prisma.sellerProfile.findUnique({
                where: { userId },
            })

            let bId = userId
            let sId = targetId

            if (recipientSeller) {
                bId = userId
                sId = recipientSeller.userId
            } else if (userSeller) {
                bId = targetId
                sId = userSeller.userId
            } else {
                bId = userId < targetId ? userId : targetId
                sId = userId < targetId ? targetId : userId
            }

            conv = await this.prisma.conversation.create({
                data: {
                    buyerId: bId,
                    sellerId: sId,
                    orderId: input.orderId ?? null,
                },
            })
        }

        if (input.initialMessage) {
            await this.sendMessage(userId, {
                conversationId: conv.id,
                content: input.initialMessage,
            })
        }

        return this.getConversationDetail(userId, conv.id)
    }

    async markConversationRead(userId: string, conversationId: string): Promise<{ success: boolean }> {
        // Đánh dấu các tin nhắn người khác gửi là đã đọc
        await this.prisma.chatMessage.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true },
        })

        // Bắn WebSocket thông báo đã đọc
        this.chatGateway.emitConversationRead(conversationId, userId)

        return { success: true }
    }
}
