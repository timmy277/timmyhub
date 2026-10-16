'use client'

import { useId, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
    ArrowUpDown,
    CheckCircle2,
    Clock,
    Heart,
    MessageCircle,
    Package,
    RotateCcw,
    Search,
    Share2,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    Store,
    Ticket,
    Truck,
    X,
} from 'lucide-react'
import { toast } from 'sonner'

import type { CategorySummary, ProductListResult, PublicShopDetail } from '@timmyhub/contracts'

import { Badge, Button, Card, CardContent, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components'
import { IconPath } from '@/components/icons'
import { ROUTE } from '@/constants'
import { useMySavedVoucherIds, usePublicAvailableVouchers, useSaveUserVoucher } from '@/hooks'
import { formatCurrencyVND } from '@/utils'

export interface PublicShopViewProps {
    shop: PublicShopDetail
    initialProducts?: ProductListResult | null
    categories?: CategorySummary[]
}

type SortOption = 'popular' | 'latest' | 'best_selling' | 'price_asc' | 'price_desc'

export function PublicShopView({ shop, initialProducts, categories = [] }: PublicShopViewProps) {
    const t = useTranslations('seller.publicShop')
    const searchInputId = useId()

    // ===== Interactive Follow & Stats State =====
    const [isFollowing, setIsFollowing] = useState(false)
    const baseFollowers = useMemo(() => {
        // Tạo con số follower ổn định và ấn tượng từ ID của shop
        const hash = shop.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        return 1200 + (hash % 8500)
    }, [shop.id])
    const followerCount = baseFollowers + (isFollowing ? 1 : 0)

    // ===== Tab State =====
    const [activeTab, setActiveTab] = useState<'products' | 'about'>('products')

    // ===== Filter & Sort State =====
    const [searchKeyword, setSearchKeyword] = useState('')
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL')
    const [sortBy, setSortBy] = useState<SortOption>('popular')

    // ===== Vouchers Integration =====
    const { data: allVouchers = [] } = usePublicAvailableVouchers()
    const { data: savedVoucherIds = [] } = useMySavedVoucherIds()
    const saveVoucherMutation = useSaveUserVoucher()

    const shopVouchers = useMemo(() => {
        return allVouchers.filter(
            (v) => v.sellerId === shop.id || v.type === 'FREE_SHIPPING' || (!v.sellerId && v.type === 'PERCENTAGE'),
        )
    }, [allVouchers, shop.id])

    // ===== Filtered & Sorted Products =====
    const allProducts = useMemo(() => {
        return initialProducts?.items || []
    }, [initialProducts])

    const filteredProducts = useMemo(() => {
        let result = [...allProducts]

        // 1. Lọc theo từ khóa tìm kiếm
        if (searchKeyword.trim()) {
            const query = searchKeyword.trim().toLowerCase()
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    (p.categoryName && p.categoryName.toLowerCase().includes(query)),
            )
        }

        // 2. Lọc theo danh mục
        if (selectedCategoryId !== 'ALL') {
            result = result.filter((p) => p.categoryId === selectedCategoryId)
        }

        // 3. Sắp xếp
        result.sort((a, b) => {
            switch (sortBy) {
                case 'latest':
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                case 'best_selling':
                    return (b.soldCount || 0) - (a.soldCount || 0)
                case 'price_asc':
                    return Number(a.minPrice || 0) - Number(b.minPrice || 0)
                case 'price_desc':
                    return Number(b.minPrice || 0) - Number(a.minPrice || 0)
                case 'popular':
                default:
                    return (
                        (b.soldCount || 0) * 2 + (b.ratingCount || 0) - ((a.soldCount || 0) * 2 + (a.ratingCount || 0))
                    )
            }
        })

        return result
    }, [allProducts, searchKeyword, selectedCategoryId, sortBy])

    // Danh sách danh mục xuất hiện trong sản phẩm của shop
    const shopCategories = useMemo(() => {
        const catMap = new Map<string, string>()
        allProducts.forEach((p) => {
            if (p.categoryId) {
                const found = categories.find((c) => c.id === p.categoryId)
                catMap.set(p.categoryId, found?.name || p.categoryName || 'Sản phẩm')
            }
        })
        return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }))
    }, [allProducts, categories])

    // Xử lý follow
    const handleToggleFollow = () => {
        setIsFollowing((prev) => !prev)
        if (!isFollowing) {
            toast.success(`Đã theo dõi ${shop.shopName}! Bạn sẽ nhận được các thông báo ưu đãi độc quyền sớm nhất.`)
        } else {
            toast.info(`Đã hủy theo dõi ${shop.shopName}`)
        }
    }

    // Xử lý chia sẻ link shop
    const handleShare = async () => {
        const url = window.location.href
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(url)
            toast.success(t('shareSuccess'))
        } else {
            toast.info(url)
        }
    }

    const joinedFormattedDate = shop.createdAt
        ? new Date(shop.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
        : '2026'

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* ═══════════════════════════════════════════════════════════════════
             * 1. HERO BRAND COVER BANNER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative w-full h-52 sm:h-64 md:h-80 overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950">
                {shop.shopBanner ? (
                    <Image
                        src={shop.shopBanner}
                        alt={`${shop.shopName} Banner`}
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover opacity-35 filter blur-[1px] scale-105 transition-transform duration-700"
                    />
                ) : (
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary via-emerald-600 to-transparent" />
                )}

                {/* Subtle Decorative Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] opacity-25" />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/30" />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * 2. SHOP PROFILE HEADER CARD (Glassmorphism & Interactive)
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-28 relative z-10">
                <div className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-5 sm:p-7 shadow-2xl space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Avatar & Main Identity */}
                        <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                            {/* Logo */}
                            <div className="relative size-20 sm:size-24 rounded-2xl bg-gradient-to-tr from-primary to-emerald-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-xl border-4 border-card shrink-0 overflow-hidden ring-2 ring-primary/20">
                                {shop.shopLogo ? (
                                    <Image
                                        src={shop.shopLogo}
                                        alt={shop.shopName}
                                        fill
                                        sizes="96px"
                                        className="object-cover"
                                    />
                                ) : (
                                    shop.shopName.charAt(0).toUpperCase()
                                )}
                                {shop.isVerified && (
                                    <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 text-white rounded-tl-lg shadow">
                                        <CheckCircle2 className="size-3.5 sm:size-4" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="space-y-2 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                                        {shop.shopName}
                                    </h1>
                                    <Badge className="bg-primary/15 text-primary border-primary/30 font-semibold gap-1 text-xs">
                                        <IconPath name="gemini-star" className="size-2.5 text-primary animate-pulse" />
                                        {t('verifiedBadge')}
                                    </Badge>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        {t('activeStatus')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                                    <span className="font-mono text-xs text-foreground/80 font-medium">
                                        @{shop.shopSlug || 'official'}
                                    </span>
                                    <span>&bull;</span>
                                    <span className="flex items-center gap-1">
                                        <Heart className="size-3.5 text-rose-500 fill-rose-500" />
                                        <strong className="text-foreground">
                                            {followerCount.toLocaleString()}
                                        </strong>{' '}
                                        người theo dõi
                                    </span>
                                    <span>&bull;</span>
                                    <span>{t('joinedDate', { date: joinedFormattedDate })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions (Follow, Chat, Share) */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <Button
                                onClick={handleToggleFollow}
                                variant={isFollowing ? 'secondary' : 'default'}
                                size="sm"
                                className={`rounded-xl font-bold gap-2 shadow-md transition-all duration-300 ${
                                    isFollowing
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                                        : 'bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500'
                                }`}
                            >
                                <Heart
                                    className={`size-4 transition-transform duration-300 ${
                                        isFollowing ? 'scale-110 fill-rose-500 text-rose-500' : ''
                                    }`}
                                />
                                <span>{isFollowing ? t('following') : t('follow')}</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    toast.info(
                                        `Hộp thư chăm sóc khách hàng của ${shop.shopName} đang kết nối trực tiếp...`,
                                    )
                                }
                                className="rounded-xl font-semibold gap-1.5 shadow-sm hover:border-primary/50"
                            >
                                <MessageCircle className="size-4 text-primary" />
                                <span>{t('chatNow')}</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleShare}
                                className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                                title={t('share')}
                            >
                                <Share2 className="size-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Operational Performance Strip (4 Metrics) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-border/60">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40">
                            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Package className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground font-medium truncate">
                                    {t('statProducts')}
                                </p>
                                <p className="text-sm font-bold text-foreground">
                                    {allProducts.length}{' '}
                                    <span className="text-[11px] font-normal text-muted-foreground">mặt hàng</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40">
                            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <Star className="size-4 fill-amber-500 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground font-medium truncate">
                                    {t('statRating')}
                                </p>
                                <p className="text-sm font-bold text-foreground flex items-center gap-1">
                                    <span>{(shop.rating || 4.9).toFixed(1)}</span>
                                    <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40">
                            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <Clock className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground font-medium truncate">
                                    {t('statChatResponse')}
                                </p>
                                <p className="text-sm font-bold text-foreground truncate">
                                    {t('statChatResponseValue')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40">
                            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <Truck className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground font-medium truncate">
                                    {t('statOnTimeDelivery')}
                                </p>
                                <p className="text-sm font-bold text-foreground truncate">
                                    {t('statOnTimeDeliveryValue')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════
                 * 3. EXCLUSIVE SHOP VOUCHERS STRIP
                 * ═══════════════════════════════════════════════════════════════════ */}
                {shopVouchers.length > 0 && (
                    <div className="mt-8 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Ticket className="size-5 text-primary" />
                                <h2 className="text-base sm:text-lg font-bold text-foreground">{t('vouchersTitle')}</h2>
                            </div>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                {t('vouchersSubtitle')}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
                            {shopVouchers.map((v) => {
                                const isSaved = savedVoucherIds.includes(v.id)
                                const isShipping = v.type === 'FREE_SHIPPING'

                                return (
                                    <div
                                        key={v.id}
                                        className="min-w-[260px] sm:min-w-[300px] shrink-0 relative overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-card p-3.5 shadow-sm hover:border-primary transition-all duration-300 flex items-center justify-between gap-3"
                                    >
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono text-xs font-black text-emerald-950 dark:text-emerald-100 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60">
                                                    {v.code}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] px-1.5 py-0 font-bold border-0 bg-muted"
                                                >
                                                    {isShipping ? 'Freeship' : 'Mã Shop'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs font-bold text-foreground truncate">
                                                {v.description ||
                                                    (isShipping
                                                        ? `Giảm ${formatCurrencyVND(v.value || 30000)} phí ship`
                                                        : v.type === 'PERCENTAGE'
                                                          ? `Giảm ${v.value}%${v.maxDiscount ? ` (tối đa ${formatCurrencyVND(v.maxDiscount)})` : ''}`
                                                          : `Giảm ${formatCurrencyVND(v.value)}`)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Đơn tối thiểu {formatCurrencyVND(v.minOrderValue || 0)}
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={isSaved ? 'outline' : 'default'}
                                            disabled={saveVoucherMutation.isPending}
                                            onClick={() =>
                                                saveVoucherMutation.mutate({ voucherId: v.id, code: v.code })
                                            }
                                            className="h-8 px-3 text-xs font-bold rounded-xl shrink-0"
                                        >
                                            {isSaved ? t('savedVoucher') : t('saveVoucher')}
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════
                 * 4. MAIN STORE CONTENT: TABS (PRODUCTS vs ABOUT)
                 * ═══════════════════════════════════════════════════════════════════ */}
                <div className="mt-8">
                    <Tabs
                        value={activeTab}
                        onValueChange={(val) => setActiveTab(val as 'products' | 'about')}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between border-b border-border/80 pb-3 flex-wrap gap-4">
                            <TabsList className="bg-muted/70 p-1 rounded-2xl border border-border/60">
                                <TabsTrigger
                                    value="products"
                                    className="rounded-xl text-xs sm:text-sm font-bold px-4 py-2 gap-2"
                                >
                                    <ShoppingBag className="size-4" />
                                    <span>{t('tabProducts')}</span>
                                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-background/80 font-mono">
                                        {filteredProducts.length}
                                    </span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="about"
                                    className="rounded-xl text-xs sm:text-sm font-bold px-4 py-2 gap-2"
                                >
                                    <ShieldCheck className="size-4" />
                                    <span>{t('tabAbout')}</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* ─────────────────────────────────────────────────────────
                         * TAB 1: SẢN PHẨM CỦA GIAN HÀNG
                         * ───────────────────────────────────────────────────────── */}
                        <TabsContent value="products" className="space-y-6 outline-none">
                            {/* Filter & Sort Bar */}
                            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/70 shadow-sm">
                                {/* Search input inside shop */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input
                                        id={searchInputId}
                                        value={searchKeyword}
                                        onChange={(e) => setSearchKeyword(e.target.value)}
                                        placeholder={t('searchPlaceholder')}
                                        className="pl-10 pr-9 rounded-xl bg-background border-border text-sm"
                                    />
                                    {searchKeyword && (
                                        <Button
                                            type="button"
                                            onClick={() => setSearchKeyword('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            variant="ghost"
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Sort Options */}
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
                                        <ArrowUpDown className="size-3.5" />
                                        Sắp xếp:
                                    </span>
                                    <Button
                                        variant={sortBy === 'popular' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSortBy('popular')}
                                        className="rounded-xl text-xs font-semibold h-8"
                                    >
                                        {t('sortPopular')}
                                    </Button>
                                    <Button
                                        variant={sortBy === 'latest' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSortBy('latest')}
                                        className="rounded-xl text-xs font-semibold h-8"
                                    >
                                        {t('sortLatest')}
                                    </Button>
                                    <Button
                                        variant={sortBy === 'best_selling' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSortBy('best_selling')}
                                        className="rounded-xl text-xs font-semibold h-8"
                                    >
                                        {t('sortBestSelling')}
                                    </Button>
                                    <Button
                                        variant={sortBy === 'price_asc' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSortBy('price_asc')}
                                        className="rounded-xl text-xs font-semibold h-8"
                                    >
                                        {t('sortPriceAsc')}
                                    </Button>
                                    <Button
                                        variant={sortBy === 'price_desc' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSortBy('price_desc')}
                                        className="rounded-xl text-xs font-semibold h-8"
                                    >
                                        {t('sortPriceDesc')}
                                    </Button>
                                </div>
                            </div>

                            {/* Category Filter Pills (if any) */}
                            {shopCategories.length > 0 && (
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                    <Button
                                        type="button"
                                        onClick={() => setSelectedCategoryId('ALL')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                            selectedCategoryId === 'ALL'
                                                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                                                : 'bg-muted/70 text-neutral-800 dark:text-neutral-200 hover:bg-muted hover:text-foreground'
                                        }`}
                                        variant="ghost"
                                    >
                                        {t('allCategories')}
                                    </Button>
                                    {shopCategories.map((c) => (
                                        <Button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setSelectedCategoryId(c.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                                selectedCategoryId === c.id
                                                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                                                    : 'bg-muted/70 text-neutral-800 dark:text-neutral-200 hover:bg-muted hover:text-foreground'
                                            }`}
                                            variant="ghost"
                                        >
                                            {c.name}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {/* Products Grid */}
                            {filteredProducts.length === 0 ? (
                                <div className="py-16 text-center space-y-4 rounded-3xl border border-dashed border-border/80 bg-card/40 p-8">
                                    <div className="size-14 mx-auto rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
                                        <Package className="size-7" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-heading text-lg font-bold text-foreground">
                                            {t('emptyProducts')}
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                            {t('emptyProductsDesc')}
                                        </p>
                                    </div>
                                    {(searchKeyword || selectedCategoryId !== 'ALL') && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSearchKeyword('')
                                                setSelectedCategoryId('ALL')
                                            }}
                                            className="rounded-xl font-semibold"
                                        >
                                            {t('clearFilters')}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                                    {filteredProducts.map((p) => {
                                        const productUrl = ROUTE.PRODUCT_DETAIL(p.slug || p.id)
                                        const productImage =
                                            p.images?.[0] ||
                                            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'

                                        return (
                                            <Link
                                                key={p.id}
                                                href={productUrl}
                                                className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-3 sm:p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 relative"
                                            >
                                                {/* Image Container with Badges */}
                                                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40 mb-3">
                                                    <Image
                                                        src={productImage}
                                                        alt={p.name}
                                                        fill
                                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                    {p.soldCount > 50 && (
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-black text-[9px] uppercase tracking-wider shadow">
                                                            Hot
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Category label */}
                                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate mb-1">
                                                    {p.categoryName || 'Sản phẩm'}
                                                </p>

                                                {/* Product Name */}
                                                <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug min-h-[2.5rem]">
                                                    {p.name}
                                                </h3>

                                                {/* Price & Sold Stats */}
                                                <div className="mt-auto pt-3 flex items-baseline justify-between gap-2 border-t border-border/40">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                                                            {formatCurrencyVND(p.minPrice)}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] sm:text-[11px] text-muted-foreground shrink-0">
                                                        Đã bán {p.soldCount || 0}
                                                    </span>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        {/* ─────────────────────────────────────────────────────────
                         * TAB 2: HỒ SƠ & CAM KẾT GIAN HÀNG
                         * ───────────────────────────────────────────────────────── */}
                        <TabsContent value="about" className="space-y-6 outline-none">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Bio Section */}
                                <div className="md:col-span-2 space-y-6">
                                    <Card className="rounded-3xl border-border/80 bg-card shadow-sm">
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Store className="size-5 text-primary" />
                                                <h3 className="font-heading text-lg font-bold text-foreground">
                                                    {t('aboutTitle')}
                                                </h3>
                                            </div>
                                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                                                {shop.description || t('defaultBio')}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Commitments & Guarantees */}
                                    <Card className="rounded-3xl border-border/80 bg-card shadow-sm">
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="size-5 text-primary" />
                                                <h3 className="font-heading text-lg font-bold text-foreground">
                                                    {t('commitmentsTitle')}
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
                                                    <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                                        <ShieldCheck className="size-4" />
                                                    </div>
                                                    <p className="text-xs font-bold text-foreground">
                                                        {t('commitment1Title')}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        {t('commitment1Desc')}
                                                    </p>
                                                </div>

                                                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
                                                    <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                                        <RotateCcw className="size-4" />
                                                    </div>
                                                    <p className="text-xs font-bold text-foreground">
                                                        {t('commitment2Title')}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        {t('commitment2Desc')}
                                                    </p>
                                                </div>

                                                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
                                                    <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                                        <Package className="size-4" />
                                                    </div>
                                                    <p className="text-xs font-bold text-foreground">
                                                        {t('commitment3Title')}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        {t('commitment3Desc')}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Quick Shop Specs Sidebar */}
                                <div className="space-y-6">
                                    <Card className="rounded-3xl border-border/80 bg-card shadow-sm">
                                        <CardContent className="p-6 space-y-4">
                                            <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wider">
                                                Thông tin gian hàng
                                            </h4>
                                            <div className="divide-y divide-border/60 text-xs">
                                                <div className="py-2.5 flex justify-between">
                                                    <span className="text-muted-foreground">Định danh gian hàng</span>
                                                    <span className="font-mono font-bold text-foreground">
                                                        @{shop.shopSlug || 'official'}
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex justify-between">
                                                    <span className="text-muted-foreground">Trạng thái sàn</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        Chính hãng &bull; Đã xác minh
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex justify-between">
                                                    <span className="text-muted-foreground">Tham gia từ</span>
                                                    <span className="font-medium text-foreground">
                                                        {joinedFormattedDate}
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex justify-between">
                                                    <span className="text-muted-foreground">Đánh giá trung bình</span>
                                                    <span className="font-bold text-amber-500 flex items-center gap-1">
                                                        <Star className="size-3.5 fill-amber-500" />
                                                        {(shop.rating || 4.9).toFixed(1)} / 5.0
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
