'use client'

import Link from 'next/link'
import { BellIcon, CheckCheckIcon, InfoIcon, PackageIcon, StoreIcon, TagIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { NotificationItemDto } from '@timmyhub/contracts'
import { NOTIFICATION_TEMPLATE, NOTIFICATION_TYPE } from '@timmyhub/contracts'

import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    ScrollArea,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import { useNotifications } from '@/hooks'
import { formatTimestamp } from '@/utils'

function getNotificationIcon(type: string) {
    switch (type) {
        case NOTIFICATION_TYPE.ORDER_STATUS:
        case 'ORDER':
            return <PackageIcon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
        case NOTIFICATION_TYPE.PROMOTION:
            return <TagIcon className="size-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
        case NOTIFICATION_TYPE.SELLER:
            return <StoreIcon className="size-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden />
        case NOTIFICATION_TYPE.SYSTEM:
        default:
            return <InfoIcon className="size-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden />
    }
}

function resolveNotificationContent(item: NotificationItemDto): { title: string; message: string } {
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
        case NOTIFICATION_TEMPLATE.SELLER_APPLICATION_APPROVED:
            return {
                title: item.title ?? 'Hồ sơ Người bán đã được duyệt',
                message: item.message ?? `Chúc mừng! Hồ sơ shop ${params.shopName ?? ''} đã được phê duyệt.`,
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

function resolveTargetHref(item: NotificationItemDto): string | undefined {
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

export function NotificationMenu() {
    const t = useTranslations('nav')
    const { isAuthenticated, unreadCount, notifications, markAsRead, markAllAsRead, isMarkingAllRead } =
        useNotifications()

    const label = unreadCount > 0 ? `${t('notifications')} (${unreadCount})` : t('notifications')

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={label} className="relative">
                    <BellIcon aria-hidden className="size-4" />
                    {unreadCount > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-200"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 sm:w-96 rounded-xl p-0 shadow-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 font-semibold border-b">
                    <div className="flex items-center gap-2">
                        <span>{t('notifications')}</span>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => markAllAsRead()}
                            disabled={isMarkingAllRead}
                        >
                            <CheckCheckIcon className="size-3.5" aria-hidden />
                            <span>{t('markAllAsRead')}</span>
                        </Button>
                    )}
                </DropdownMenuLabel>

                {!isAuthenticated || notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center text-sm text-muted-foreground">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                            <BellIcon aria-hidden className="size-6 text-muted-foreground/60" />
                        </div>
                        <p className="font-medium text-foreground/80">{t('noNotifications')}</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-80 overflow-y-auto">
                        <div className="divide-y divide-border/40 py-1">
                            {notifications.map((item: NotificationItemDto) => {
                                const targetHref = resolveTargetHref(item)
                                const { title, message } = resolveNotificationContent(item)
                                const Content = (
                                    <div
                                        className={`flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer ${
                                            !item.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''
                                        }`}
                                        onClick={() => {
                                            if (!item.isRead) {
                                                markAsRead(item.id)
                                            }
                                        }}
                                    >
                                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background border shadow-xs">
                                            {getNotificationIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p
                                                    className={`text-xs font-semibold leading-tight line-clamp-1 ${
                                                        !item.isRead ? 'text-foreground' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {title}
                                                </p>
                                                {!item.isRead && (
                                                    <span className="size-2 shrink-0 rounded-full bg-primary mt-1" />
                                                )}
                                            </div>
                                            {message && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {message}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-muted-foreground/70 font-mono">
                                                {formatTimestamp(item.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                )

                                return targetHref ? (
                                    <DropdownMenuItem
                                        key={item.id}
                                        asChild
                                        className="p-0 cursor-pointer focus:bg-transparent"
                                    >
                                        <Link href={targetHref} className="block w-full">
                                            {Content}
                                        </Link>
                                    </DropdownMenuItem>
                                ) : (
                                    <div key={item.id}>{Content}</div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
