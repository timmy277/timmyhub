'use client'

import { memo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { LayersIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { CategorySalesPoint } from '@timmyhub/contracts'

import {
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

interface DashboardCategoryChartProps {
    data: CategorySalesPoint[]
}

const chartConfig: ChartConfig = {
    sales: {
        label: 'Doanh số',
        color: '#3b82f6',
    },
}

const CATEGORY_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
]

export const DashboardCategoryChart = memo(function DashboardCategoryChart({ data }: DashboardCategoryChartProps) {
    const t = useTranslations('dashboard')

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <LayersIcon className="size-4" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                        {t('categoryChartTitle')}
                    </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                    {t('categoryChartDescription')}
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 px-2 sm:px-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[260px] sm:h-[300px] w-full">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                        <XAxis
                            dataKey="categoryName"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            interval={0}
                            className="text-[10px] font-medium"
                            tickFormatter={(val: string) => {
                                if (val.length > 12) return `${val.slice(0, 10)}…`
                                return val
                            }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-[10px] font-mono"
                            tickFormatter={(val: number) => {
                                if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`
                                return `${val}`
                            }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    formatter={(value, _name, item) => {
                                        const point = item as { payload?: { orders?: number } }
                                        return (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground">Doanh số:</span>
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                        {formatCurrencyVND(Number(value))}
                                                    </span>
                                                </div>
                                                {point?.payload?.orders !== undefined && (
                                                    <div className="flex items-center justify-between gap-4 text-[11px] text-muted-foreground">
                                                        <span>Số lượng đơn:</span>
                                                        <span className="font-mono font-semibold text-foreground">
                                                            {point.payload.orders} đơn
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }}
                                />
                            }
                        />
                        <Bar dataKey="sales" radius={[8, 8, 0, 0]} maxBarSize={48}>
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                    className="transition-opacity duration-300 hover:opacity-80"
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
})
