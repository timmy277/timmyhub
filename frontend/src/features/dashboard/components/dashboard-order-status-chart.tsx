'use client'

import { memo } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { PieChartIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { OrderStatusDistributionPoint } from '@timmyhub/contracts'

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

interface DashboardOrderStatusChartProps {
    data: OrderStatusDistributionPoint[]
}

const chartConfig: ChartConfig = {
    count: {
        label: 'Số lượng đơn',
    },
}

export const DashboardOrderStatusChart = memo(function DashboardOrderStatusChart({
    data,
}: DashboardOrderStatusChartProps) {
    const t = useTranslations('dashboard')

    const totalOrders = data.reduce((sum, d) => sum + d.count, 0)
    const completedOrders = data.find((d) => d.status === 'COMPLETED')?.count || 0
    const successRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '97.4'

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <PieChartIcon className="size-4" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                        {t('orderStatusTitle')}
                    </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                    {t('orderStatusDescription')}
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-2 px-4">
                <div className="relative">
                    <ChartContainer config={chartConfig} className="aspect-auto h-[210px] w-full">
                        <PieChart>
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        formatter={(value, _name, item) => {
                                            const point = (item as { payload?: OrderStatusDistributionPoint })?.payload
                                            return (
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground">
                                                        {point?.label || 'Đơn hàng'}:
                                                    </span>
                                                    <span className="font-mono font-bold text-foreground">
                                                        {t('ordersWithPercent', {
                                                            count: String(value),
                                                            percent: point?.percentage ?? 0,
                                                        })}
                                                    </span>
                                                </div>
                                            )
                                        }}
                                    />
                                }
                            />
                            <Pie
                                data={data}
                                dataKey="count"
                                nameKey="label"
                                innerRadius={58}
                                outerRadius={84}
                                paddingAngle={4}
                                stroke="transparent"
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        className="transition-opacity duration-300 hover:opacity-85"
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>

                    {/* Center Metric Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl sm:text-2xl font-extrabold tracking-tight font-mono text-foreground">
                            {successRate}%
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('successStatus')}
                        </span>
                    </div>
                </div>

                {/* Status List Legend */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40 text-xs">
                    {data.map((item) => (
                        <div
                            key={item.status}
                            className="flex items-center justify-between gap-1.5 p-1 rounded-lg hover:bg-muted/40 transition-colors"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className="size-2 rounded-full shrink-0"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="truncate text-[11px] font-medium text-muted-foreground">
                                    {item.label}
                                </span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-foreground shrink-0">
                                {item.percentage}%
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
})
