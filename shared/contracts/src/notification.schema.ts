import { z } from 'zod'

// ===== Enums & Constants =====
export const NOTIFICATION_TYPE = {
    ORDER_STATUS: 'ORDER_STATUS',
    PAYMENT: 'PAYMENT',
    PROMOTION: 'PROMOTION',
    SELLER: 'SELLER',
    ENGAGEMENT: 'ENGAGEMENT',
    SYSTEM: 'SYSTEM',
} as const
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

export const NOTIFICATION_CHANNEL = {
    IN_APP: 'IN_APP',
    EMAIL: 'EMAIL',
    PUSH: 'PUSH',
    SMS: 'SMS',
} as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL]

export const NOTIFICATION_REALTIME_EVENT = {
    NEW: 'notification:new',
    READ: 'notification:read',
    READ_ALL: 'notification:read_all',
} as const
export type NotificationRealtimeEvent = (typeof NOTIFICATION_REALTIME_EVENT)[keyof typeof NOTIFICATION_REALTIME_EVENT]

export const NOTIFICATION_TEMPLATE = {
    ORDER_CREATED: 'order.created',
    ORDER_STATUS_UPDATED: 'order.status_updated',
    ORDER_CANCELLED: 'order.cancelled',
    ORDER_NEW_ORDER_SELLER: 'order.new_order_seller',
    SELLER_APPLICATION_APPROVED: 'seller.application_approved',
    SELLER_APPLICATION_REJECTED: 'seller.application_rejected',
    PROMOTION_NEW: 'promotion.new',
    SYSTEM_WELCOME: 'system.welcome',
} as const
export type NotificationTemplate = (typeof NOTIFICATION_TEMPLATE)[keyof typeof NOTIFICATION_TEMPLATE]

// ===== Schemas & DTOs =====

export const NotificationItemSchema = z.object({
    id: z.string(),
    userId: z.string(),
    title: z.string().optional(),
    message: z.string().optional(),
    type: z.string().default('SYSTEM'),
    templateKey: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional().default({}),
    data: z.record(z.string(), z.unknown()).nullable().optional(),
    channel: z.enum(['IN_APP', 'EMAIL', 'PUSH', 'SMS']).optional().default('IN_APP'),
    isRead: z.boolean().default(false),
    readAt: z.union([z.string(), z.date()]).nullable().optional(),
    actionUrl: z.string().nullable().optional(),
    createdAt: z.union([z.string(), z.date()]),
    updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type NotificationItemDto = z.infer<typeof NotificationItemSchema>

export const NotificationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    type: z.string().trim().optional(),
    isRead: z.coerce
        .string()
        .optional()
        .transform((val) => {
            if (val === undefined || val === '') return undefined
            return val === 'true'
        }),
})
export type NotificationQueryDto = z.infer<typeof NotificationQuerySchema>

export const NotificationListResponseSchema = z.object({
    items: z.array(NotificationItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    unreadCount: z.number().int().nonnegative(),
})
export type NotificationListResponseDto = z.infer<typeof NotificationListResponseSchema>

export const UnreadCountResponseSchema = z.object({
    count: z.number().int().nonnegative(),
})
export type UnreadCountResponseDto = z.infer<typeof UnreadCountResponseSchema>

export const CreateNotificationInputSchema = z.object({
    userId: z.string().trim().min(1),
    type: z.string().trim().default(NOTIFICATION_TYPE.SYSTEM),
    templateKey: z.string().trim().min(1),
    title: z.string().optional(),
    message: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional().default({}),
    channel: z.enum(['IN_APP', 'EMAIL', 'PUSH', 'SMS']).optional().default('IN_APP'),
    actionUrl: z.string().trim().nullable().optional(),
})
export type CreateNotificationInput = z.input<typeof CreateNotificationInputSchema>
