'use client'

import { memo } from 'react'
import { WalletCardsIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { PaymentMethodDistributionPoint } from '@timmyhub/contracts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@/components'
import { formatCurrencyVND } from '@/utils'

interface DashboardPaymentChartProps {
    data: PaymentMethodDistributionPoint[]
}

export const DashboardPaymentChart = memo(function DashboardPaymentChart({ data }: DashboardPaymentChartProps) {
    const t = useTranslations('dashboard')

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <WalletCardsIcon className="size-4" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                        {t('paymentMethodTitle')}
                    </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                    {t('paymentMethodDescription')}
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-2 px-4 space-y-4">
                {/* Horizontal Segmented Progress Bar */}
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5 gap-1">
                    {data.map((item) => (
                        <div
                            key={item.method}
                            style={{
                                width: `${item.percentage}%`,
                                backgroundColor: item.color,
                            }}
                            className="h-full rounded-full transition-all duration-500"
                            title={`${item.label}: ${item.percentage}%`}
                        />
                    ))}
                </div>

                {/* Detailed Payment Cards */}
                <div className="space-y-3 pt-1">
                    {data.map((item) => (
                        <div
                            key={item.method}
                            className="p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-colors space-y-2"
                        >
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span
                                        className="size-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="font-semibold text-foreground truncate">{item.label}</span>
                                </div>
                                <span className="font-mono font-bold text-foreground shrink-0">{item.percentage}%</span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>{t('transactionsCount', { count: item.count })}</span>
                                <span className="font-mono font-medium text-foreground/80">
                                    {formatCurrencyVND(item.amount)}
                                </span>
                            </div>

                            <Progress value={item.percentage} className="h-1.5" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
})
