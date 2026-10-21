// Nguồn duy nhất cho đường dẫn API backend (CLAUDE.md luật #22) — khớp `AUTH_ROUTE`, `IDENTITY_ROUTE` và
// `@Controller('v1/rbac')` ở backend. Đường dẫn tương đối, chưa gồm base URL; route có tham số là hàm để không ghép
// chuỗi tay ở nơi gọi.

// Base URL backend — apps/api chạy cổng 3001 (project-plan.md bảng cổng dịch vụ; FE dev chiếm 3000).
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Trần thời gian chờ một lượt gọi backend. Không có nó thì một backend treo sẽ giữ request của Server Component/
// Server Action mở vô hạn (Next dev không tự ngắt), trang đứng im mà không có thông báo nào. 10s đủ rộng cho truy vấn
// quản trị, vẫn đủ nhanh để rơi về `BACKEND_UNAVAILABLE` thay vì treo.
export const API_REQUEST_TIMEOUT_MS = 10_000

export const API_ROUTE = {
    AUTH: {
        REGISTER: 'v1/auth/register',
        LOGIN: 'v1/auth/login',
        REFRESH: 'v1/auth/refresh',
        LOGOUT: 'v1/auth/logout',
        LOGOUT_ALL: 'v1/auth/logout-all',
    },
    IDENTITY: {
        PING: 'v1/identity/ping',
    },
    // Quản trị người dùng — khớp `USERS_ROUTE` của module identity (FEAT-USR-004/005).
    USERS: {
        LIST: 'v1/identity/users',
        DETAIL: (userId: string) => `v1/identity/users/${encodeURIComponent(userId)}`,
        LOCK: (userId: string) => `v1/identity/users/${encodeURIComponent(userId)}/lock`,
        UNLOCK: (userId: string) => `v1/identity/users/${encodeURIComponent(userId)}/unlock`,
    },
    // Tra cứu audit log — khớp `AUDIT_ROUTE` của module identity (FEAT-AUD-004). Bảng AuditLog bất biến (ADR-0011):
    // chỉ có endpoint đọc, không có đường ghi/sửa/xoá qua API.
    AUDIT: {
        LIST: 'v1/audit/logs',
        DETAIL: (logId: string) => `v1/audit/logs/${encodeURIComponent(logId)}`,
    },
    RBAC: {
        ROLES: 'v1/rbac/roles',
        ROLE: (roleId: string) => `v1/rbac/roles/${encodeURIComponent(roleId)}`,
        ROLE_PERMISSIONS: (roleId: string) => `v1/rbac/roles/${encodeURIComponent(roleId)}/permissions`,
        PERMISSIONS: 'v1/rbac/permissions',
        PERMISSION: (permissionId: string) => `v1/rbac/permissions/${encodeURIComponent(permissionId)}`,
        USER_ROLES: (userId: string) => `v1/rbac/users/${encodeURIComponent(userId)}/roles`,
        USER_ROLE: (userId: string, roleName: string) =>
            `v1/rbac/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleName)}`,
        USER_PERMISSIONS: (userId: string) => `v1/rbac/users/${encodeURIComponent(userId)}/permissions`,
        USER_EFFECTIVE_PERMISSIONS: (userId: string) =>
            `v1/rbac/users/${encodeURIComponent(userId)}/effective-permissions`,
    },
    MEDIA: {
        UPLOAD: 'media/upload',
        PRESIGNED_URL: 'media/presigned-url',
        CONFIRM: 'media/confirm',
        LIST: 'media',
        DETAIL: (id: string) => `media/${encodeURIComponent(id)}`,
        DELETE: (id: string) => `media/${encodeURIComponent(id)}`,
    },
    SELLER: {
        APPLICATIONS: 'v1/seller/applications',
        APPLICATIONS_ME: 'v1/seller/applications/me',
        SHOP_ME: 'v1/seller/shop/me',
        WALLET: 'v1/seller/shop/me/wallet',
        WALLET_WITHDRAW: 'v1/seller/shop/me/wallet/withdraw',
        PUBLIC_SHOP: (slug: string) => `v1/shops/${encodeURIComponent(slug)}`,

        ADMIN_APPLICATIONS: 'v1/admin/seller/applications',
        ADMIN_APPLICATION_DETAIL: (id: string) => `v1/admin/seller/applications/${encodeURIComponent(id)}`,
        ADMIN_APPLICATION_APPROVE: (id: string) => `v1/admin/seller/applications/${encodeURIComponent(id)}/approve`,
        ADMIN_APPLICATION_REJECT: (id: string) => `v1/admin/seller/applications/${encodeURIComponent(id)}/reject`,
        ADMIN_SHOP_VERIFY: (id: string) => `v1/admin/seller/shops/${encodeURIComponent(id)}/verify`,
        ADMIN_SHOP_SUSPEND: (id: string) => `v1/admin/seller/shops/${encodeURIComponent(id)}/suspend`,
        ADMIN_SHOP_RESTORE: (id: string) => `v1/admin/seller/shops/${encodeURIComponent(id)}/restore`,
    },
    CATALOG: {
        CATEGORIES: 'v1/categories',
        PUBLIC_PRODUCTS: 'v1/products',
        PUBLIC_PRODUCT_DETAIL: (idOrSlug: string) => `v1/products/${encodeURIComponent(idOrSlug)}`,
        SELLER_PRODUCTS: 'v1/seller/products',
        SELLER_PRODUCT_DETAIL: (id: string) => `v1/seller/products/${encodeURIComponent(id)}`,
        SELLER_PRODUCT_SUSPEND: (id: string) => `v1/seller/products/${encodeURIComponent(id)}/suspend`,
        SELLER_PRODUCT_RESTORE: (id: string) => `v1/seller/products/${encodeURIComponent(id)}/restore`,
        ADMIN_PRODUCTS: 'v1/admin/products',
        ADMIN_PRODUCT_DETAIL: (id: string) => `v1/admin/products/${encodeURIComponent(id)}`,
        ADMIN_PRODUCT_APPROVE: (id: string) => `v1/admin/products/${encodeURIComponent(id)}/approve`,
        ADMIN_PRODUCT_REJECT: (id: string) => `v1/admin/products/${encodeURIComponent(id)}/reject`,
        ADMIN_PRODUCT_SUSPEND: (id: string) => `v1/admin/products/${encodeURIComponent(id)}/suspend`,
        ADMIN_PRODUCT_RESTORE: (id: string) => `v1/admin/products/${encodeURIComponent(id)}/restore`,
        ADMIN_CATEGORIES: 'v1/admin/categories',
        ADMIN_CATEGORY_DETAIL: (id: string) => `v1/admin/categories/${encodeURIComponent(id)}`,
    },
    CART: {
        ROOT: 'v1/cart',
        ITEMS: 'v1/cart/items',
        ITEM: (id: string) => `v1/cart/items/${encodeURIComponent(id)}`,
    },
    ORDER: {
        ROOT: 'v1/orders',
        CHECKOUT: 'v1/orders/checkout',
        DETAIL: (id: string) => `v1/orders/${encodeURIComponent(id)}`,
        CANCEL: (id: string) => `v1/orders/${encodeURIComponent(id)}/cancel`,
        SELLER_ORDERS: 'v1/orders/seller/all',
        SELLER_UPDATE_STATUS: (id: string) => `v1/orders/seller/${encodeURIComponent(id)}/status`,
    },
    ADDRESS: {
        ROOT: 'v1/addresses',
        DETAIL: (id: string) => `v1/addresses/${encodeURIComponent(id)}`,
        DEFAULT: (id: string) => `v1/addresses/${encodeURIComponent(id)}/default`,
    },
    PROMOTION: {
        ADMIN_VOUCHERS: 'v1/admin/vouchers',
        ADMIN_VOUCHER_DETAIL: (id: string) => `v1/admin/vouchers/${encodeURIComponent(id)}`,
        ADMIN_VOUCHER_STATUS: (id: string) => `v1/admin/vouchers/${encodeURIComponent(id)}/status`,
        ADMIN_CAMPAIGNS: 'v1/admin/campaigns',
        ADMIN_CAMPAIGN_DETAIL: (id: string) => `v1/admin/campaigns/${encodeURIComponent(id)}`,
        ADMIN_CAMPAIGN_STATUS: (id: string) => `v1/admin/campaigns/${encodeURIComponent(id)}/status`,
        ADMIN_CAMPAIGN_PRODUCT_REVIEW: (campaignId: string, productId: string) =>
            `v1/admin/campaigns/${encodeURIComponent(campaignId)}/products/${encodeURIComponent(productId)}/review`,
        VALIDATE_VOUCHER: 'v1/promotions/validate-voucher',
        AVAILABLE_VOUCHERS: 'v1/promotions/available-vouchers',
        SELLER_VOUCHERS: 'v1/seller/vouchers',
        SELLER_VOUCHER_DETAIL: (id: string) => `v1/seller/vouchers/${encodeURIComponent(id)}`,
        SELLER_VOUCHER_STATUS: (id: string) => `v1/seller/vouchers/${encodeURIComponent(id)}/status`,
        SAVE_VOUCHER: (id: string) => `v1/promotions/vouchers/${encodeURIComponent(id)}/save`,
        MY_SAVED_VOUCHERS: 'v1/promotions/my-saved-vouchers',
        MY_VOUCHERS: 'v1/promotions/my-vouchers',
        CLAIM_VOUCHER_CODE: 'v1/promotions/claim-code',
    },
    ENGAGEMENT: {
        REVIEWS: 'v1/engagement/reviews',
        SUMMARY: 'v1/engagement/reviews/summary',
        PENDING: 'v1/engagement/reviews/pending',
        COMMENTS: (reviewId: string) => `v1/engagement/reviews/${encodeURIComponent(reviewId)}/comments`,
        HELPFUL: (reviewId: string) => `v1/engagement/reviews/${encodeURIComponent(reviewId)}/helpful`,
    },
    NOTIFICATION: {
        LIST: 'v1/notifications',
        UNREAD_COUNT: 'v1/notifications/unread-count',
        MARK_READ: (id: string) => `v1/notifications/${encodeURIComponent(id)}/read`,
        MARK_ALL_READ: 'v1/notifications/read-all',
    },
    CHAT: {
        CONVERSATIONS: 'v1/chat/conversations',
        CONVERSATION_DETAIL: (id: string) => `v1/chat/conversations/${encodeURIComponent(id)}`,
        MESSAGES: (id: string) => `v1/chat/conversations/${encodeURIComponent(id)}/messages`,
        SEND_MESSAGE: (id: string) => `v1/chat/conversations/${encodeURIComponent(id)}/messages`,
        SEND: 'v1/chat/messages',
        READ: (id: string) => `v1/chat/conversations/${encodeURIComponent(id)}/read`,
    },
    WISHLIST: {
        LIST: 'v1/wishlist',
        IDS: 'v1/wishlist/ids',
        TOGGLE: (productId: string) => `v1/wishlist/${encodeURIComponent(productId)}/toggle`,
        REMOVE: (productId: string) => `v1/wishlist/${encodeURIComponent(productId)}`,
    },
    CONTENT: {
        FEED: 'v1/feed/videos',
        VIDEO_DETAIL: (id: string) => `v1/feed/videos/${encodeURIComponent(id)}`,
        VIEW: (id: string) => `v1/feed/videos/${encodeURIComponent(id)}/view`,
        LIKE: (id: string) => `v1/feed/videos/${encodeURIComponent(id)}/like`,
        COMMENTS: (id: string) => `v1/feed/videos/${encodeURIComponent(id)}/comments`,
        SELLER_VIDEOS: 'v1/seller/posts/videos',
        SELLER_VIDEO_DETAIL: (id: string) => `v1/seller/posts/videos/${encodeURIComponent(id)}`,
    },
} as const
