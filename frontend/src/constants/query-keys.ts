// Query Key Factory tập trung cho React Query (ADR / Coding Standards).
// Quy tắc phân tầng: [scope, entity, ...params].
// Invalidate query cha (vd QUERY_KEY.RBAC.ALL) sẽ tự động làm mới tất cả query con (ROLES, PERMISSIONS, USER_PERMISSIONS).
export const QUERY_KEY = {
    AUTH: {
        ALL: ['auth'] as const,
        SESSION: ['auth', 'session'] as const,
    },
    RBAC: {
        ALL: ['rbac'] as const,
        ROLES: ['rbac', 'roles'] as const,
        ROLE_DETAIL: (roleId: string) => ['rbac', 'roles', roleId] as const,
        PERMISSIONS: ['rbac', 'permissions'] as const,
        PERMISSION_DETAIL: (permissionId: string) => ['rbac', 'permissions', permissionId] as const,
        USER_PERMISSIONS: (userId?: string) => ['rbac', 'user-permissions', userId] as const,
    },
    USERS: {
        ALL: ['users'] as const,
        LIST: ['users', 'list'] as const,
        DETAIL: (userId: string) => ['users', 'detail', userId] as const,
        ME: ['users', 'me'] as const,
        NAVBAR_PROFILE: ['users', 'navbar-profile'] as const,
    },
    AUDIT: {
        ALL: ['audit'] as const,
        LIST: ['audit', 'list'] as const,
        DETAIL: (logId: string) => ['audit', 'detail', logId] as const,
    },
    MEDIA: {
        ALL: ['media'] as const,
        LIST: (filters?: Record<string, unknown>) => ['media', 'list', filters] as const,
        DETAIL: (id: string) => ['media', 'detail', id] as const,
    },
    SELLER: {
        ALL: ['seller'] as const,
        MY_SHOP: ['seller', 'my-shop'] as const,
        APPLICATIONS: ['seller', 'applications'] as const,
        APPLICATION_DETAIL: (id: string) => ['seller', 'applications', id] as const,
    },
    PRODUCTS: {
        ALL: ['products'] as const,
        PUBLIC_LIST: (filters?: Record<string, unknown>) => ['products', 'public-list', filters] as const,
        PUBLIC_DETAIL: (idOrSlug: string) => ['products', 'public-detail', idOrSlug] as const,
        SELLER_LIST: (filters?: Record<string, unknown>) => ['products', 'seller-list', filters] as const,
        ADMIN_LIST: (filters?: Record<string, unknown>) => ['products', 'admin-list', filters] as const,
        DETAIL: (id: string) => ['products', 'detail', id] as const,
    },
    CATEGORIES: {
        ALL: ['categories'] as const,
        LIST: ['categories', 'list'] as const,
        ADMIN_LIST: (filters?: Record<string, unknown>) => ['categories', 'admin-list', filters] as const,
        DETAIL: (id: string) => ['categories', 'detail', id] as const,
    },
    CART: {
        ALL: ['cart'] as const,
        DETAIL: ['cart', 'detail'] as const,
    },
    ORDER: {
        ALL: ['order'] as const,
        MY_ORDERS_ALL: ['order', 'my-orders'] as const,
        MY_ORDERS: (status?: string, search?: string) => ['order', 'my-orders', status, search] as const,
        DETAIL: (id: string) => ['order', 'detail', id] as const,
    },
    ADDRESS: {
        ALL: ['address'] as const,
        LIST: ['address', 'list'] as const,
    },
    PROMOTION: {
        ALL: ['promotion'] as const,
        CAMPAIGNS: ['promotion', 'campaigns'] as const,
        AVAILABLE_VOUCHERS: (subtotal?: number) => ['promotion', 'available-vouchers', subtotal] as const,
        MY_SAVED_VOUCHERS: ['promotion', 'my-saved-vouchers'] as const,
        MY_VOUCHERS_LIST: (status?: string) => ['promotion', 'my-vouchers-list', status] as const,
    },
    ENGAGEMENT: {
        ALL: ['engagement'] as const,
        REVIEW_LISTS: (productId: string) => ['engagement', 'reviews', productId] as const,
        REVIEWS: (productId: string, params?: Record<string, unknown>) =>
            ['engagement', 'reviews', productId, params] as const,
        SUMMARY: (productId: string) => ['engagement', 'summary', productId] as const,
        PENDING: ['engagement', 'pending'] as const,
    },
    NOTIFICATION: {
        ALL: ['notification'] as const,
        LIST: ['notification', 'list'] as const,
        UNREAD_COUNT: ['notification', 'unread-count'] as const,
    },
    CHAT: {
        ALL: ['chat'] as const,
        CONVERSATIONS: ['chat', 'conversations'] as const,
        CONVERSATION: (id: string) => ['chat', 'conversation', id] as const,
        MESSAGES: (id: string) => ['chat', 'messages', id] as const,
    },
    WISHLIST: {
        ALL: ['wishlist'] as const,
        LIST: ['wishlist', 'list'] as const,
        IDS: ['wishlist', 'ids'] as const,
    },
    CONTENT: {
        ALL: ['content'] as const,
        FEED: (limit?: number) => ['content', 'feed', limit] as const,
        VIDEO_DETAIL: (id: string) => ['content', 'detail', id] as const,
        COMMENTS: (postId: string) => ['content', 'comments', postId] as const,
        SELLER_VIDEOS: (filters?: Record<string, unknown>) => ['content', 'seller-videos', filters] as const,
    },
} as const
