// Helper duy nhất sinh tên room cho WebSocket (CLAUDE.md & docs/01-architecture/realtime.md §3)
export const roomFor = {
    user: (userId: string) => `user:${userId}` as const,
    seller: (sellerId: string) => `seller:${sellerId}` as const,
    conversation: (conversationId: string) => `conversation:${conversationId}` as const,
    post: (postId: string) => `post:${postId}` as const,
    product: (productId: string) => `product:${productId}` as const,
    adminModeration: () => 'admin:moderation' as const,
    adminSystem: () => 'admin:system' as const,
}

// Namespace và danh mục sự kiện Realtime (docs/01-architecture/realtime.md §2 & §5)
export const REALTIME_NAMESPACE = {
    NOTIFICATIONS: '/notifications',
    CHAT: '/chat',
    FEED: '/feed',
    PRODUCT: '/product',
    ADMIN: '/admin',
} as const

export const PRODUCT_REALTIME_EVENT = {
    // Client -> Server
    SUBSCRIBE: 'product:subscribe',
    UNSUBSCRIBE: 'product:unsubscribe',
    // Server -> Client
    REVIEW_CREATED: 'review:item:created',
    COMMENT_CREATED: 'review:comment:created',
    RATING_UPDATED: 'product:rating:updated',
} as const
