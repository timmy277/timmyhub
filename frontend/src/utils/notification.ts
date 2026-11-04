import type { NotificationItemDto } from '@timmyhub/contracts'
import { NOTIFICATION_TEMPLATE, NOTIFICATION_TYPE } from '@timmyhub/contracts'

import { ROUTE } from '@/constants'

export function resolveNotificationContent(item: NotificationItemDto): { title: string; message: string } {
    if (item.title && item.message) {
        return { title: item.title, message: item.message }
    }
    const params = item.params ?? {}
    switch (item.templateKey) {
        case NOTIFICATION_TEMPLATE.ORDER_CREATED:
            return {
                title: item.title ?? `Đơn hàng #${params.orderNumber ?? ''} đã tạo`,
                message: item.message ?? `Đơn hàng #${params.orderNumber ?? ''} của bạn đã được tạo thành công.`,
            }
        case NOTIFICATION_TEMPLATE.ORDER_STATUS_UPDATED:
            return {
                title: item.title ?? `Cập nhật đơn hàng #${params.orderNumber ?? ''}`,
                message:
                    item.message ??
                    `Đơn hàng #${params.orderNumber ?? ''} đã chuyển sang trạng thái: ${params.status ?? ''}.`,
            }
        case NOTIFICATION_TEMPLATE.ORDER_CANCELLED:
            return {
                title: item.title ?? `Đơn hàng #${params.orderNumber ?? ''} đã huỷ`,
                message:
                    item.message ??
                    `Đơn hàng #${params.orderNumber ?? ''} đã bị huỷ.${params.reason ? ` Lý do: ${params.reason}` : ''}`,
            }
        case NOTIFICATION_TEMPLATE.ORDER_NEW_ORDER_SELLER:
            return {
                title: item.title ?? `Đơn hàng mới #${params.orderNumber ?? ''}`,
                message:
                    item.message ??
                    `Shop có đơn hàng mới #${params.orderNumber ?? ''} trị giá ${params.totalAmount ?? ''}đ.`,
            }
        case NOTIFICATION_TEMPLATE.SELLER_APPLICATION_SUBMITTED:
            return {
                title: item.title ?? 'Hồ sơ Người bán mới cần duyệt',
                message: item.message ?? `Shop "${params.shopName ?? ''}" vừa gửi hồ sơ đăng ký mở gian hàng.`,
            }
        case NOTIFICATION_TEMPLATE.SELLER_APPLICATION_APPROVED:
            return {
                title: item.title ?? 'Hồ sơ Người bán đã được duyệt',
                message: item.message ?? `Chúc mừng! Hồ sơ shop "${params.shopName ?? ''}" đã được phê duyệt.`,
            }
        case NOTIFICATION_TEMPLATE.SELLER_APPLICATION_REJECTED:
            return {
                title: item.title ?? 'Hồ sơ Người bán bị từ chối',
                message:
                    item.message ??
                    `Hồ sơ đăng ký Người bán chưa được duyệt.${params.reason ? ` Lý do: ${params.reason}` : ''}`,
            }
        case NOTIFICATION_TEMPLATE.PROMOTION_NEW:
            return {
                title: item.title ?? (params.title as string) ?? 'Ưu đãi mới dành cho bạn',
                message: item.message ?? (params.message as string) ?? 'Khám phá ngay các voucher và ưu đãi mới nhất!',
            }
        case NOTIFICATION_TEMPLATE.SYSTEM_WELCOME:
            return {
                title: item.title ?? (params.title as string) ?? 'Chào mừng đến với TimmyHub',
                message:
                    item.message ??
                    (params.message as string) ??
                    'Chào mừng bạn đến với sàn thương mại điện tử TimmyHub!',
            }
        default:
            return {
                title: item.title ?? (params.title as string) ?? 'Thông báo hệ thống',
                message: item.message ?? (params.message as string) ?? '',
            }
    }
}

export function resolveTargetHref(item: NotificationItemDto): string | undefined {
    if (item.actionUrl) {
        return item.actionUrl === '/promotions' ? ROUTE.MY_VOUCHERS : item.actionUrl
    }

    const params = item.params ?? {}
    if (params.orderId) {
        return ROUTE.ORDER_DETAIL(String(params.orderId))
    }

    switch (item.type) {
        case NOTIFICATION_TYPE.ORDER_STATUS:
        case 'ORDER':
            return ROUTE.ORDERS
        case NOTIFICATION_TYPE.PROMOTION:
            return ROUTE.MY_VOUCHERS
        case NOTIFICATION_TYPE.SELLER:
            return ROUTE.SELLER_PORTAL
        case NOTIFICATION_TYPE.SYSTEM:
            return ROUTE.ACCOUNT
        default:
            return undefined
    }
}
