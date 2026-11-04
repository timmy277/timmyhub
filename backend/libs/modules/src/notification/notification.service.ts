import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import type { Prisma } from '@timmyhub/prisma'
import { NotificationChannel, PrismaService } from '@timmyhub/prisma'
import type {
    CreateNotificationInput,
    NotificationItemDto,
    NotificationListResponseDto,
    NotificationPreferencesDto,
    NotificationQueryDto,
    UnreadCountResponseDto,
    UpdateNotificationPreferencesInput,
} from '@timmyhub/contracts'
import { NOTIFICATION_TYPE, UserRole } from '@timmyhub/contracts'

import { DOMAIN_EVENT } from './notification.constants'
import { NotificationGateway } from './notification.gateway'

@Injectable()
export class NotificationService {
    // ===== Dependencies =====
    private readonly logger = new Logger(NotificationService.name)

    constructor(
        private readonly prisma: PrismaService,
        private readonly gateway: NotificationGateway,
    ) {}

    // ===== Queries =====

    async getMyNotifications(userId: string, query: NotificationQueryDto): Promise<NotificationListResponseDto> {
        const page = query.page ?? 1
        const limit = query.limit ?? 10
        const skip = (page - 1) * limit

        const where: Prisma.NotificationWhereInput = {
            userId,
            ...(query.type ? { type: query.type } : {}),
            ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
        }

        const [records, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({ where: { userId, isRead: false } }),
        ])

        const items: NotificationItemDto[] = records.map((r) => {
            const p = (r.params as Record<string, unknown>) ?? {}
            return {
                id: r.id,
                userId: r.userId,
                type: r.type,
                templateKey: r.templateKey,
                title: (p.title as string | undefined) ?? undefined,
                message: (p.message as string | undefined) ?? undefined,
                params: p,
                channel: r.channel,
                isRead: r.isRead,
                readAt: r.readAt?.toISOString() ?? null,
                actionUrl: r.actionUrl,
                createdAt: r.createdAt.toISOString(),
            }
        })

        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1,
            unreadCount,
        }
    }

    async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
        const count = await this.prisma.notification.count({
            where: { userId, isRead: false },
        })
        return { count }
    }

    async getMyPreferences(userId: string): Promise<NotificationPreferencesDto> {
        const records = await this.prisma.notificationPreference.findMany({
            where: { userId },
        })

        const findEnabled = (type: string, channel: NotificationChannel, defaultValue: boolean): boolean => {
            const found = records.find((r) => r.type === type && r.channel === channel)
            return found ? found.enabled : defaultValue
        }

        return {
            orderInApp: findEnabled('ORDER_STATUS', NotificationChannel.IN_APP, true),
            orderEmail: findEnabled('ORDER_STATUS', NotificationChannel.EMAIL, true),
            promoInApp: findEnabled('PROMOTION', NotificationChannel.IN_APP, true),
            promoEmail: findEnabled('PROMOTION', NotificationChannel.EMAIL, false),
            securityEmail: findEnabled('SECURITY', NotificationChannel.EMAIL, true),
            chatInApp: findEnabled('CHAT', NotificationChannel.IN_APP, true),
            sellerInApp: findEnabled('SELLER', NotificationChannel.IN_APP, true),
            systemInApp: findEnabled('SYSTEM', NotificationChannel.IN_APP, true),
        }
    }

    // ===== Commands =====

    async updateMyPreferences(
        userId: string,
        input: UpdateNotificationPreferencesInput,
    ): Promise<NotificationPreferencesDto> {
        const items = [
            { type: 'ORDER_STATUS', channel: NotificationChannel.IN_APP, enabled: Boolean(input.orderInApp) },
            { type: 'ORDER_STATUS', channel: NotificationChannel.EMAIL, enabled: Boolean(input.orderEmail) },
            { type: 'PROMOTION', channel: NotificationChannel.IN_APP, enabled: Boolean(input.promoInApp) },
            { type: 'PROMOTION', channel: NotificationChannel.EMAIL, enabled: Boolean(input.promoEmail) },
            { type: 'SECURITY', channel: NotificationChannel.EMAIL, enabled: Boolean(input.securityEmail) },
            { type: 'CHAT', channel: NotificationChannel.IN_APP, enabled: Boolean(input.chatInApp) },
            {
                type: 'SELLER',
                channel: NotificationChannel.IN_APP,
                enabled: input.sellerInApp !== undefined ? Boolean(input.sellerInApp) : true,
            },
            {
                type: 'SYSTEM',
                channel: NotificationChannel.IN_APP,
                enabled: input.systemInApp !== undefined ? Boolean(input.systemInApp) : true,
            },
        ]

        await this.prisma.$transaction(
            items.map((item) =>
                this.prisma.notificationPreference.upsert({
                    where: {
                        userId_type_channel: {
                            userId,
                            type: item.type,
                            channel: item.channel,
                        },
                    },
                    update: { enabled: item.enabled },
                    create: {
                        userId,
                        type: item.type,
                        channel: item.channel,
                        enabled: item.enabled,
                    },
                }),
            ),
        )

        return this.getMyPreferences(userId)
    }

    async createNotification(input: CreateNotificationInput): Promise<NotificationItemDto | null> {
        const channel = (input.channel as NotificationChannel) || NotificationChannel.IN_APP
        const targetType = input.type ?? NOTIFICATION_TYPE.SYSTEM

        // Kiểm tra cài đặt bật/tắt thông báo của người nhận
        const pref = await this.prisma.notificationPreference.findUnique({
            where: {
                userId_type_channel: {
                    userId: input.userId,
                    type: targetType,
                    channel,
                },
            },
        })

        if (pref && !pref.enabled) {
            this.logger.debug(
                `Skipped notification for user ${input.userId} because preference ${targetType}/${channel} is disabled`,
            )
            return null
        }

        const mergedParams: Record<string, unknown> = {
            ...((input.params as Record<string, unknown>) ?? {}),
            ...(input.title ? { title: input.title } : {}),
            ...(input.message ? { message: input.message } : {}),
        }
        const record = await this.prisma.notification.create({
            data: {
                userId: input.userId,
                type: targetType,
                templateKey: input.templateKey,
                params: mergedParams as Prisma.InputJsonValue,
                channel,
                actionUrl: input.actionUrl ?? null,
            },
        })

        const p = (record.params as Record<string, unknown>) ?? {}
        const dto: NotificationItemDto = {
            id: record.id,
            userId: record.userId,
            type: record.type,
            templateKey: record.templateKey,
            title: (p.title as string | undefined) ?? undefined,
            message: (p.message as string | undefined) ?? undefined,
            params: p,
            channel: record.channel,
            isRead: record.isRead,
            readAt: record.readAt?.toISOString() ?? null,
            actionUrl: record.actionUrl,
            createdAt: record.createdAt.toISOString(),
        }

        // Bắn tín hiệu realtime qua WebSocket
        this.gateway.emitNewNotification(input.userId, dto)
        this.logger.debug(`Created and emitted notification ${record.id} for user ${input.userId}`)

        return dto
    }

    async markAsRead(id: string, userId: string): Promise<{ success: boolean }> {
        const result = await this.prisma.notification.updateMany({
            where: { id, userId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        })

        if (result.count > 0) {
            this.gateway.emitNotificationRead(userId, id)
        }

        return { success: result.count > 0 }
    }

    async markAllAsRead(userId: string): Promise<{ success: boolean }> {
        await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        })

        this.gateway.emitNotificationReadAll(userId)
        return { success: true }
    }

    // ===== Domain Event Listeners =====

    @OnEvent(DOMAIN_EVENT.ORDER_CREATED)
    async handleOrderCreated(payload: {
        orderId: string
        orderNumber: string
        userId: string
        shopId?: string
        totalAmount?: string
    }): Promise<void> {
        try {
            // 1. Gửi thông báo cho Buyer
            await this.createNotification({
                userId: payload.userId,
                type: NOTIFICATION_TYPE.ORDER_STATUS,
                templateKey: 'order.created',
                params: {
                    orderNumber: payload.orderNumber,
                    totalAmount: payload.totalAmount ?? '',
                },
                actionUrl: `/orders/${payload.orderId}`,
            })

            // 2. Nếu có shopId, tìm chủ shop và gửi thông báo cho Seller
            if (payload.shopId) {
                const sellerProfile = await this.prisma.sellerProfile.findUnique({
                    where: { id: payload.shopId },
                    select: { userId: true, shopName: true },
                })
                if (sellerProfile?.userId) {
                    await this.createNotification({
                        userId: sellerProfile.userId,
                        type: NOTIFICATION_TYPE.SELLER,
                        templateKey: 'order.new_order_seller',
                        params: {
                            orderNumber: payload.orderNumber,
                            totalAmount: payload.totalAmount ?? '',
                        },
                        actionUrl: `/seller/orders?id=${payload.orderId}`,
                    })
                }
            }
        } catch (error) {
            this.logger.error(`Failed to handle order.created event: ${(error as Error).message}`)
        }
    }

    @OnEvent(DOMAIN_EVENT.ORDER_STATUS_UPDATED)
    async handleOrderStatusUpdated(payload: {
        orderId: string
        orderNumber: string
        userId: string
        newStatus: string
        shopId?: string
    }): Promise<void> {
        try {
            // Gửi thông báo cho Buyer về trạng thái mới
            await this.createNotification({
                userId: payload.userId,
                type: NOTIFICATION_TYPE.ORDER_STATUS,
                templateKey: 'order.status_updated',
                params: {
                    orderNumber: payload.orderNumber,
                    status: payload.newStatus,
                },
                actionUrl: `/orders/${payload.orderId}`,
            })
        } catch (error) {
            this.logger.error(`Failed to handle order.status_updated event: ${(error as Error).message}`)
        }
    }

    @OnEvent(DOMAIN_EVENT.ORDER_CANCELLED)
    async handleOrderCancelled(payload: {
        orderId: string
        orderNumber: string
        userId: string
        cancelledBy: string
        reason?: string
        shopId?: string
    }): Promise<void> {
        try {
            await this.createNotification({
                userId: payload.userId,
                type: NOTIFICATION_TYPE.ORDER_STATUS,
                templateKey: 'order.cancelled',
                params: {
                    orderNumber: payload.orderNumber,
                    reason: payload.reason ?? '',
                },
                actionUrl: `/orders/${payload.orderId}`,
            })
        } catch (error) {
            this.logger.error(`Failed to handle order.cancelled event: ${(error as Error).message}`)
        }
    }

    @OnEvent(DOMAIN_EVENT.SELLER_APPLICATION_SUBMITTED)
    async handleSellerApplicationSubmitted(payload: {
        applicationId: string
        userId: string
        shopName: string
    }): Promise<void> {
        try {
            // Tìm tất cả admin/super_admin để thông báo có đơn xét duyệt mở shop mới
            const admins = await this.prisma.user.findMany({
                where: {
                    roles: {
                        hasSome: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
                    },
                },
                select: { id: true },
            })

            for (const admin of admins) {
                await this.createNotification({
                    userId: admin.id,
                    type: NOTIFICATION_TYPE.SYSTEM,
                    templateKey: 'seller.application_submitted',
                    title: 'Hồ sơ Người bán mới cần duyệt',
                    message: `Shop "${payload.shopName}" vừa nộp hồ sơ đăng ký mở gian hàng.`,
                    params: {
                        applicationId: payload.applicationId,
                        shopName: payload.shopName,
                    },
                    actionUrl: '/seller-management',
                })
            }
        } catch (error) {
            this.logger.error(`Failed to handle seller.application.submitted: ${(error as Error).message}`)
        }
    }

    @OnEvent(DOMAIN_EVENT.SELLER_APPLICATION_APPROVED)
    async handleSellerApplicationApproved(payload: { userId: string; shopName?: string }): Promise<void> {
        try {
            await this.createNotification({
                userId: payload.userId,
                type: NOTIFICATION_TYPE.SELLER,
                templateKey: 'seller.application_approved',
                title: 'Hồ sơ Người bán đã được duyệt',
                message: `Chúc mừng! Hồ sơ shop "${payload.shopName ?? ''}" đã được phê duyệt thành công.`,
                params: { shopName: payload.shopName ?? '' },
                actionUrl: '/seller',
            })
        } catch (error) {
            this.logger.error(`Failed to handle seller.application.approved: ${(error as Error).message}`)
        }
    }

    @OnEvent(DOMAIN_EVENT.SELLER_APPLICATION_REJECTED)
    async handleSellerApplicationRejected(payload: { userId: string; reason?: string }): Promise<void> {
        try {
            await this.createNotification({
                userId: payload.userId,
                type: NOTIFICATION_TYPE.SELLER,
                templateKey: 'seller.application_rejected',
                title: 'Hồ sơ Người bán bị từ chối',
                message: `Hồ sơ đăng ký Người bán chưa được duyệt.${payload.reason ? ` Lý do: ${payload.reason}` : ''}`,
                params: { reason: payload.reason ?? '' },
                actionUrl: '/seller/register',
            })
        } catch (error) {
            this.logger.error(`Failed to handle seller.application.rejected: ${(error as Error).message}`)
        }
    }
}
