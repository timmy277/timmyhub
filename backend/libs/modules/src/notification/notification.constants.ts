export const NOTIFICATION_ROUTE = {
    ROOT: 'v1/notifications',
    UNREAD_COUNT: 'unread-count',
    READ_ALL: 'read-all',
} as const

export const NOTIFICATION_EVENT = {
    CREATED: 'notification.created',
    READ: 'notification.read',
    READ_ALL: 'notification.read_all',
} as const

export const DOMAIN_EVENT = {
    ORDER_CREATED: 'order.created',
    ORDER_STATUS_UPDATED: 'order.status_updated',
    ORDER_CANCELLED: 'order.cancelled',
    SELLER_APPLICATION_APPROVED: 'seller.application.approved',
    SELLER_APPLICATION_REJECTED: 'seller.application.rejected',
    PRODUCT_APPROVED: 'catalog.product.approved',
    PRODUCT_REJECTED: 'catalog.product.rejected',
} as const
