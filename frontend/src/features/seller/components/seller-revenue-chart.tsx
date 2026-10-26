'use client'

import { memo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { TrendingUpIcon } from 'lucide-react'
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

interface SellerRevenueChartProps {
    data: RevenueTimePoint[]
}

const chartConfig: ChartConfig = {
    revenue: {
        label: 'Doanh thu',
        color: '#10b981',
    },
    previousRevenue: {
        label: 'Kỳ trước',
        color: '#94a3b8',
    },
    orders: {
        label: 'Số lượng đơn',
        color: '#3b82f6',
    },
}

export const SellerRevenueChart = memo(function SellerRevenueChart({ data }: SellerRevenueChartProps) {
    const t = useTranslations('seller.portal')
    const [viewMode, setViewMode] = useState<'revenue' | 'orders'>('revenue')

    const totalRevenue = data.reduce((sum, p) => sum + p.revenue, 0)
    const totalOrders = data.reduce((sum, p) => sum + p.orders, 0)

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <TrendingUpIcon className="size-4" />
                        </div>
                        <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                            {t('revenueTrendTitle')}
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                        {t('revenueTrendDescription')}
                    </CardDescription>
                </div>

                {/* Switcher */}
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
            </CardHeader>

            {/* Quick Stat Bar */}
            <div className="px-6 py-2 flex items-center gap-6 border-b border-border/40 text-xs text-muted-foreground flex-wrap">
                <div>
                    <span>Doanh số kỳ này: </span>
                    <strong className="font-mono text-foreground font-bold">{formatCurrencyVND(totalRevenue)}</strong>
                </div>
                <div>
                    <span>Tổng đơn hàng: </span>
                    <strong className="font-mono text-foreground font-bold">{totalOrders.toLocaleString()} đơn</strong>
                </div>
            </div>

            <CardContent className="pt-4 px-2 sm:px-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[260px] sm:h-[300px] w-full">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                            <linearGradient id="sellerRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="sellerPreviousGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="sellerOrdersGradient" x1="0" y1="0" x2="0" y2="1">
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
                                                    <span className="text-muted-foreground">Số đơn:</span>
                                                    <span className="font-mono font-bold">{String(value)} đơn</span>
                                                </div>
                                            )
                                        }
                                        return (
                                            <div className="flex items-center justify-between gap-4 w-full">
                                                <span className="text-muted-foreground">
                                                    {name === 'revenue' ? 'Doanh thu:' : 'Kỳ trước:'}
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
                                    fill="url(#sellerPreviousGradient)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#sellerRevenueGradient)"
                                />
                            </>
                        ) : (
                            <Area
                                type="monotone"
                                dataKey="orders"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#sellerOrdersGradient)"
                            />
                        )}
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
})
