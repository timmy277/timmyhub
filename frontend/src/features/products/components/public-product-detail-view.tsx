'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    CheckCircle2Icon,
    ChevronRightIcon,
    HeartIcon,
    HomeIcon,
    MinusIcon,
    PlusIcon,
    RotateCcwIcon,
    Share2Icon,
    ShieldCheckIcon,
    ShoppingCartIcon,
    StarIcon,
    StoreIcon,
    TicketIcon,
    TruckIcon,
    ZapIcon,
    ZoomInIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import type { ProductDetail, ProductSummary } from '@timmyhub/contracts'

import {
    Input,
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import { ProductReviewsSection } from '@/features/engagement'
import { MediaLightbox, type MediaLightboxItem } from '@/features/media'
import {
    useAddToCart,
    useMySavedVoucherIds,
    usePublicAvailableVouchers,
    useSaveUserVoucher,
    useWishlist,
} from '@/hooks'
import { formatCurrencyVND } from '@/utils'

interface PublicProductDetailViewProps {
    product: ProductDetail
    relatedProducts?: ProductSummary[]
}

export function PublicProductDetailView({ product, relatedProducts = [] }: PublicProductDetailViewProps) {
    const t = useTranslations('productDetail')
    const router = useRouter()
    const { isInWishlist, toggleWishlist, isToggling } = useWishlist()
    const isWishlist = isInWishlist(product.id)

    // ===== Gallery State =====
    const allImages = useMemo(() => {
        if (product.images && product.images.length > 0) {
            return product.images
        }
        return ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80']
    }, [product.images])

    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [quantityInput, setQuantityInput] = useState('1')
    const addToCartMutation = useAddToCart()

    const productLightboxItems = useMemo<MediaLightboxItem[]>(() => {
        return allImages.map((imgUrl, i) => ({
            url: imgUrl,
            type: 'IMAGE',
            title: `${product.name} (Ảnh ${i + 1}/${allImages.length})`,
        }))
    }, [allImages, product.name])

    // ===== Voucher / Promotion State =====
    const { data: availableVouchers = [] } = usePublicAvailableVouchers()
    const { data: savedVoucherIds = [] } = useMySavedVoucherIds()
    const saveVoucherMutation = useSaveUserVoucher()
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
    const [activeDetailTab, setActiveDetailTab] = useState('description')

    // Lọc voucher áp dụng cho sản phẩm này: Freeship, Sàn TimmyHub, hoặc Shop tương ứng
    const applicableVouchers = useMemo(() => {
        return availableVouchers.filter((v) => {
            if (v.type === 'FREE_SHIPPING') return true
            if (v.sellerId && v.sellerId === product.shopId) return true
            if (!v.sellerId) return true
            return false
        })
    }, [availableVouchers, product.shopId])

    // ===== Options & Variant Selection =====
    // Lưu option đã chọn theo ID: Record<optionId, valueId>
    const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {}
        if (product.options && product.options.length > 0) {
            for (const opt of product.options) {
                if (opt.values && opt.values.length > 0) {
                    initial[opt.id] = opt.values[0]!.id
                }
            }
        }
        return initial
    })

    // Tìm variant khớp với các option đã chọn
    const activeVariant = useMemo(() => {
        if (!product.variants || product.variants.length === 0) return null

        // Tạo target optionKey: các valueId nối bằng ":" theo thứ tự position của option
        const sortedOptions = [...(product.options || [])].sort((a, b) => a.position - b.position)
        const targetKey = sortedOptions
            .map((opt) => selectedOptionValues[opt.id])
            .filter(Boolean)
            .join(':')

        if (targetKey) {
            const found = product.variants.find((v) => v.optionKey === targetKey)
            if (found) return found
        }

        // Mặc định: variant có isDefault hoặc variant đầu tiên
        return product.variants.find((v) => v.isDefault) || product.variants[0] || null
    }, [product.options, product.variants, selectedOptionValues])

    // Tính toán giá và giảm giá
    const currentPrice = activeVariant?.price ?? product.minPrice ?? '0'
    const comparePrice = activeVariant?.compareAtPrice ?? product.maxPrice ?? null
    const stockAvailable = activeVariant?.stock ?? product.totalStock ?? 0

    const discountPercent = useMemo(() => {
        if (!comparePrice) return 0
        const curr = Number(currentPrice)
        const comp = Number(comparePrice)
        if (comp > curr && curr > 0) {
            return Math.round(((comp - curr) / comp) * 100)
        }
        return 0
    }, [currentPrice, comparePrice])

    // Handlers
    const handleSelectOptionValue = (optionId: string, valueId: string) => {
        setSelectedOptionValues((prev) => ({
            ...prev,
            [optionId]: valueId,
        }))
    }

    const handleShare = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href)
            toast.success(t('shareSuccess'))
        }
    }

    const handleToggleWishlist = () => {
        toggleWishlist(product.id, product.name)
    }

    const quantityRef = useRef(quantity)
    const stockAvailableRef = useRef(stockAvailable)
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        quantityRef.current = quantity
    }, [quantity])

    useEffect(() => {
        stockAvailableRef.current = stockAvailable
    }, [stockAvailable])

    useEffect(() => {
        const timer = debounceTimerRef.current
        return () => {
            if (timer) {
                clearTimeout(timer)
            }
        }
    }, [])

    // Rollback hoặc xác nhận số lượng nhập
    const commitQuantity = (explicitVal?: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
        }

        const valToParse = explicitVal !== undefined ? explicitVal : quantityInput
        const parsed = parseInt(valToParse, 10)
        const lastValid = quantityRef.current
        const available = stockAvailableRef.current

        if (isNaN(parsed) || parsed < 1) {
            toast.warning(t('qtyMinWarning'))
            setQuantityInput(String(lastValid))
            return lastValid
        }
        if (available > 0 && parsed > available) {
            toast.warning(t('qtyMaxWarning', { max: available }))
            setQuantityInput(String(lastValid))
            return lastValid
        }
        if (available <= 0) {
            toast.warning(t('outOfStock'))
            setQuantityInput(String(lastValid))
            return lastValid
        }

        setQuantity(parsed)
        quantityRef.current = parsed
        setQuantityInput(String(parsed))
        return parsed
    }

    const handleQuantityChange = (valStr: string) => {
        const clean = valStr.replace(/\D/g, '')
        setQuantityInput(clean)

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
            commitQuantity(clean)
        }, 600)
    }

    const handleStepQuantity = (delta: number) => {
        const current = commitQuantity()
        const next = current + delta
        if (next < 1) return
        if (stockAvailable > 0 && next > stockAvailable) {
            toast.warning(t('qtyMaxWarning', { max: stockAvailable }))
            return
        }
        setQuantity(next)
        setQuantityInput(String(next))
    }

    // Tự động điều chỉnh nếu tồn kho thay đổi nhỏ hơn số lượng đang chọn
    const [prevStockAvailable, setPrevStockAvailable] = useState(stockAvailable)
    if (stockAvailable !== prevStockAvailable) {
        setPrevStockAvailable(stockAvailable)
        if (stockAvailable > 0 && quantity > stockAvailable) {
            setQuantity(stockAvailable)
            setQuantityInput(String(stockAvailable))
        }
    }

    const handleAddToCart = async () => {
        if (!activeVariant) {
            toast.error(t('selectVariant'))
            return
        }

        if (stockAvailable <= 0) {
            toast.error(t('outOfStock'))
            return
        }

        const effectiveQty = commitQuantity()

        try {
            await addToCartMutation.mutateAsync({
                variantId: activeVariant.id,
                quantity: effectiveQty,
            })
            toast.success(t('addCartSuccess', { quantity: effectiveQty }), {
                description: `${product.name} (SL: ${effectiveQty})`,
                icon: <ShoppingCartIcon className="size-4 text-primary" />,
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : t('addCartError')
            toast.error(message)
        }
    }

    const handleBuyNow = () => {
        if (!activeVariant) {
            toast.error(t('selectVariant'))
            return
        }
        if (stockAvailable <= 0) {
            toast.error(t('outOfStock'))
            return
        }
        const effectiveQty = commitQuantity()
        router.push(
            `${ROUTE.CHECKOUT}?productId=${encodeURIComponent(product.id)}&variantId=${encodeURIComponent(activeVariant.id)}&qty=${effectiveQty}`,
        )
    }

    return (
        <div className="relative min-h-screen w-full pb-16">
            {/* Top Breadcrumb Header */}
            <div className="border-b border-border/60 bg-card/60 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Link
                            href={ROUTE.HOME}
                            className="hover:text-foreground transition-colors flex items-center gap-1.5"
                        >
                            <HomeIcon className="size-3.5 text-primary" />
                            <span>{t('home')}</span>
                        </Link>
                        <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                        {product.categoryName && (
                            <>
                                <span className="hover:text-foreground transition-colors cursor-pointer">
                                    {product.categoryName}
                                </span>
                                <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                            </>
                        )}
                        <span className="truncate max-w-xs sm:max-w-md font-medium text-foreground">
                            {product.name}
                        </span>
                    </nav>
                </div>
            </div>

            {/* Main Showcase Section */}
            <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                    {/* ════════════════════════════════════════════════════════════════
                     * LEFT COLUMN: MULTI-IMAGE GALLERY (ALL PHOTOS DISPLAYED)
                     * ════════════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-6 space-y-4">
                        {/* Main Stage Image with Padded Card Frame */}
                        <div
                            className="group relative aspect-square w-full rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-3 sm:p-4 shadow-md flex items-center justify-center cursor-zoom-in"
                            onClick={() => setIsLightboxOpen(true)}
                        >
                            <div className="relative size-full overflow-hidden rounded-2xl bg-muted/20">
                                <Image
                                    src={allImages[selectedImageIndex] || allImages[0]!}
                                    alt={product.name}
                                    fill
                                    priority
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                />
                            </div>

                            {/* Floating Badges */}
                            <div className="absolute top-5 left-5 flex flex-col gap-2 z-10 pointer-events-none">
                                {discountPercent > 0 && (
                                    <Badge className="bg-destructive text-white font-extrabold text-xs px-2.5 py-1 shadow-md">
                                        {t('discount', { percent: discountPercent })}
                                    </Badge>
                                )}
                                <Badge className="bg-primary/95 text-primary-foreground font-bold text-[11px] px-2.5 py-1 shadow-md backdrop-blur-sm">
                                    {t('authentic')}
                                </Badge>
                            </div>

                            {/* Actions Top Right */}
                            <div
                                className="absolute top-5 right-5 flex items-center gap-2 z-10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Button
                                    onClick={handleShare}
                                    aria-label="Chia sẻ sản phẩm"
                                    className="flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-md transition-all hover:bg-background hover:scale-110 active:scale-95"
                                    variant="ghost"
                                >
                                    <Share2Icon className="size-4" />
                                </Button>
                                <Button
                                    onClick={handleToggleWishlist}
                                    disabled={isToggling}
                                    aria-label="Yêu thích sản phẩm"
                                    className="flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-md transition-all hover:bg-background hover:scale-110 active:scale-95 disabled:opacity-50"
                                    variant="ghost"
                                >
                                    <HeartIcon
                                        className={`size-4 transition-colors ${
                                            isWishlist ? 'fill-rose-500 text-rose-500' : 'text-foreground'
                                        }`}
                                    />
                                </Button>
                            </div>

                            {/* Bottom Zoom & Count Indicators */}
                            <div className="absolute bottom-5 left-5 rounded-full bg-black/60 px-3 py-1 font-medium text-xs text-white backdrop-blur-md z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomInIcon className="size-3.5" />
                                <span>Phóng to</span>
                            </div>

                            <div className="absolute bottom-5 right-5 rounded-full bg-black/60 px-3 py-1 font-mono text-xs font-semibold text-white backdrop-blur-md z-10">
                                {t('photosCount', { current: selectedImageIndex + 1, total: allImages.length })}
                            </div>
                        </div>

                        {/* Thumbnail Selector Strip (Shows ALL Photos) */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                                <span>{t('allPhotos', { count: allImages.length })}</span>
                                <span className="text-[11px] font-normal">{t('clickToView')}</span>
                            </p>
                            <div className="-mx-2 flex items-center gap-3 overflow-x-auto px-2 py-2.5 scrollbar-thin">
                                {allImages.map((imgUrl, idx) => {
                                    const isSelected = idx === selectedImageIndex
                                    return (
                                        <Button
                                            key={`${imgUrl}-${idx}`}
                                            onClick={() => setSelectedImageIndex(idx)}
                                            className={`relative size-20 sm:size-24 shrink-0 rounded-2xl border-2 p-1 bg-card transition-all duration-200 focus-visible:outline-none ${
                                                isSelected
                                                    ? 'border-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background scale-105 shadow-md'
                                                    : 'border-border/70 opacity-75 hover:opacity-100 hover:border-foreground/40'
                                            }`}
                                            variant="ghost"
                                        >
                                            <div className="relative size-full overflow-hidden rounded-xl bg-muted/20">
                                                <Image
                                                    src={imgUrl}
                                                    alt={`${product.name} - ảnh ${idx + 1}`}
                                                    fill
                                                    loading={idx === 0 ? 'eager' : 'lazy'}
                                                    sizes="96px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        </Button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════════════════════
                     * RIGHT COLUMN: PRODUCT INFO & PURCHASE CONTROLS
                     * ════════════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-6 flex flex-col space-y-6">
                        {/* Shop Header & Product Title */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={ROUTE.SHOP_DETAIL(product.shopSlug || product.shopId)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition-colors hover:bg-primary/20"
                                >
                                    <StoreIcon className="size-3.5 text-emerald-800 dark:text-emerald-300" />
                                    <span>{product.shopName || 'TimmyHub Mall'}</span>
                                    <CheckCircle2Icon className="size-3 text-emerald-800 dark:text-emerald-300" />
                                </Link>
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                                    Mã SP: {activeVariant?.sku || product.slug}
                                </span>
                            </div>

                            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                                {product.name}
                            </h1>

                            {/* Ratings & Social Counts */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        document
                                            .getElementById('product-reviews')
                                            ?.scrollIntoView({ behavior: 'smooth' })
                                    }}
                                    className="flex items-center gap-1.5 text-foreground font-semibold hover:opacity-80 transition-opacity cursor-pointer group"
                                    variant="ghost"
                                >
                                    <span className="text-amber-700 dark:text-amber-400 font-bold underline-offset-4 group-hover:underline">
                                        {product.ratingAvg.toFixed(1)}
                                    </span>
                                    <div className="flex items-center text-amber-400">
                                        {[...Array(5)].map((_, i) => (
                                            <StarIcon key={i} className="size-3.5 fill-current" />
                                        ))}
                                    </div>
                                    <span className="text-muted-foreground font-normal">
                                        ({t('tabReviews', { count: product.ratingCount || 0 })})
                                    </span>
                                </Button>
                                <span className="text-border">•</span>
                                <div>
                                    Đã bán: <strong className="text-foreground">{product.soldCount || 342}</strong>
                                </div>
                                <span className="text-border">•</span>
                                <div>
                                    Lượt xem: <strong className="text-foreground">{product.viewCount || 1850}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Banner Box */}
                        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-sm space-y-2">
                            <div className="flex flex-wrap items-baseline gap-3">
                                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
                                    {formatCurrencyVND(currentPrice)}
                                </span>
                                {comparePrice && (
                                    <span className="text-base text-muted-foreground line-through">
                                        {formatCurrencyVND(comparePrice)}
                                    </span>
                                )}
                                {discountPercent > 0 && (
                                    <span className="rounded-lg bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
                                        {t('save', { percent: discountPercent })}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 font-semibold">
                                    <TruckIcon className="size-3" />
                                    {t('freeship')}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 font-semibold">
                                    <ZapIcon className="size-3" />
                                    {t('fastDelivery')}
                                </span>
                            </div>
                        </div>

                        {/* Voucher & Khuyến mãi dành riêng cho sản phẩm này */}
                        {applicableVouchers.length > 0 && (
                            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-md space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TicketIcon className="size-4 text-primary" />
                                        <span className="text-xs font-bold text-foreground">
                                            Voucher & Khuyến mãi ({applicableVouchers.length})
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => setIsVoucherModalOpen(true)}
                                        className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                                        variant="ghost"
                                    >
                                        <span>Xem tất cả</span>
                                        <ChevronRightIcon className="size-3.5" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                    {applicableVouchers.slice(0, 4).map((v) => {
                                        const isSaved = savedVoucherIds.includes(v.id)
                                        const isShipping = v.type === 'FREE_SHIPPING'
                                        const isShop = Boolean(v.sellerId)

                                        const label = isShipping
                                            ? `Freeship ${v.value > 0 ? formatCurrencyVND(v.value) : '30k'}`
                                            : v.type === 'PERCENTAGE'
                                              ? `Giảm ${v.value}%`
                                              : `Giảm ${formatCurrencyVND(v.value)}`

                                        return (
                                            <div
                                                key={v.id}
                                                onClick={() => setIsVoucherModalOpen(true)}
                                                className="group flex items-center shrink-0 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer overflow-hidden shadow-2xs"
                                            >
                                                <div className="px-2.5 py-1.5 flex items-center gap-1.5 border-r border-dashed border-primary/30">
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[9px] font-bold px-1 py-0 border-0 ${
                                                            isShipping
                                                                ? 'bg-emerald-500/20 text-emerald-950 dark:text-emerald-200'
                                                                : isShop
                                                                  ? 'bg-blue-500/20 text-blue-950 dark:text-blue-200'
                                                                  : 'bg-purple-500/20 text-purple-950 dark:text-purple-200'
                                                        }`}
                                                    >
                                                        {isShipping ? 'Freeship' : isShop ? 'Shop' : 'Sàn'}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-foreground font-mono">
                                                        {label}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        saveVoucherMutation.mutate({ voucherId: v.id, code: v.code })
                                                    }}
                                                    disabled={saveVoucherMutation.isPending}
                                                    className={`px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                                                        isSaved
                                                            ? 'text-muted-foreground bg-muted/40 cursor-default'
                                                            : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 hover:bg-primary/15'
                                                    }`}
                                                    variant="ghost"
                                                >
                                                    {isSaved ? 'Đã lưu' : 'Lưu'}
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Interactive Options & Variants */}
                        {product.options && product.options.length > 0 && (
                            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/85 backdrop-blur-md p-5 shadow-sm">
                                {product.options.map((option) => (
                                    <div key={option.id} className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-foreground">{option.name}:</span>
                                            <span className="text-muted-foreground font-medium">
                                                {
                                                    option.values.find((v) => v.id === selectedOptionValues[option.id])
                                                        ?.value
                                                }
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {option.values.map((val) => {
                                                const isSelected = selectedOptionValues[option.id] === val.id
                                                return (
                                                    <Button
                                                        key={val.id}
                                                        type="button"
                                                        onClick={() => handleSelectOptionValue(option.id, val.id)}
                                                        className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 border ${
                                                            isSelected
                                                                ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-105'
                                                                : 'border-border/80 bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground'
                                                        }`}
                                                        variant="ghost"
                                                    >
                                                        {val.value}
                                                    </Button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity & Stock Selector */}
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <span className="text-xs font-bold text-foreground">{t('quantity')}</span>
                            <div className="flex items-center rounded-xl border border-border/80 bg-card p-1">
                                <Button
                                    type="button"
                                    onClick={() => handleStepQuantity(-1)}
                                    disabled={quantity <= 1 || stockAvailable <= 0}
                                    aria-label="Giảm số lượng"
                                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                                    variant="ghost"
                                >
                                    <MinusIcon className="size-3.5" />
                                </Button>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={quantityInput}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    onBlur={() => commitQuantity()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.currentTarget.blur()
                                        }
                                    }}
                                    disabled={stockAvailable <= 0}
                                    aria-label="Số lượng sản phẩm"
                                    className="w-12 text-center text-sm font-bold text-foreground font-mono bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                                />
                                <Button
                                    type="button"
                                    onClick={() => handleStepQuantity(1)}
                                    disabled={quantity >= stockAvailable || stockAvailable <= 0}
                                    aria-label="Tăng số lượng"
                                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                                    variant="ghost"
                                >
                                    <PlusIcon className="size-3.5" />
                                </Button>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {t('stockLeft')} <strong className="text-foreground">{stockAvailable}</strong>{' '}
                                {t('unit')}
                            </span>
                        </div>

                        {/* Purchase Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={handleAddToCart}
                                disabled={addToCartMutation.isPending || stockAvailable <= 0}
                                className="h-12 rounded-2xl font-bold gap-2 text-emerald-800 dark:text-emerald-300 border-primary/40 hover:bg-primary/10 shadow-sm"
                            >
                                {addToCartMutation.isPending ? (
                                    <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                ) : (
                                    <ShoppingCartIcon className="size-4" />
                                )}
                                {addToCartMutation.isPending ? t('addingToCart') : t('addToCart')}
                            </Button>
                            <Button
                                size="lg"
                                onClick={handleBuyNow}
                                className="h-12 rounded-2xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-transform active:scale-95"
                            >
                                <ZapIcon className="size-4 fill-current" />
                                {t('buyNow')}
                            </Button>
                        </div>

                        {/* Trust & Commitments Guarantee Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3">
                                <ShieldCheckIcon className="size-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                <div className="text-left leading-tight">
                                    <p className="text-xs font-bold text-foreground">{t('commitmentAuthentic')}</p>
                                    <p className="text-[10px] text-muted-foreground">{t('commitmentAuthenticSub')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3">
                                <RotateCcwIcon className="size-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                <div className="text-left leading-tight">
                                    <p className="text-xs font-bold text-foreground">{t('commitmentReturn')}</p>
                                    <p className="text-[10px] text-muted-foreground">{t('commitmentReturnSub')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════════
                 * SELLER / SHOP BANNER STRIP
                 * ════════════════════════════════════════════════════════════════ */}
                <div className="mt-8 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="relative size-14 sm:size-16 rounded-2xl bg-gradient-to-tr from-primary to-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0 overflow-hidden ring-1 ring-border">
                            {product.shopName ? (
                                product.shopName.charAt(0).toUpperCase()
                            ) : (
                                <StoreIcon className="size-7" />
                            )}
                        </div>
                        <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                    href={ROUTE.SHOP_DETAIL(product.shopSlug || product.shopId)}
                                    className="hover:underline hover:text-primary transition-colors inline-block"
                                >
                                    <h2 className="font-heading text-base sm:text-lg font-bold text-foreground truncate">
                                        {product.shopName || 'Gian hàng chính hãng'}
                                    </h2>
                                </Link>
                                <Badge className="bg-primary/15 text-emerald-950 dark:text-emerald-100 border-primary/30 font-bold gap-1 text-[10px] py-0">
                                    <CheckCircle2Icon className="size-3 text-emerald-800 dark:text-emerald-300" />
                                    Chính hãng
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                                <span>
                                    Đánh giá: <strong className="text-foreground">4.9 / 5.0</strong> ★
                                </span>
                                <span>&bull;</span>
                                <span>
                                    Phản hồi chat: <strong className="text-foreground">99%</strong>
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="rounded-xl font-bold gap-1.5 shadow-sm text-xs hover:border-primary/50"
                        >
                            <Link href={ROUTE.SHOP_DETAIL(product.shopSlug || product.shopId)}>
                                <StoreIcon className="size-3.5 text-primary" />
                                <span>Xem Shop</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════════
                 * BOTTOM SECTION: DETAILED SPECIFICATIONS & PRODUCT DESCRIPTION
                 * ════════════════════════════════════════════════════════════════ */}
                <div className="mt-8 rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-6 sm:p-8 shadow-sm">
                    <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="space-y-6">
                        <TabsList className="rounded-xl bg-muted/60 p-1 border border-border/60">
                            <TabsTrigger value="description" className="rounded-lg text-xs font-bold px-4">
                                {t('tabOverview')}
                            </TabsTrigger>
                            <TabsTrigger value="specs" className="rounded-lg text-xs font-bold px-4">
                                {t('tabSpecs')}
                            </TabsTrigger>
                            <TabsTrigger value="shipping" className="rounded-lg text-xs font-bold px-4">
                                Chính sách bảo hành
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="description" className="space-y-4">
                            <h2 className="font-heading text-lg font-bold text-foreground">
                                Chi tiết về {product.name}
                            </h2>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                                {product.description ||
                                    'Sản phẩm chất lượng cao được phân phối trực tiếp từ thương hiệu chính hãng trên TimmyHub. Cam kết quy trình đóng gói tiêu chuẩn, bảo vệ an toàn sản phẩm trong suốt quá trình vận chuyển.'}
                            </div>
                        </TabsContent>

                        <TabsContent value="specs" className="space-y-4">
                            <h2 className="font-heading text-lg font-bold text-foreground">Bảng thông số sản phẩm</h2>
                            <div className="divide-y border-border/60 rounded-2xl border border-border/60 overflow-hidden text-xs">
                                <div className="grid grid-cols-3 p-3 bg-muted/30">
                                    <span className="font-semibold text-muted-foreground">Tên sản phẩm</span>
                                    <span className="col-span-2 font-bold text-foreground">{product.name}</span>
                                </div>
                                <div className="grid grid-cols-3 p-3">
                                    <span className="font-semibold text-muted-foreground">Danh mục</span>
                                    <span className="col-span-2 font-medium text-foreground">
                                        {product.categoryName || 'Chung'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 p-3 bg-muted/30">
                                    <span className="font-semibold text-muted-foreground">Nhà cung cấp / Shop</span>
                                    <span className="col-span-2 font-medium text-foreground">
                                        {product.shopName || 'Gian hàng TimmyHub'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 p-3">
                                    <span className="font-semibold text-muted-foreground">Tình trạng kho</span>
                                    <span className="col-span-2 font-medium text-foreground">
                                        Còn {product.totalStock} chiếc
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 p-3 bg-muted/30">
                                    <span className="font-semibold text-muted-foreground">Mã SKU hiện tại</span>
                                    <span className="col-span-2 font-mono font-medium text-foreground">
                                        {activeVariant?.sku || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="shipping" className="space-y-4">
                            <h2 className="font-heading text-lg font-bold text-foreground">
                                Chính sách bảo hành & Vận chuyển TimmyHub
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
                                <div className="rounded-2xl border border-border/60 p-4 space-y-1.5 bg-background">
                                    <p className="font-bold text-foreground">Bảo hành 12 tháng</p>
                                    <p>Áp dụng tại các trung tâm bảo hành ủy quyền toàn quốc với hóa đơn điện tử.</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 p-4 space-y-1.5 bg-background">
                                    <p className="font-bold text-foreground">Vận chuyển hỏa tốc</p>
                                    <p>Nhận hàng trong 2 giờ tại khu vực nội thành Hà Nội và TP. Hồ Chí Minh.</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 p-4 space-y-1.5 bg-background">
                                    <p className="font-bold text-foreground">Hỗ trợ 24/7</p>
                                    <p>Tổng đài miễn cước 1900 8888 luôn sẵn sàng giải đáp mọi thắc mắc của bạn.</p>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* ════════════════════════════════════════════════════════════════
                 * REVIEWS & RATINGS SECTION
                 * ════════════════════════════════════════════════════════════════ */}
                <div
                    id="product-reviews"
                    className="mt-8 rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-6 sm:p-8 shadow-sm"
                >
                    <ProductReviewsSection productId={product.id} productName={product.name} />
                </div>

                {/* ════════════════════════════════════════════════════════════════
                 * RELATED PRODUCTS SECTION
                 * ════════════════════════════════════════════════════════════════ */}
                {relatedProducts.length > 0 && (
                    <div className="mt-12 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-heading text-xl font-bold text-foreground">{t('relatedProducts')}</h2>
                            <Link
                                href={ROUTE.HOME}
                                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                                Xem thêm
                                <ChevronRightIcon className="size-3.5" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {relatedProducts.slice(0, 4).map((rp) => (
                                <Link
                                    key={rp.id}
                                    href={ROUTE.PRODUCT_DETAIL(rp.slug || rp.id)}
                                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/50"
                                >
                                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40 mb-3">
                                        <Image
                                            src={
                                                rp.images?.[0] ||
                                                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
                                            }
                                            alt={rp.name}
                                            fill
                                            sizes="(max-width: 640px) 50vw, 25vw"
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                                        {rp.categoryName || 'Sản phẩm'}
                                    </p>
                                    <h3 className="line-clamp-2 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                        {rp.name}
                                    </h3>
                                    <div className="mt-auto pt-2 flex items-baseline justify-between">
                                        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                                            {formatCurrencyVND(rp.minPrice)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Đã bán {rp.soldCount || 100}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Chi tiết Voucher áp dụng */}
            <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
                <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl">
                    <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
                        <div className="flex items-center gap-2">
                            <TicketIcon className="size-5 text-primary" />
                            <DialogTitle className="text-base font-extrabold text-foreground">
                                Voucher & Khuyến Mãi
                            </DialogTitle>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Lưu mã vào ví để được tự động áp dụng giảm giá khi thanh toán
                        </p>
                    </DialogHeader>

                    <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
                        {applicableVouchers.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">
                                Hiện chưa có mã giảm giá nào cho sản phẩm này.
                            </div>
                        ) : (
                            applicableVouchers.map((v) => {
                                const isSaved = savedVoucherIds.includes(v.id)
                                const isShipping = v.type === 'FREE_SHIPPING'
                                const isShop = Boolean(v.sellerId)

                                return (
                                    <div
                                        key={v.id}
                                        className="p-3.5 rounded-2xl border border-border/70 hover:border-primary/40 bg-card transition-all flex items-center justify-between gap-3 shadow-2xs"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div
                                                className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                    isShipping
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                        : isShop
                                                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                                          : 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                                                }`}
                                            >
                                                {isShipping ? (
                                                    <TruckIcon className="size-5" />
                                                ) : isShop ? (
                                                    <StoreIcon className="size-5" />
                                                ) : (
                                                    <TicketIcon className="size-5" />
                                                )}
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-mono font-black text-xs text-foreground uppercase tracking-wider">
                                                        {v.code}
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[9px] font-bold px-1 py-0 border-0"
                                                    >
                                                        {isShipping ? 'Freeship' : isShop ? 'Shop' : 'Sàn TimmyHub'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-bold text-foreground">
                                                    {v.description ||
                                                        (isShipping
                                                            ? `Miễn phí vận chuyển đến ${formatCurrencyVND(v.value || 30000)}`
                                                            : v.type === 'PERCENTAGE'
                                                              ? `Giảm ${v.value}%${v.maxDiscount ? ` tối đa ${formatCurrencyVND(v.maxDiscount)}` : ''}`
                                                              : `Giảm ${formatCurrencyVND(v.value)}`)}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                                    <span>Đơn tối thiểu {formatCurrencyVND(v.minOrderValue || 0)}</span>
                                                    <span>•</span>
                                                    <span>
                                                        HSD:{' '}
                                                        {v.endDate
                                                            ? new Date(v.endDate).toLocaleDateString('vi-VN')
                                                            : 'Vô thời hạn'}
                                                    </span>
                                                </div>
                                            </div>
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
                                            {isSaved ? 'Đã lưu' : 'Lưu'}
                                        </Button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Gallery Fullscreen Lightbox */}
            {isLightboxOpen && (
                <MediaLightbox
                    items={productLightboxItems}
                    initialIndex={selectedImageIndex}
                    onClose={() => setIsLightboxOpen(false)}
                />
            )}
        </div>
    )
}
