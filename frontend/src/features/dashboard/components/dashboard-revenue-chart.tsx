'use client'

import { memo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ArrowUpRightIcon, TrendingUpIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { RevenueTimePoint } from '@timmyhub/contracts'

import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components'
import { formatCurrencyVND } from '@/utils'

interface DashboardRevenueChartProps {
    data: RevenueTimePoint[]
}

const chartConfig: ChartConfig = {
    revenue: {
        label: 'Doanh thu',
        color: '#10b981', // Emerald
    },
    previousRevenue: {
        label: 'Kỳ trước',
        color: '#94a3b8', // Slate
    },
    orders: {
        label: 'Số lượng đơn',
        color: '#3b82f6', // Blue
    },
}

export const DashboardRevenueChart = memo(function DashboardRevenueChart({ data }: DashboardRevenueChartProps) {
    const t = useTranslations('dashboard')
    const [viewMode, setViewMode] = useState<'revenue' | 'orders'>('revenue')

    const totalRevenue = data.reduce((sum, p) => sum + p.revenue, 0)
    const totalOrders = data.reduce((sum, p) => sum + p.orders, 0)
    const maxDay = data.reduce(
        (max, p) => (p.revenue > max.revenue ? p : max),
        data[0] || { label: '', revenue: 0, orders: 0 },
    )

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <TrendingUpIcon className="size-4" />
                        </div>
                        <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                            {t('revenueChartTitle')}
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                        {t('revenueChartDescription')}
                    </CardDescription>
                </div>

                {/* Switcher & Metrics Pill */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/50 text-xs">
                        <Button
                            type="button"
                            variant={viewMode === 'revenue' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('revenue')}
                            className="rounded-lg h-7 px-3 text-xs font-semibold"
                        >
                            {t('viewRevenue')}
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === 'orders' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('orders')}
                            className="rounded-lg h-7 px-3 text-xs font-semibold"
                        >
                            {t('viewOrders')}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {/* Quick Stat Bar */}
            <div className="px-6 py-2 flex items-center justify-between flex-wrap gap-4 border-b border-border/40 text-xs text-muted-foreground">
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <span>{t('totalSales')} </span>
                        <strong className="font-mono text-foreground font-bold">
                            {formatCurrencyVND(totalRevenue)}
                        </strong>
                    </div>
                    <div>
                        <span>{t('totalOrdersCount')} </span>
                        <strong className="font-mono text-foreground font-bold">
                            {t('ordersCountUnit', { count: totalOrders.toLocaleString() })}
                        </strong>
                    </div>
                </div>
                {maxDay.label && (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <ArrowUpRightIcon className="size-3.5" />
                        <span>{t('peakSales', { date: maxDay.label, amount: formatCurrencyVND(maxDay.revenue) })}</span>
                    </div>
                )}
            </div>

            <CardContent className="pt-4 px-2 sm:px-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[280px] sm:h-[340px] w-full">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />

                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-[11px] font-medium"
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-[11px] font-mono"
                            tickFormatter={(val: number) => {
                                if (viewMode === 'orders') return `${val}`
                                if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`
                                if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`
                                return `${val}`
                            }}
                        />

                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    formatter={(value, name) => {
                                        if (name === 'orders') {
                                            return (
                                                <div className="flex items-center justify-between gap-4 w-full">
                                                    <span className="text-muted-foreground">{t('ordersLabel')}</span>
                                                    <span className="font-mono font-bold">
                                                        {t('ordersCountUnit', { count: String(value) })}
                                                    </span>
                                                </div>
                                            )
                                        }
                                        return (
                                            <div className="flex items-center justify-between gap-4 w-full">
                                                <span className="text-muted-foreground">
                                                    {name === 'revenue' ? t('revenueLabel') : t('previousPeriodLabel')}
                                                </span>
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrencyVND(Number(value))}
                                                </span>
                                            </div>
                                        )
                                    }}
                                />
                            }
                        />

                        {viewMode === 'revenue' ? (
                            <>
                                <Area
                                    type="monotone"
                                    dataKey="previousRevenue"
                                    stroke="#94a3b8"
                                    strokeWidth={1.5}
                                    strokeDasharray="4 4"
                                    fillOpacity={1}
                                    fill="url(#previousGradient)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#revenueGradient)"
                                />
                            </>
                        ) : (
                            <Area
                                type="monotone"
                                dataKey="orders"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#ordersGradient)"
                            />
                        )}
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
})
