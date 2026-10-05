'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    ArrowUpRight,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    Package,
    Plus,
    Save,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    Store,
    TrendingUp,
    Truck,
} from 'lucide-react'
import { toast } from 'sonner'

import type { SellerProfileDetail, UpdateSellerProfileInput } from '@timmyhub/contracts'
import { UpdateSellerProfileSchema } from '@timmyhub/contracts'

import { QUERY_KEY, ROUTE } from '@/constants'
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    FloatInput,
    FloatTextarea,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components'
import { IconPath } from '@/components/icons'

import { getMyShopAction, updateMyShopAction } from '../actions'

interface SellerPortalViewProps {
    initialShop?: SellerProfileDetail | null
}

export function SellerPortalView({ initialShop }: SellerPortalViewProps = {}) {
    const t = useTranslations('seller.portal')
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('overview')

    // ===== Query =====
    const { data: shop = initialShop } = useQuery({
        queryKey: QUERY_KEY.SELLER.MY_SHOP,
        queryFn: async () => {
            const res = await getMyShopAction()
            return res.ok && res.data ? res.data : null
        },
        initialData: initialShop,
    })

    // ===== Mutation =====
    const updateMutation = useMutation({
        mutationFn: updateMyShopAction,
        onSuccess: (res) => {
            if (res.ok) {
                toast.success(t('settingsSuccess'))
                void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.MY_SHOP })
            } else {
                toast.error(t('settingsFailed', { error: res.message || 'Lỗi cập nhật' }))
            }
        },
        onError: () => {
            toast.error('Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại.')
        },
    })

    // ===== Form =====
    const form = useForm<UpdateSellerProfileInput>({
        resolver: zodResolver(UpdateSellerProfileSchema),
        defaultValues: {
            shopName: shop?.shopName || '',
            description: shop?.description || '',
            shopLogo: shop?.shopLogo || '',
            shopBanner: shop?.shopBanner || '',
            warehouseAddressLine: shop?.warehouseAddressLine || '',
            returnPolicyDays: shop?.returnPolicyDays || 7,
            prepTimeHours: shop?.prepTimeHours || 24,
        },
    })

    const onUpdateProfile = (values: UpdateSellerProfileInput) => {
        updateMutation.mutate(values)
    }

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
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                        {/* Shop Logo Avatar */}
                        <div className="relative size-16 sm:size-20 rounded-2xl bg-gradient-to-tr from-primary to-primary/70 text-white font-black text-3xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0 overflow-hidden">
                            {shop.shopLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={shop.shopLogo} alt={shop.shopName} className="size-full object-cover" />
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
                            variant="outline"
                            size="sm"
                            className="rounded-xl font-semibold gap-1.5 shadow-sm"
                            onClick={() => setActiveTab('settings')}
                        >
                            <Settings className="size-4" />
                            <span>{t('editShop')}</span>
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
             * 3. TABBED OPERATIONS MODULE
             * ═══════════════════════════════════════════════════════════════════ */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="h-11 rounded-2xl bg-card/70 p-1 border border-border/70 backdrop-blur-md shadow-sm grid grid-cols-4 max-w-xl">
                    <TabsTrigger value="overview" className="rounded-xl text-xs font-semibold">
                        {t('tabOverview')}
                    </TabsTrigger>
                    <TabsTrigger value="products" className="rounded-xl text-xs font-semibold">
                        {t('tabProducts')}
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="rounded-xl text-xs font-semibold">
                        {t('tabOrders')}
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-xl text-xs font-semibold">
                        {t('tabSettings')}
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: OVERVIEW ── */}
                <TabsContent value="overview" className="space-y-6">
                    {/* KPI Stat Cards */}
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
                                <p className="text-xs text-muted-foreground">Đang sẵn sàng phục vụ</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pending Action Todos */}
                    <Card className="border border-border/70 bg-card/80 shadow-sm backdrop-blur-md rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 border-b border-border/60">
                            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-primary" />
                                <span>{t('todoTitle')}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl border border-border/60 bg-muted/30 text-center space-y-1 hover:border-primary/50 transition-colors cursor-pointer">
                                    <p className="text-2xl font-bold text-primary">3</p>
                                    <p className="text-xs font-semibold text-muted-foreground">
                                        {t('todoPendingConfirm')}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border border-border/60 bg-muted/30 text-center space-y-1 hover:border-primary/50 transition-colors cursor-pointer">
                                    <p className="text-2xl font-bold text-amber-500">5</p>
                                    <p className="text-xs font-semibold text-muted-foreground">
                                        {t('todoPendingPickup')}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border border-border/60 bg-muted/30 text-center space-y-1 hover:border-primary/50 transition-colors cursor-pointer">
                                    <p className="text-2xl font-bold text-blue-500">12</p>
                                    <p className="text-xs font-semibold text-muted-foreground">{t('todoShipped')}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-border/60 bg-muted/30 text-center space-y-1 hover:border-primary/50 transition-colors cursor-pointer">
                                    <p className="text-2xl font-bold text-emerald-500">0</p>
                                    <p className="text-xs font-semibold text-muted-foreground">{t('todoRefund')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Growth Insights Banner */}
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
                </TabsContent>

                {/* ── TAB 2: PRODUCTS ── */}
                <TabsContent value="products" className="space-y-6">
                    <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-6 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-foreground">
                                    Quản lý Sản Phẩm Gian Hàng
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Đăng tải, chỉnh sửa giá bán và quản lý số lượng tồn kho theo thời gian thực.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                className="rounded-xl font-bold gap-2 bg-primary text-white shadow-md hover:bg-primary/90"
                                onClick={() =>
                                    toast.info('Tính năng đăng tải sản phẩm mới đang được kết nối với kho hàng!')
                                }
                            >
                                <Plus className="size-4" />
                                <span>{t('addProductBtn')}</span>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-3">{t('sampleProductName')}</th>
                                            <th className="px-6 py-3">{t('price')}</th>
                                            <th className="px-6 py-3">{t('stock')}</th>
                                            <th className="px-6 py-3">{t('sales')}</th>
                                            <th className="px-6 py-3">{t('status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {[
                                            {
                                                name: 'Tai nghe Bluetooth Không Dây Timmy Pro',
                                                price: '₫890.000',
                                                stock: 120,
                                                sales: 45,
                                                status: 'active',
                                            },
                                            {
                                                name: 'Đồng hồ thông minh TimmyWatch Gen 3',
                                                price: '₫1.450.000',
                                                stock: 45,
                                                sales: 88,
                                                status: 'active',
                                            },
                                            {
                                                name: 'Bàn phím cơ không dây Custom 75%',
                                                price: '₫1.890.000',
                                                stock: 30,
                                                sales: 12,
                                                status: 'active',
                                            },
                                            {
                                                name: 'Chuột Gaming siêu nhẹ Wireless RGB',
                                                price: '₫650.000',
                                                stock: 85,
                                                sales: 64,
                                                status: 'active',
                                            },
                                        ].map((item, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-3">
                                                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                        <Package className="size-4" />
                                                    </div>
                                                    <span>{item.name}</span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-primary">{item.price}</td>
                                                <td className="px-6 py-4">{item.stock}</td>
                                                <td className="px-6 py-4">{item.sales}</td>
                                                <td className="px-6 py-4">
                                                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                                                        {t('statusActive')}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── TAB 3: ORDERS ── */}
                <TabsContent value="orders" className="space-y-6">
                    <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-6 border-b border-border/60">
                            <CardTitle className="text-lg font-bold text-foreground">
                                Quản lý Đơn Hàng Gần Đây
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Xử lý đóng gói, bàn giao vận chuyển và chăm sóc khách hàng sau bán.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                {[
                                    {
                                        id: '#TM-9281',
                                        customer: 'Nguyễn Văn An',
                                        item: 'Tai nghe Bluetooth Timmy Pro (x1)',
                                        total: '₫890.000',
                                        status: 'Chờ lấy hàng',
                                    },
                                    {
                                        id: '#TM-9280',
                                        customer: 'Trần Thị Mai',
                                        item: 'Đồng hồ TimmyWatch Gen 3 (x1)',
                                        total: '₫1.450.000',
                                        status: 'Đang giao',
                                    },
                                    {
                                        id: '#TM-9279',
                                        customer: 'Lê Hoàng Nam',
                                        item: 'Bàn phím cơ Custom 75% (x1)',
                                        total: '₫1.890.000',
                                        status: 'Đã hoàn thành',
                                    },
                                ].map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 gap-3 text-xs"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-bold text-foreground flex items-center gap-2">
                                                <span>{order.id}</span>
                                                <span>&bull;</span>
                                                <span>{order.customer}</span>
                                            </div>
                                            <p className="text-muted-foreground">{order.item}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-sm text-primary">{order.total}</span>
                                            <Badge variant="outline" className="border-primary/40 text-primary">
                                                {order.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── TAB 4: SETTINGS ── */}
                <TabsContent value="settings" className="space-y-6">
                    <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden max-w-3xl">
                        <CardHeader className="p-6 sm:p-8 border-b border-border/60 space-y-1">
                            <CardTitle className="text-xl font-bold text-foreground">{t('tabSettings')}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Cập nhật thông tin nhận diện thương hiệu, địa chỉ xuất kho và chính sách dịch vụ.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8">
                            <form onSubmit={form.handleSubmit(onUpdateProfile)} className="space-y-5">
                                <FloatInput
                                    label="Tên cửa hàng *"
                                    error={form.formState.errors.shopName?.message}
                                    {...form.register('shopName')}
                                />

                                <FloatTextarea
                                    label="Mô tả gian hàng"
                                    rows={3}
                                    error={form.formState.errors.description?.message}
                                    {...form.register('description')}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FloatInput
                                        label="URL Logo cửa hàng"
                                        error={form.formState.errors.shopLogo?.message}
                                        {...form.register('shopLogo')}
                                    />
                                    <FloatInput
                                        label="URL Ảnh bìa gian hàng"
                                        error={form.formState.errors.shopBanner?.message}
                                        {...form.register('shopBanner')}
                                    />
                                </div>

                                <FloatInput
                                    label="Địa chỉ kho hàng lấy hàng"
                                    error={form.formState.errors.warehouseAddressLine?.message}
                                    {...form.register('warehouseAddressLine')}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FloatInput
                                        type="number"
                                        label="Chính sách đổi trả (ngày)"
                                        error={form.formState.errors.returnPolicyDays?.message}
                                        {...form.register('returnPolicyDays', { valueAsNumber: true })}
                                    />
                                    <FloatInput
                                        type="number"
                                        label="Thời gian chuẩn bị hàng (giờ)"
                                        error={form.formState.errors.prepTimeHours?.message}
                                        {...form.register('prepTimeHours', { valueAsNumber: true })}
                                    />
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={updateMutation.isPending}
                                        className="rounded-xl px-8 font-bold gap-2 shadow-lg bg-primary text-white hover:bg-primary/90"
                                    >
                                        <Save className="size-4" />
                                        <span>{updateMutation.isPending ? t('savingBtn') : t('saveSettingsBtn')}</span>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
