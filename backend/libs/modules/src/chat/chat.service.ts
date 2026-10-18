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
                isOnline: this.chatGateway.isUserOnline(sellerProfile.userId),
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
                isOnline: this.chatGateway.isUserOnline(user.id),
            }
        }

        return {
            id: peerId,
            name: 'Người dùng TimmyHub',
            avatar: null,
            isSeller: false,
            isOnline: this.chatGateway.isUserOnline(peerId),
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
            select: { id: true },
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

        if (!conversations.length) {
            return {
                items: [],
                totalUnreadCount: 0,
            }
        }

        const convIds = conversations.map((c) => c.id)

        // 1. Batch query đếm unread count theo conversationId (O(1) query thay vì N queries)
        const unreadGroups = await this.prisma.chatMessage.groupBy({
            by: ['conversationId'],
            where: {
                conversationId: { in: convIds },
                senderId: { not: userId },
                isRead: false,
            },
            _count: {
                id: true,
            },
        })

        const unreadMap = new Map<string, number>()
        let totalUnreadCount = 0
        for (const g of unreadGroups) {
            unreadMap.set(g.conversationId, g._count.id)
            totalUnreadCount += g._count.id
        }

        // 2. Batch resolve peer info cho toàn bộ danh sách hội thoại
        const peerIds = Array.from(
            new Set(
                conversations.map((c) => {
                    const isUserBuyer = c.buyerId === userId
                    return isUserBuyer ? c.sellerId : c.buyerId
                }),
            ),
        )

        // Lấy tất cả seller profile tương ứng
        const matchedSellers = await this.prisma.sellerProfile.findMany({
            where: {
                OR: [{ id: { in: peerIds } }, { userId: { in: peerIds } }],
            },
            select: {
                id: true,
                userId: true,
                shopName: true,
                shopLogo: true,
                shopSlug: true,
            },
        })

        const sellerByPeerId = new Map<string, (typeof matchedSellers)[0]>()
        for (const s of matchedSellers) {
            sellerByPeerId.set(s.id, s)
            sellerByPeerId.set(s.userId, s)
        }

        // Với những peerId không phải là seller, tìm User
        const nonSellerPeerIds = peerIds.filter((id) => !sellerByPeerId.has(id))
        const matchedUsers = nonSellerPeerIds.length
            ? await this.prisma.user.findMany({
                  where: { id: { in: nonSellerPeerIds } },
                  include: { profile: true },
              })
            : []

        const userByPeerId = new Map<string, (typeof matchedUsers)[0]>()
        for (const u of matchedUsers) {
            userByPeerId.set(u.id, u)
        }

        const items: ConversationDto[] = conversations.map((conv) => {
            const isUserBuyer = conv.buyerId === userId
            const peerId = isUserBuyer ? conv.sellerId : conv.buyerId

            let peer: ConversationPeerDto
            const seller = sellerByPeerId.get(peerId)
            if (seller) {
                peer = {
                    id: seller.userId,
                    name: seller.shopName,
                    avatar: seller.shopLogo,
                    isSeller: true,
                    shopSlug: seller.shopSlug,
                    isOnline: this.chatGateway.isUserOnline(seller.userId),
                }
            } else {
                const user = userByPeerId.get(peerId)
                if (user) {
                    const displayName =
                        user.profile?.displayName ||
                        [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
                        user.email.split('@')[0] ||
                        'Người dùng'
                    peer = {
                        id: user.id,
                        name: displayName,
                        avatar: user.profile?.avatar,
                        isSeller: false,
                        isOnline: this.chatGateway.isUserOnline(user.id),
                    }
                } else {
                    peer = {
                        id: peerId,
                        name: 'Người dùng TimmyHub',
                        avatar: null,
                        isSeller: false,
                        isOnline: this.chatGateway.isUserOnline(peerId),
                    }
                }
            }

            const unreadCount = unreadMap.get(conv.id) ?? 0
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
        })

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
        const rawPeerId = conv.buyerId === userId ? conv.sellerId : conv.buyerId
        // Nếu peerId là sellerProfile.id, cần map sang sellerProfile.userId để phát socket tới user room chính xác
        let recipientUserId = rawPeerId
        const sellerTarget = await this.prisma.sellerProfile.findUnique({
            where: { id: rawPeerId },
            select: { userId: true },
        })
        if (sellerTarget?.userId) {
            recipientUserId = sellerTarget.userId
        }

        // Phát WebSocket realtime
        this.chatGateway.emitNewMessage(conversationId, messageDto, [userId, recipientUserId])

        // Phát domain event
        this.eventEmitter.emit(CHAT_EVENT.MESSAGE_SENT, messageDto)

        return messageDto
    }

    async createConversation(userId: string, input: CreateConversationInput): Promise<ConversationDto> {
        const targetId = input.targetUserId

        if (targetId === userId) {
            throw new ApiError('CANNOT_MODIFY_SELF')
        }

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

            if (recipientSeller && recipientSeller.userId === userId) {
                throw new ApiError('CANNOT_MODIFY_SELF')
            }

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
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { buyerId: true, sellerId: true },
        })

        // Đánh dấu các tin nhắn người khác gửi là đã đọc
        await this.prisma.chatMessage.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true },
        })

        // Tìm đối tác để bắn thông báo đã đọc
        const notifyUserIds: string[] = []
        if (conv) {
            const rawPeerId = conv.buyerId === userId ? conv.sellerId : conv.buyerId
            let peerUserId = rawPeerId
            const sellerTarget = await this.prisma.sellerProfile.findUnique({
                where: { id: rawPeerId },
                select: { userId: true },
            })
            if (sellerTarget?.userId) {
                peerUserId = sellerTarget.userId
            }
            notifyUserIds.push(peerUserId)
        }

        // Bắn WebSocket thông báo đã đọc tới convRoom, reader tabs và sender user room
        this.chatGateway.emitConversationRead(conversationId, userId, notifyUserIds)

        return { success: true }
    }
}
