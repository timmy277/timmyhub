// Hằng số cho domain seller-onboarding (FEAT-SEL-*) — coding-standards.md §4.3: không khai báo trong file class.

// REQ-SEL-005: Giới hạn tần suất nộp lại đơn — phải cách 24 giờ kể từ lúc bị từ chối gần nhất
export const REAPPLICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000

// Phân trang mặc định
export const DEFAULT_SELLER_PAGE = 1
export const DEFAULT_SELLER_PAGE_SIZE = 20

// Tên route cho seller & admin
export const SELLER_ROUTE = {
    // Luồng user / seller
    APPLICATIONS: 'v1/seller/applications',
    APPLICATIONS_ME: 'me',
    SHOP_ME: 'v1/seller/shop/me',
    PUBLIC_SHOPS: 'v1/shops',
    PUBLIC_SHOP_SLUG: ':slug',

    // Luồng admin quản trị
    ADMIN_APPLICATIONS: 'v1/admin/seller/applications',
    ADMIN_APPLICATION_APPROVE: ':id/approve',
    ADMIN_APPLICATION_REJECT: ':id/reject',
    ADMIN_SHOPS: 'v1/admin/seller/shops',
    ADMIN_SHOP_VERIFY: ':id/verify',
    ADMIN_SHOP_SUSPEND: ':id/suspend',
    ADMIN_SHOP_RESTORE: ':id/restore',
} as const
