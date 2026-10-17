import { z } from 'zod'

// Sự kiện realtime cho namespace `/chat` (docs/01-architecture/realtime.md §5.2)
export const CHAT_REALTIME_EVENT = {
    // Client -> Server
    CONVERSATION_SUBSCRIBE: 'conversation:subscribe',
    CONVERSATION_UNSUBSCRIBE: 'conversation:unsubscribe',
    MESSAGE_SEND: 'chat:message:send',
    TYPING: 'chat:typing',
    READ: 'chat:read',
    // Server -> Client
    MESSAGE_CREATED: 'chat:message:created',
    MESSAGE_DELIVERED: 'chat:message:delivered',
    TYPING_CHANGED: 'chat:typing:changed',
    READ_CHANGED: 'chat:read:changed',
    CONVERSATION_UPDATED: 'chat:conversation:updated',
} as const

export type ChatRealtimeEvent = (typeof CHAT_REALTIME_EVENT)[keyof typeof CHAT_REALTIME_EVENT]

// Schema đối tác hội thoại (Người mua, người bán hoặc người dùng khác)
export const ConversationPeerSchema = z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().nullable().optional(),
    isSeller: z.boolean().default(false),
    shopSlug: z.string().optional(),
    isOnline: z.boolean().optional(),
})
export type ConversationPeerDto = z.infer<typeof ConversationPeerSchema>

// Schema sản phẩm gắn kèm tin nhắn
export const ChatAttachedProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    price: z.number(),
    thumbnailUrl: z.string().nullable().optional(),
})
export type ChatAttachedProductDto = z.infer<typeof ChatAttachedProductSchema>

// Schema đơn hàng gắn kèm tin nhắn
export const ChatAttachedOrderSchema = z.object({
    id: z.string(),
    orderNumber: z.string(),
    totalAmount: z.number(),
    status: z.string(),
    createdAt: z.string(),
})
export type ChatAttachedOrderDto = z.infer<typeof ChatAttachedOrderSchema>

// Schema tin nhắn
export const ChatMessageSchema = z.object({
    id: z.string(),
    conversationId: z.string(),
    senderId: z.string(),
    senderName: z.string().optional(),
    senderAvatar: z.string().nullable().optional(),
    content: z.string().nullable(),
    imageUrls: z.array(z.string()).default([]),
    videoUrls: z.array(z.string()).default([]),
    attachedProductId: z.string().nullable().optional(),
    attachedProduct: ChatAttachedProductSchema.nullable().optional(),
    attachedOrderId: z.string().nullable().optional(),
    attachedOrder: ChatAttachedOrderSchema.nullable().optional(),
    isRead: z.boolean().default(false),
    createdAt: z.string(),
})
export type ChatMessageDto = z.infer<typeof ChatMessageSchema>

// Schema hội thoại
export const ConversationDtoSchema = z.object({
    id: z.string(),
    buyerId: z.string(),
    sellerId: z.string(),
    orderId: z.string().nullable().optional(),
    lastMessageAt: z.string().nullable().optional(),
    lastMessage: z.string().nullable().optional(),
    lastSenderId: z.string().nullable().optional(),
    unreadCount: z.number().default(0),
    peer: ConversationPeerSchema,
    createdAt: z.string(),
})
export type ConversationDto = z.infer<typeof ConversationDtoSchema>

// Payload gửi tin nhắn
export const SendChatMessageSchema = z.object({
    conversationId: z.string().optional(),
    recipientId: z.string().optional(),
    content: z.string().max(2000).optional(),
    imageUrls: z.array(z.string().url()).optional(),
    videoUrls: z.array(z.string().url()).optional(),
    attachedProductId: z.string().optional(),
    attachedOrderId: z.string().optional(),
})
export type SendChatMessageInput = z.infer<typeof SendChatMessageSchema>

// Payload tạo cuộc trò chuyện mới
export const CreateConversationSchema = z.object({
    targetUserId: z.string(),
    orderId: z.string().optional(),
    initialMessage: z.string().optional(),
})
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>

// Phản hồi danh sách hội thoại
export const ConversationListResponseSchema = z.object({
    items: z.array(ConversationDtoSchema),
    totalUnreadCount: z.number().default(0),
})
export type ConversationListResponseDto = z.infer<typeof ConversationListResponseSchema>

// Phản hồi danh sách tin nhắn
export const ChatMessageListResponseSchema = z.object({
    items: z.array(ChatMessageSchema),
    hasMore: z.boolean().default(false),
    nextCursor: z.string().nullable().optional(),
})
export type ChatMessageListResponseDto = z.infer<typeof ChatMessageListResponseSchema>
