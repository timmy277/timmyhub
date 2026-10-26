'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActivityIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { DashboardOverviewResponse, DashboardRange } from '@timmyhub/contracts'

import { Button, Card, PageContainer, Skeleton } from '@/components'
import { QUERY_KEY } from '@/constants'
import { getDashboardOverviewAction } from '../actions'
import { DashboardCategoryChart } from './dashboard-category-chart'
import { DashboardKpiCards } from './dashboard-kpi-cards'
import { DashboardOrderStatusChart } from './dashboard-order-status-chart'
import { DashboardPaymentChart } from './dashboard-payment-chart'
import { DashboardRecentOrders } from './dashboard-recent-orders'
import { DashboardRevenueChart } from './dashboard-revenue-chart'
import { DashboardSlaCard } from './dashboard-sla-card'
import { DashboardTopProducts } from './dashboard-top-products'

const DATE_RANGES: { key: DashboardRange; labelKey: 'range7d' | 'range30d' | 'range90d' | 'range1y' }[] = [
    { key: '7d', labelKey: 'range7d' },
    { key: '30d', labelKey: 'range30d' },
    { key: '90d', labelKey: 'range90d' },
    { key: '1y', labelKey: 'range1y' },
]

export function DashboardPage() {
    const t = useTranslations('dashboard')
    const [range, setRange] = useState<DashboardRange>('30d')

    const { data, isLoading, isFetching, error, refetch } = useQuery<DashboardOverviewResponse>({
        queryKey: QUERY_KEY.ANALYTICS.DASHBOARD(range),
        queryFn: async () => {
            const result = await getDashboardOverviewAction(range)
            if (!result.ok) {
                throw new Error(result.message || 'Không thể tải số liệu bảng điều khiển')
            }
            return result.data
        },
        staleTime: 60 * 1000,
    })

    const handleExport = () => {
        if (!data) return
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`
            const downloadAnchor = document.createElement('a')
            downloadAnchor.setAttribute('href', jsonString)
            downloadAnchor.setAttribute('download', `timmyhub-dashboard-${range}-${Date.now()}.json`)
            document.body.appendChild(downloadAnchor)
            downloadAnchor.click()
            downloadAnchor.remove()
            toast.success('Đã xuất báo cáo số liệu tổng quan thành công!')
        } catch {
            toast.error('Có lỗi xảy ra khi xuất báo cáo')
        }
    }

    return (
        <PageContainer title={t('pageTitle')} description={t('pageDescription')}>
            <div className="space-y-6 pb-12">
                {/* Top Control Bar: Live Status, Range Selector, Refresh, Export */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-xs">
                    {/* Live Server Status Pulse */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-2">
                        <span className="relative flex size-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                        </span>
                        <ActivityIcon className="size-3.5 text-emerald-500" />
                        <span className="text-foreground">{t('liveSync')}</span>
                        {data?.updatedAt && (
                            <span className="text-[11px] text-muted-foreground opacity-80 hidden md:inline">
                                (Cập nhật lúc {new Date(data.updatedAt).toLocaleTimeString('vi-VN')})
                            </span>
                        )}
                    </div>

                    {/* Range Tabs & Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Range Segmented Controls */}
                        <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/50 text-xs">
                            {DATE_RANGES.map((r) => (
                                <Button
                                    key={r.key}
                                    type="button"
                                    size="sm"
                                    variant={range === r.key ? 'default' : 'ghost'}
                                    onClick={() => setRange(r.key)}
                                    className="rounded-lg h-7 px-2.5 text-xs font-semibold"
                                >
                                    {t(r.labelKey)}
                                </Button>
                            ))}
                        </div>

                        {/* Refresh Button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1.5"
                            aria-label={t('refresh')}
                        >
                            <RefreshCwIcon className={`size-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
                            <span className="hidden sm:inline">{t('refresh')}</span>
                        </Button>

                        {/* Export Button */}
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleExport}
                            disabled={!data}
                            className="rounded-xl h-8 px-3 text-xs font-semibold gap-1.5"
                        >
                            <DownloadIcon className="size-3.5" />
                            <span>{t('exportReport')}</span>
                        </Button>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="space-y-6">
                        {/* KPI Skeletons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-36 rounded-2xl" />
                            ))}
                        </div>
                        {/* Area Chart Skeleton */}
                        <Skeleton className="h-[380px] rounded-2xl" />
                        {/* Grid Skeletons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Skeleton className="h-[340px] rounded-2xl" />
                            <Skeleton className="h-[340px] rounded-2xl" />
                            <Skeleton className="h-[340px] rounded-2xl" />
                        </div>
                    </div>
                ) : error || !data ? (
                    /* Error State */
                    <Card className="p-8 text-center rounded-2xl border-destructive/20 bg-destructive/5 space-y-3">
                        <p className="text-sm font-semibold text-destructive">
                            {error ? error.message : 'Không tìm thấy dữ liệu báo cáo'}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="rounded-xl text-xs font-semibold"
                        >
                            Thử lại
                        </Button>
                    </Card>
                ) : (
                    /* Main Dashboard Content */
                    <div className="space-y-6">
                        {/* 1. KPI Cards */}
                        <DashboardKpiCards kpis={data.kpis} />

                        {/* 2. Main Revenue & Orders Area Chart */}
                        <DashboardRevenueChart data={data.revenueChart} />

                        {/* 3. Multi-Chart Performance Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Bar Chart: Category Sales */}
                            <div className="lg:col-span-1">
                                <DashboardCategoryChart data={data.categoryChart} />
                            </div>

                            {/* Donut Chart: Order Status */}
                            <div className="lg:col-span-1">
                                <DashboardOrderStatusChart data={data.orderStatusChart} />
                            </div>

                            {/* Operational SLAs & CSAT */}
                            <div className="lg:col-span-1">
                                <DashboardSlaCard performance={data.performance} />
                            </div>
                        </div>

                        {/* 4. Payment Breakdown & Operations */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            <div className="lg:col-span-1">
                                <DashboardPaymentChart data={data.paymentMethodChart} />
                            </div>

                            {/* Top Selling Products Leaderboard */}
                            <div className="lg:col-span-2">
                                <DashboardTopProducts products={data.topProducts} />
                            </div>
                        </div>

                        {/* 5. Recent Live Orders Table */}
                        <DashboardRecentOrders orders={data.recentOrders} />
                    </div>
                )}
            </div>
        </PageContainer>
    )
}
