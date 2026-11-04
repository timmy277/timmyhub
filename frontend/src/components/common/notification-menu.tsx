'use client'

import Link from 'next/link'
import { BellIcon, CheckCheckIcon, InfoIcon, PackageIcon, StoreIcon, TagIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { NotificationItemDto } from '@timmyhub/contracts'
import { NOTIFICATION_TYPE } from '@timmyhub/contracts'

import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    ScrollArea,
} from '@/components/ui'
import { useNotifications } from '@/hooks'
import { formatTimestamp, resolveNotificationContent, resolveTargetHref } from '@/utils'

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

export function NotificationMenu() {
    const t = useTranslations('nav')
    const { isAuthenticated, unreadCount, notifications, markAsRead, markAllAsRead, isMarkingAllRead } =
        useNotifications()

    const label = unreadCount > 0 ? `${t('notifications')} (${unreadCount})` : t('notifications')

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={label} className="relative">
                    <BellIcon aria-hidden className="size-4 text-primary" />
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
