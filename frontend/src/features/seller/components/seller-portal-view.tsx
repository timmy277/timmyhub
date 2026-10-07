'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowRight,
    ArrowUpRight,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    Package,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    Store,
    TrendingUp,
    Truck,
} from 'lucide-react'

import type { SellerProfileDetail } from '@timmyhub/contracts'

import { QUERY_KEY, ROUTE } from '@/constants'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components'
import { IconPath } from '@/components/icons'

import { getMyShopAction } from '../actions'

interface SellerPortalViewProps {
    initialShop?: SellerProfileDetail | null
}

export function SellerPortalView({ initialShop }: SellerPortalViewProps = {}) {
    const t = useTranslations('seller.portal')

    // ===== Query =====
    const { data: shop = initialShop } = useQuery({
        queryKey: QUERY_KEY.SELLER.MY_SHOP,
        queryFn: async () => {
            const res = await getMyShopAction()
            return res.ok && res.data ? res.data : null
        },
        initialData: initialShop,
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
        <div className="space-y-8 pb-16">
            {/* ═══════════════════════════════════════════════════════════════════
             * 1. SHOP BRAND HEADER BANNER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/10 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
                {shop.shopBanner && (
                    <div className="absolute inset-0 z-0 opacity-15 overflow-hidden">
                        <Image
                            src={shop.shopBanner}
                            alt="Shop Banner"
                            fill
                            sizes="100vw"
                            className="object-cover"
                            unoptimized
                        />
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
                                    unoptimized
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
                            size="sm"
                            className="rounded-xl font-semibold gap-1.5 bg-primary text-white shadow-md hover:bg-primary/90"
                        >
                            <Link href={`#`}>
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
             * 2. OPERATIONAL HEALTH METRICS BAR (4 Metrics)
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
                                {shop.rating > 0 ? `${shop.rating.toFixed(1)} ★` : '5.0 ★'}
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
                                {shop.cancelRate ? `${shop.cancelRate}%` : '0.0%'}
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
                                {t('hours', { count: shop.avgResponseHours || 1 })}
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
                                {t('days', { count: shop.returnPolicyDays || 7 })}
                            </p>
                            <span className="text-[10px] text-primary font-semibold">Đổi trả miễn phí</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * 3. KPI STAT CARDS
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/70 bg-gradient-to-br from-card to-primary/5 shadow-sm">
                    <CardContent className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t('todayRevenue')}</span>
                            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                <TrendingUp className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-foreground">₫12.850.000</p>
                        <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                            <ArrowUpRight className="size-3.5" />
                            <span>+14.2% so với hôm qua</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-gradient-to-br from-card to-amber-500/5 shadow-sm">
                    <CardContent className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t('todayOrders')}</span>
                            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <ShoppingBag className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-foreground">28 đơn</p>
                        <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                            <ArrowUpRight className="size-3.5" />
                            <span>+6 đơn so với hôm qua</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-gradient-to-br from-card to-blue-500/5 shadow-sm">
                    <CardContent className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t('shopViews')}</span>
                            <div className="size-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <BarChart3 className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-foreground">1.420</p>
                        <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                            <ArrowUpRight className="size-3.5" />
                            <span>+22% lượt khách mới</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-gradient-to-br from-card to-emerald-500/5 shadow-sm">
                    <CardContent className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t('activeProducts')}</span>
                            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Package className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-foreground">18 mặt hàng</p>
                        <Link
                            href={ROUTE.PRODUCTS}
                            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                        >
                            <span>Xem kho sản phẩm</span>
                            <ArrowRight className="size-3" />
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * 4. ACTION TODOS
             * ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border border-border/70 bg-card/80 shadow-sm backdrop-blur-md rounded-2xl overflow-hidden">
                <CardHeader className="p-5 border-b border-border/60">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-primary" />
                        <span>{t('todoTitle')}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link
                            href={ROUTE.SELLER_ORDERS}
                            className="p-4 rounded-xl border border-border/60 bg-muted/30 text-center space-y-1 hover:border-primary/50 transition-colors block"
                        >
                            <p className="text-2xl font-bold text-primary">3</p>
                            <p className="text-xs font-semibold text-muted-foreground">{t('todoPendingConfirm')}</p>
                        </Link>
                        <Link
                            href={ROUTE.SELLER_ORDERS}
                            className="p-4 rounded-xl border border-border/60 bg-muted/30 text-center space-y-1 hover:border-primary/50 transition-colors block"
                        >
                            <p className="text-2xl font-bold text-amber-500">5</p>
                            <p className="text-xs font-semibold text-muted-foreground">{t('todoPendingPickup')}</p>
                        </Link>
                        <Link
                            href={ROUTE.SELLER_ORDERS}
                            className="p-4 rounded-xl border border-border/60 bg-muted/30 text-center space-y-1 hover:border-primary/50 transition-colors block"
                        >
                            <p className="text-2xl font-bold text-blue-500">12</p>
                            <p className="text-xs font-semibold text-muted-foreground">{t('todoShipped')}</p>
                        </Link>
                        <Link
                            href={ROUTE.SELLER_ORDERS}
                            className="p-4 rounded-xl border border-border/60 bg-muted/30 text-center space-y-1 hover:border-primary/50 transition-colors block"
                        >
                            <p className="text-2xl font-bold text-emerald-500">0</p>
                            <p className="text-xs font-semibold text-muted-foreground">{t('todoRefund')}</p>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════
             * 5. QUICK NAVIGATION CARDS (Direct routes from sidebar)
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
                    <CardHeader className="p-5 pb-3">
                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                            <Package className="size-5" />
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">Quản lý sản phẩm</CardTitle>
                        <CardDescription className="text-xs">
                            Đăng bán sản phẩm mới kèm video/ảnh, cập nhật giá bán, số lượng tồn kho và phân loại SKU.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                        <Button asChild variant="outline" size="sm" className="w-full rounded-xl font-semibold gap-1.5">
                            <Link href={ROUTE.PRODUCTS}>
                                <span>Vào quản lý sản phẩm</span>
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
                    <CardHeader className="p-5 pb-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                            <ShoppingBag className="size-5" />
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">Quản lý đơn hàng</CardTitle>
                        <CardDescription className="text-xs">
                            Xác nhận đơn mới, in phiếu giao hàng, bàn giao cho đơn vị vận chuyển và xử lý trả hàng.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                        <Button asChild variant="outline" size="sm" className="w-full rounded-xl font-semibold gap-1.5">
                            <Link href={ROUTE.SELLER_ORDERS}>
                                <span>Vào quản lý đơn hàng</span>
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
                    <CardHeader className="p-5 pb-3">
                        <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                            <Settings className="size-5" />
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">Cài đặt gian hàng</CardTitle>
                        <CardDescription className="text-xs">
                            Cập nhật tên gian hàng, logo, banner, địa chỉ kho lấy hàng và chính sách đổi trả hàng hóa.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                        <Button asChild variant="outline" size="sm" className="w-full rounded-xl font-semibold gap-1.5">
                            <Link href={ROUTE.SELLER_SETTINGS}>
                                <span>Cài đặt thông tin Shop</span>
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * 6. GROWTH INSIGHTS BANNER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <Sparkles className="size-4" />
                    <span>{t('growthTitle')}</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                        <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{t('growthTip1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{t('growthTip2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{t('growthTip3')}</span>
                    </li>
                </ul>
            </div>
        </div>
    )
}
