// Tên event đi qua transactional outbox (CLAUDE.md luật #3) — khớp docs/01-architecture/event-catalog.md.
// Producer ghi `eventType` từ đây, consumer lọc theo cùng hằng số; không gõ chuỗi event trần.
export const OUTBOX_EVENT = {
    USER_REGISTERED: 'user.registered',
    USER_PROFILE_UPDATED: 'user.profile-updated',
    USER_LOCKED: 'user.locked',
    USER_DELETED: 'user.deleted',
    USER_ROLE_GRANTED: 'user.role-granted',
    USER_ROLE_REVOKED: 'user.role-revoked',
    RBAC_PERMISSIONS_CHANGED: 'rbac.permissions.changed',
    // domain seller — docs/03-specs/seller-onboarding/design.md §3
    SELLER_APPLICATION_SUBMITTED: 'seller.application.submitted',
    SELLER_APPLICATION_APPROVED: 'seller.application.approved',
    SELLER_APPLICATION_REJECTED: 'seller.application.rejected',
    SELLER_SHOP_UPDATED: 'seller.shop.updated',
    SELLER_SHOP_SUSPENDED: 'seller.shop.suspended',
    SELLER_SHOP_RESTORED: 'seller.shop.restored',
    // domain catalog / product
    PRODUCT_CREATED: 'catalog.product.created',
    PRODUCT_SUBMITTED: 'catalog.product.submitted',
    PRODUCT_APPROVED: 'catalog.product.approved',
    PRODUCT_REJECTED: 'catalog.product.rejected',
    PRODUCT_UPDATED: 'catalog.product.updated',
    PRODUCT_SUSPENDED: 'catalog.product.suspended',
    PRODUCT_RESTORED: 'catalog.product.restored',
    PRODUCT_DELETED: 'catalog.product.deleted',
} as const

export type OutboxEventType = (typeof OUTBOX_EVENT)[keyof typeof OUTBOX_EVENT]

// aggregateType của outbox = service sở hữu aggregate (service-catalog.md).
export const OUTBOX_AGGREGATE = {
    IDENTITY: 'identity',
    SELLER: 'seller',
    CATALOG: 'catalog',
} as const

export type OutboxAggregateType = (typeof OUTBOX_AGGREGATE)[keyof typeof OUTBOX_AGGREGATE]
