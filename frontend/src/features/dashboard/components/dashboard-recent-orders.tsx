'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, ReceiptTextIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { RecentOrderTransaction } from '@timmyhub/contracts'

import {
    Avatar,
    AvatarFallback,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components'
import { ROUTE } from '@/constants'
import { cn, formatCurrencyVND } from '@/utils'

interface DashboardRecentOrdersProps {
    orders: RecentOrderTransaction[]
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
    COMPLETED: {
        label: 'Hoàn tất',
        class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    DELIVERED: {
        label: 'Đã giao',
        class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    SHIPPING: {
        label: 'Đang giao',
        class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    PROCESSING: {
        label: 'Chuẩn bị hàng',
        class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    PENDING: {
        label: 'Chờ thanh toán',
        class: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    },
    CANCELLED: {
        label: 'Đã hủy',
        class: 'bg-destructive/10 text-destructive border-destructive/20',
    },
}

export const DashboardRecentOrders = memo(function DashboardRecentOrders({ orders }: DashboardRecentOrdersProps) {
    const t = useTranslations('dashboard')

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <ReceiptTextIcon className="size-4" />
                        </div>
                        <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                            {t('recentOrdersTitle')}
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                        {t('recentOrdersDescription')}
                    </CardDescription>
                </div>

                <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs gap-1 h-8">
                    <Link href={ROUTE.SELLER_ORDERS}>
                        <span>{t('viewAllOrders')}</span>
                        <ArrowRightIcon className="size-3.5" />
                    </Link>
                </Button>
            </CardHeader>

            <CardContent className="pt-2 px-2 sm:px-4">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border/50 text-muted-foreground text-left">
                                <th className="pb-2.5 font-semibold pl-2">{t('orderCode')}</th>
                                <th className="pb-2.5 font-semibold">{t('customer')}</th>
                                <th className="pb-2.5 font-semibold">{t('amount')}</th>
                                <th className="pb-2.5 font-semibold">{t('method')}</th>
                                <th className="pb-2.5 font-semibold pr-2">{t('status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {orders.map((order) => {
                                const statusInfo = STATUS_CONFIG[order.status] || {
                                    label: order.status,
                                    class: 'bg-muted text-muted-foreground border-border/50',
                                }
                                const initials = order.customerName
                                    .split(' ')
                                    .slice(-2)
                                    .map((w) => w[0])
                                    .join('')
                                    .toUpperCase()

                                return (
                                    <tr key={order.id} className="hover:bg-muted/30 transition-colors rounded-lg group">
                                        <td className="py-3 pl-2 font-mono font-bold text-foreground">
                                            {order.orderNumber}
                                        </td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="size-6 text-[10px]">
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {initials || 'KH'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <span className="font-medium text-foreground block truncate max-w-[130px]">
                                                        {order.customerName}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {order.itemCount} sản phẩm
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrencyVND(order.totalAmount)}
                                        </td>
                                        <td className="py-3">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-mono px-1.5 py-0 h-4 rounded-md uppercase"
                                            >
                                                {order.paymentMethod}
                                            </Badge>
                                        </td>
                                        <td className="py-3 pr-2">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                                                    statusInfo.class,
                                                )}
                                            >
                                                {statusInfo.label}
                                            </Badge>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
})
