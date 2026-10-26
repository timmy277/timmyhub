'use client'

import { memo } from 'react'
import { CheckCircle2Icon, ClockIcon, ShieldAlertIcon, ShieldCheckIcon, StarIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { PlatformPerformanceMetrics } from '@timmyhub/contracts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@/components'

interface DashboardSlaCardProps {
    performance: PlatformPerformanceMetrics
}

export const DashboardSlaCard = memo(function DashboardSlaCard({ performance }: DashboardSlaCardProps) {
    const t = useTranslations('dashboard')

    const metrics = [
        {
            id: 'fulfillment',
            title: t('fulfillmentRate'),
            value: `${performance.fulfillmentRate}%`,
            progress: performance.fulfillmentRate,
            icon: CheckCircle2Icon,
            color: 'text-emerald-500',
            barClass: 'bg-emerald-500',
        },
        {
            id: 'onTime',
            title: t('onTimeRate'),
            value: `${performance.onTimeDeliveryRate}%`,
            progress: performance.onTimeDeliveryRate,
            icon: ClockIcon,
            color: 'text-blue-500',
            barClass: 'bg-blue-500',
        },
        {
            id: 'refund',
            title: t('refundRate'),
            value: `${performance.returnRefundRate}%`,
            progress: 100 - performance.returnRefundRate * 10,
            icon: ShieldAlertIcon,
            color: 'text-amber-500',
            barClass: 'bg-amber-500',
        },
    ]

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheckIcon className="size-4" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">{t('slaTitle')}</CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">{t('slaDescription')}</CardDescription>
            </CardHeader>

            <CardContent className="pt-2 px-4 space-y-4">
                {/* CSAT Hero Banner */}
                <div className="rounded-xl border border-border/60 bg-gradient-to-r from-emerald-500/10 via-background to-blue-500/10 p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('csatScore')}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold font-mono text-foreground">
                                {performance.customerSatisfactionScore}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">/ 5.0</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon key={star} className="size-5 fill-amber-400 text-amber-400 drop-shadow-sm" />
                        ))}
                    </div>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-3 pt-1">
                    {metrics.map((item) => {
                        const Icon = item.icon
                        return (
                            <div key={item.id} className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Icon className={`size-3.5 ${item.color}`} />
                                        <span className="font-medium text-muted-foreground">{item.title}</span>
                                    </div>
                                    <span className="font-mono font-bold text-foreground">{item.value}</span>
                                </div>
                                <Progress value={item.progress} className="h-1.5" />
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
})
