'use client'

import { memo } from 'react'
import Link from 'next/link'
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, PackageIcon, RotateCcwIcon, TruckIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { SellerActionTodos } from '@timmyhub/contracts'

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components'
import { ROUTE } from '@/constants'
import { cn } from '@/utils'

interface SellerTodoBarProps {
    todos: SellerActionTodos
}

export const SellerTodoBar = memo(function SellerTodoBar({ todos }: SellerTodoBarProps) {
    const t = useTranslations('seller.portal')

    const items = [
        {
            id: 'confirm',
            label: t('todoPendingConfirm'),
            count: todos.pendingConfirm,
            href: `${ROUTE.SELLER_ORDERS}?status=PENDING`,
            icon: ClockIcon,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-500/10 hover:bg-violet-500/15 border-violet-500/20',
            badgeClass: 'bg-violet-500 text-white',
        },
        {
            id: 'pickup',
            label: t('todoPendingPickup'),
            count: todos.pendingPickup,
            href: `${ROUTE.SELLER_ORDERS}?status=PROCESSING`,
            icon: PackageIcon,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20',
            badgeClass: 'bg-amber-500 text-white',
        },
        {
            id: 'shipping',
            label: t('todoShipped'),
            count: todos.shipping,
            href: `${ROUTE.SELLER_ORDERS}?status=SHIPPING`,
            icon: TruckIcon,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20',
            badgeClass: 'bg-blue-500 text-white',
        },
        {
            id: 'refund',
            label: t('todoRefund'),
            count: todos.returnRefund,
            href: `${ROUTE.SELLER_ORDERS}?status=RETURN_REQUESTED`,
            icon: RotateCcwIcon,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20',
            badgeClass: 'bg-rose-500 text-white',
        },
        {
            id: 'stock',
            label: t('todoOutOfStock'),
            count: todos.outOfStock,
            href: ROUTE.PRODUCTS,
            icon: AlertTriangleIcon,
            color: 'text-orange-600 dark:text-orange-400',
            bg: 'bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/20',
            badgeClass: 'bg-orange-500 text-white',
        },
    ]

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="py-3 px-5 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-primary" />
                    <span>{t('todoTitle')}</span>
                </CardTitle>
                <span className="text-[11px] text-muted-foreground font-medium">
                    Các tác vụ cần xử lý ngay để đảm bảo SLA
                </span>
            </CardHeader>

            <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {items.map((item) => {
                        const Icon = item.icon
                        const hasUrgent = item.count > 0

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={cn(
                                    'group relative flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5',
                                    item.bg,
                                )}
                            >
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Icon className={cn('size-4', item.color)} />
                                    <span className="text-xs font-semibold text-foreground/90">{item.label}</span>
                                </div>

                                <div className="flex items-baseline gap-1 mt-1">
                                    <span
                                        className={cn(
                                            'text-2xl font-black font-mono transition-transform duration-300 group-hover:scale-105',
                                            hasUrgent ? item.color : 'text-muted-foreground/60',
                                        )}
                                    >
                                        {item.count}
                                    </span>
                                </div>

                                {hasUrgent && (
                                    <Badge
                                        className={cn(
                                            'absolute -top-1.5 -right-1.5 text-[9px] px-1.5 py-0 h-4 font-bold border-0 shadow-xs',
                                            item.badgeClass,
                                        )}
                                    >
                                        Cần xử lý
                                    </Badge>
                                )}
                            </Link>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
})
