'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
    ActivityIcon,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    Package,
    PlusIcon,
    RefreshCwIcon,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    Store,
    Truck,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { DashboardRange, SellerDashboardOverviewResponse, SellerProfileDetail } from '@timmyhub/contracts'

import { Badge, Button, Card, CardContent, Skeleton } from '@/components'
import { IconPath } from '@/components/icons'
import { QUERY_KEY, ROUTE } from '@/constants'

import { getMyShopAction, getSellerDashboardOverviewAction } from '../actions'
import { SellerKpiCards } from './seller-kpi-cards'
import { SellerOrderStatusChart } from './seller-order-status-chart'
import { SellerRevenueChart } from './seller-revenue-chart'
import { SellerTodoBar } from './seller-todo-bar'
import { SellerTopProducts } from './seller-top-products'
import { SellerWalletPanel } from './seller-wallet-panel'

interface SellerPortalViewProps {
    initialShop?: SellerProfileDetail | null
}

const DATE_RANGES: { key: DashboardRange; labelKey: 'range7d' | 'range30d' | 'range90d' | 'range1y' }[] = [
    { key: '7d', labelKey: 'range7d' },
    { key: '30d', labelKey: 'range30d' },
    { key: '90d', labelKey: 'range90d' },
    { key: '1y', labelKey: 'range1y' },
]

export function SellerPortalView({ initialShop }: SellerPortalViewProps = {}) {
    const t = useTranslations('seller.portal')
    const [range, setRange] = useState<DashboardRange>('30d')

    // Query Shop Profile
    const { data: shop = initialShop } = useQuery({
        queryKey: QUERY_KEY.SELLER.MY_SHOP,
        queryFn: async () => {
            const res = await getMyShopAction()
            return res.ok && res.data ? res.data : null
        },
        initialData: initialShop,
    })

    // Query Seller Analytics Overview
    const {
        data: overview,
        isLoading,
        isFetching,
        refetch,
    } = useQuery<SellerDashboardOverviewResponse>({
        queryKey: QUERY_KEY.ANALYTICS.SELLER_DASHBOARD(range),
        queryFn: async () => {
            const res = await getSellerDashboardOverviewAction(range)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể tải số liệu kênh người bán')
            }
            return res.data
        },
        staleTime: 60 * 1000,
        enabled: Boolean(shop),
    })

    if (!shop) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
                <div className="size-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Store className="size-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Chưa có thông tin gian hàng</h2>
                <p className="text-sm text-muted-foreground">
                    Bạn chưa hoàn tất đăng ký người bán hoặc hồ sơ đang được ban quản trị xét duyệt.
                </p>
                <div className="pt-2">
                    <Button asChild>
                        <Link href={ROUTE.SELLER_REGISTER}>Đăng ký bán hàng ngay</Link>
                    </Button>
                </div>
            </div>
        )
    }

    const joinedFormattedDate = shop.createdAt ? new Date(shop.createdAt).toLocaleDateString('vi-VN') : '2026'

    return (
        <div className="space-y-6 pb-16">
            {/* ═══════════════════════════════════════════════════════════════════
             * 1. SHOP BRAND HEADER BANNER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/10 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
                {shop.shopBanner && (
                    <div className="absolute inset-0 z-0 opacity-15 overflow-hidden">
                        <Image src={shop.shopBanner} alt="Shop Banner" fill sizes="100vw" className="object-cover" />
                    </div>
                )}

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                        {/* Shop Logo Avatar */}
                        <div className="relative size-16 sm:size-20 rounded-2xl bg-gradient-to-tr from-primary to-primary/70 text-white font-black text-3xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0 overflow-hidden">
                            {shop.shopLogo ? (
                                <Image
                                    src={shop.shopLogo}
                                    alt={shop.shopName}
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                />
                            ) : (
                                shop.shopName.charAt(0).toUpperCase()
                            )}
                            <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 text-white rounded-tl-lg shadow">
                                <CheckCircle2 className="size-3.5" />
                            </div>
                        </div>

                        {/* Shop Titles & Metadata */}
                        <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                                    {shop.shopName}
                                </h1>
                                <Badge className="bg-primary/15 text-primary border-primary/30 font-semibold gap-1 text-xs">
                                    <IconPath name="gemini-star" className="size-2.5 text-primary animate-pulse" />
                                    {t('verifiedSeller')}
                                </Badge>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    {t('activeStatus')}
                                </span>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span>timmyhub.vn/shop/@{shop.shopSlug || 'official'}</span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="size-3.5" />
                                    {t('joinedDate', { date: joinedFormattedDate })}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Button asChild size="sm" className="rounded-xl font-semibold gap-1.5 shadow-sm">
                            <Link href={ROUTE.PRODUCTS}>
                                <PlusIcon className="size-4" />
                                <span>{t('quickNewProduct')}</span>
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="rounded-xl font-semibold gap-1.5 shadow-sm"
                        >
                            <Link href={ROUTE.SELLER_SETTINGS}>
                                <Settings className="size-4" />
                                <span>{t('editShop')}</span>
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="rounded-xl font-semibold gap-1.5 shadow-sm"
                        >
                            <Link
                                href={ROUTE.SHOP_DETAIL(shop.shopSlug || shop.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span>{t('viewPublicShop')}</span>
                                <ExternalLink className="size-3.5" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Ambient glow in background */}
                <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/20 blur-[100px]" />
                <div className="pointer-events-none absolute bottom-0 left-1/3 size-64 rounded-full bg-amber-400/10 blur-[90px]" />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * 2. TOP CONTROL BAR (Date Range Filter & Live Sync)
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-xs">
                {/* Live Server Status Pulse */}
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-2">
                    <span className="relative flex size-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                    </span>
                    <ActivityIcon className="size-3.5 text-emerald-500" />
                    <span className="text-foreground">{t('liveSync')}</span>
                    {overview?.updatedAt && (
                        <span className="text-[11px] text-muted-foreground opacity-80 hidden md:inline">
                            (Cập nhật lúc {new Date(overview.updatedAt).toLocaleTimeString()})
                        </span>
                    )}
                </div>

                {/* Range Tabs & Refresh */}
                <div className="flex items-center gap-2">
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
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * 3. OPERATIONAL HEALTH METRICS BAR (4 Metrics)
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/70 bg-card/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
                        <div className="size-11 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                            <Star className="size-5 fill-current" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">{t('ratingStat')}</p>
                            <p className="text-lg sm:text-xl font-extrabold text-foreground">
                                {overview?.operationalHealth.rating
                                    ? `${overview.operationalHealth.rating} ★`
                                    : shop.rating > 0
                                      ? `${shop.rating.toFixed(1)} ★`
                                      : '5.0 ★'}
                            </p>
                            <span className="text-[10px] text-emerald-500 font-semibold">100% hài lòng</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
                        <div className="size-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                            <ShieldCheck className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">{t('cancelRateStat')}</p>
                            <p className="text-lg sm:text-xl font-extrabold text-foreground">
                                {overview?.operationalHealth.cancelRate !== undefined
                                    ? `${overview.operationalHealth.cancelRate}%`
                                    : shop.cancelRate
                                      ? `${shop.cancelRate}%`
                                      : '0.0%'}
                            </p>
                            <span className="text-[10px] text-emerald-500 font-semibold">Dưới chuẩn sàn (&lt; 2%)</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
                        <div className="size-11 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                            <Clock className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">{t('responseHoursStat')}</p>
                            <p className="text-lg sm:text-xl font-extrabold text-foreground">
                                {t('hours', {
                                    count: overview?.operationalHealth.avgResponseHours || shop.avgResponseHours || 1,
                                })}
                            </p>
                            <span className="text-[10px] text-blue-500 font-semibold">Phản hồi rất nhanh</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
                        <div className="size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                            <Truck className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">{t('returnDaysStat')}</p>
                            <p className="text-lg sm:text-xl font-extrabold text-foreground">
                                {t('days', {
                                    count: overview?.operationalHealth.returnPolicyDays || shop.returnPolicyDays || 7,
                                })}
                            </p>
                            <span className="text-[10px] text-primary font-semibold">Đổi trả miễn phí</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * 4. ACTION TODOS (Live task indicators)
             * ═══════════════════════════════════════════════════════════════════ */}
            {isLoading || !overview ? (
                <Skeleton className="h-32 rounded-2xl" />
            ) : (
                <SellerTodoBar todos={overview.todos} />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
             * 5. KPI METRICS CARDS (With Sparklines)
             * ═══════════════════════════════════════════════════════════════════ */}
            {isLoading || !overview ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-36 rounded-2xl" />
                    ))}
                </div>
            ) : (
                <SellerKpiCards kpis={overview.kpis} />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
             * 6. CHARTS GRID (Revenue Area Chart + Order Status Donut Chart)
             * ═══════════════════════════════════════════════════════════════════ */}
            {isLoading || !overview ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Skeleton className="lg:col-span-2 h-[340px] rounded-2xl" />
                    <Skeleton className="lg:col-span-1 h-[340px] rounded-2xl" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                        <SellerRevenueChart data={overview.revenueChart} />
                    </div>
                    <div className="lg:col-span-1">
                        <SellerOrderStatusChart
                            data={overview.orderStatusChart}
                            fulfillmentRate={overview.operationalHealth.fulfillmentRate}
                        />
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
             * 7. TOP PRODUCTS & QUICK OPERATIONS
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                    {isLoading || !overview ? (
                        <Skeleton className="h-[360px] rounded-2xl" />
                    ) : (
                        <SellerTopProducts products={overview.topProducts} />
                    )}
                </div>

                <div className="lg:col-span-1 space-y-4">
                    {/* Quick navigation to main hubs */}
                    <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm p-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Lối tắt quản lý
                        </h3>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                            <Button
                                asChild
                                variant="outline"
                                className="justify-start gap-2 h-9 rounded-xl font-semibold"
                            >
                                <Link href={ROUTE.PRODUCTS}>
                                    <Package className="size-4 text-primary" />
                                    <span>Quản lý kho sản phẩm</span>
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="justify-start gap-2 h-9 rounded-xl font-semibold"
                            >
                                <Link href={ROUTE.SELLER_ORDERS}>
                                    <ShoppingBag className="size-4 text-amber-500" />
                                    <span>Quản lý đơn hàng</span>
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="justify-start gap-2 h-9 rounded-xl font-semibold"
                            >
                                <Link href={ROUTE.SELLER_SETTINGS}>
                                    <Settings className="size-4 text-blue-500" />
                                    <span>Cài đặt thông tin Shop</span>
                                </Link>
                            </Button>
                        </div>
                    </Card>

                    {/* AI Growth Insights Banner */}
                    <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-5 shadow-sm space-y-2.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-primary">
                            <Sparkles className="size-4" />
                            <span>{t('growthTitle')}</span>
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                            <li className="flex items-start gap-1.5">
                                <span className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>{t('growthTip1')}</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>{t('growthTip2')}</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>{t('growthTip3')}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * 8. SELLER WALLET & SETTLEMENT
             * ═══════════════════════════════════════════════════════════════════ */}
            <SellerWalletPanel />
        </div>
    )
}
