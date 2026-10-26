'use client'

import { memo } from 'react'
import {
    ArrowDownRightIcon,
    ArrowUpRightIcon,
    CreditCardIcon,
    PackageCheckIcon,
    ShoppingBagIcon,
    UsersIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { DashboardKpis } from '@timmyhub/contracts'

import { Card } from '@/components'
import { cn, formatCurrencyVND, formatNumberVND } from '@/utils'

interface DashboardKpiCardsProps {
    kpis: DashboardKpis
}

function MiniSparkline({ data, color = '#10b981', height = 36 }: { data: number[]; color?: string; height?: number }) {
    if (!data || data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const width = 120

    const points = data
        .map((val, idx) => {
            const x = (idx / (data.length - 1)) * width
            const y = height - ((val - min) / range) * (height - 8) - 4
            return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-24 sm:w-28 h-8 sm:h-9 overflow-visible transition-transform duration-300 group-hover:scale-105"
        >
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
            />
        </svg>
    )
}

export const DashboardKpiCards = memo(function DashboardKpiCards({ kpis }: DashboardKpiCardsProps) {
    const t = useTranslations('dashboard')

    const cards = [
        {
            id: 'gmv',
            title: t('kpiGmv'),
            value: formatCurrencyVND(kpis.gmv),
            change: kpis.gmvChange,
            sparkline: kpis.sparklines.gmv,
            color: '#10b981', // Emerald
            icon: ShoppingBagIcon,
            accentClass: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
            iconBoxClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        },
        {
            id: 'orders',
            title: t('kpiOrders'),
            value: formatNumberVND(kpis.orderCount),
            unit: t('unitOrders'),
            change: kpis.orderCountChange,
            sparkline: kpis.sparklines.orders,
            color: '#3b82f6', // Blue
            icon: PackageCheckIcon,
            accentClass: 'from-blue-500/15 via-blue-500/5 to-transparent',
            iconBoxClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        },
        {
            id: 'users',
            title: t('kpiUsers'),
            value: formatNumberVND(kpis.activeUsers),
            unit: t('unitCustomers'),
            change: kpis.activeUsersChange,
            sparkline: kpis.sparklines.users,
            color: '#8b5cf6', // Violet
            icon: UsersIcon,
            accentClass: 'from-violet-500/15 via-violet-500/5 to-transparent',
            iconBoxClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
        },
        {
            id: 'aov',
            title: `${t('kpiAov')}`,
            value: formatCurrencyVND(kpis.avgOrderValue),
            subtext: `CR: ${kpis.conversionRate}%`,
            change: kpis.avgOrderValueChange,
            sparkline: kpis.sparklines.conversion,
            color: '#f59e0b', // Amber
            icon: CreditCardIcon,
            accentClass: 'from-amber-500/15 via-amber-500/5 to-transparent',
            iconBoxClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
                const Icon = card.icon
                const isPositive = card.change >= 0

                return (
                    <Card
                        key={card.id}
                        className={cn(
                            'group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-border hover:-translate-y-0.5',
                        )}
                    >
                        {/* Subtle top gradient accent glow */}
                        <div
                            className={cn(
                                'absolute -top-12 -right-12 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl transition-opacity duration-300 opacity-60 group-hover:opacity-90',
                                card.accentClass,
                            )}
                        />

                        {/* Card Header: Icon & Title */}
                        <div className="flex items-center justify-between gap-3 relative z-10">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {card.title}
                            </span>
                            <div
                                className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110',
                                    card.iconBoxClass,
                                )}
                            >
                                <Icon className="size-4" />
                            </div>
                        </div>

                        {/* Card Value */}
                        <div className="mt-3 relative z-10">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                                    {card.value}
                                </h3>
                                {card.unit && (
                                    <span className="text-xs font-medium text-muted-foreground">{card.unit}</span>
                                )}
                            </div>
                            {card.subtext && (
                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{card.subtext}</p>
                            )}
                        </div>

                        {/* Card Footer: Trend Badge & Sparkline */}
                        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2 relative z-10">
                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
                                        isPositive
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                                    )}
                                >
                                    {isPositive ? (
                                        <ArrowUpRightIcon className="size-3" />
                                    ) : (
                                        <ArrowDownRightIcon className="size-3" />
                                    )}
                                    {isPositive ? `+${card.change}%` : `${card.change}%`}
                                </span>
                                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                    {t('vsPreviousPeriod')}
                                </span>
                            </div>

                            <MiniSparkline data={card.sparkline} color={card.color} />
                        </div>
                    </Card>
                )
            })}
        </div>
    )
})
