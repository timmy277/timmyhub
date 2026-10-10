'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    ArrowRightIcon,
    BadgePercentIcon,
    BookOpenIcon,
    CameraIcon,
    CheckCircle2Icon,
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClockIcon,
    EyeIcon,
    FlameIcon,
    Gamepad2Icon,
    HeadphonesIcon,
    HeartIcon,
    HomeIcon,
    LaptopIcon,
    LayoutGridIcon,
    ListIcon,
    MessageCircleIcon,
    PlayIcon,
    Share2Icon,
    ShieldCheckIcon,
    ShoppingBagIcon,
    SmartphoneIcon,
    SparklesIcon,
    StarIcon,
    StoreIcon,
    ThumbsUpIcon,
    TrophyIcon,
    TruckIcon,
    WatchIcon,
    ZapIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { IconPath } from '@/components/icons'
import { Badge, Button } from '@/components/ui'
import { ROUTE, SELLER_SHOP_ANY_PERMISSION, SELLER_SHOP_PERMISSION } from '@/constants'
import { useMyShop, usePermissions, usePublicProducts } from '@/hooks'
import { formatCurrencyVND } from '@/utils'

function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MOCK DATA: Đầy đủ các section theo timmyhub gốc
 * ───────────────────────────────────────────────────────────────────────────── */

/* 1. Hero Slides */
const HERO_SLIDES = [
    {
        id: 1,
        tag: 'Ưu đãi hôm nay',
        badgeColor: 'bg-amber-500/30 text-white border-amber-400/40',
        title: 'Siêu Sale Đón Hè\nGiảm Đến 50%',
        desc: 'Hàng ngàn sản phẩm thời trang, phụ kiện công nghệ và đồ gia dụng chính hãng với ưu đãi độc quyền.',
        action: 'Khám phá ngay',
        href: '#products-section',
        stats: { sold: '15.4K+', rating: '4.9★', label: 'Bán chạy nhất' },
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
    },
    {
        id: 2,
        tag: 'Công nghệ mới 2026',
        badgeColor: 'bg-sky-500/30 text-white border-sky-400/40',
        title: 'Tech Fest 2026\nCông Nghệ Đỉnh Cao',
        desc: 'Nâng cấp phong cách sống hiện đại với laptop AI, smartphone thế hệ mới và tai nghe chống ồn cao cấp.',
        action: 'Xem bộ sưu tập',
        href: '#products-section',
        stats: { sold: '8.9K+', rating: '5.0★', label: 'Hàng mới về' },
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80',
    },
    {
        id: 3,
        tag: 'Không gian sống',
        badgeColor: 'bg-rose-500/30 text-white border-rose-400/40',
        title: 'Nội Thất & Gia Dụng\nGiá Tốt Nhất Năm',
        desc: 'Trang hoàng tổ ấm tiện nghi với thiết bị gia dụng thông minh và nội thất hiện đại bảo hành 2 năm.',
        action: 'Mua sắm ngay',
        href: '#products-section',
        stats: { sold: '12.1K+', rating: '4.8★', label: 'Deal hot tuần' },
        image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80',
    },
]

/* 2. Features / Cam kết sàn */
const FEATURES = [
    {
        icon: TruckIcon,
        title: 'Giao hàng miễn phí',
        desc: 'Freeship đơn từ 500k toàn quốc',
    },
    {
        icon: ShieldCheckIcon,
        title: '100% Chính hãng',
        desc: 'Bảo hành 1 đổi 1 trong 7 ngày',
    },
    {
        icon: HeadphonesIcon,
        title: 'Hỗ trợ 24/7',
        desc: 'Tư vấn tận tâm mọi lúc mọi nơi',
    },
    {
        icon: ZapIcon,
        title: 'Giao hàng siêu tốc',
        desc: 'Nhận hàng 2 - 4h tại nội thành',
    },
]

/* 3. Danh mục sản phẩm (10 categories) */
const CATEGORIES = [
    { name: 'Laptop & PC', icon: LaptopIcon, count: '1.2k+ SP', color: 'text-blue-500 bg-blue-500/10' },
    { name: 'Điện thoại', icon: SmartphoneIcon, count: '3.4k+ SP', color: 'text-emerald-500 bg-emerald-500/10' },
    { name: 'Âm thanh', icon: HeadphonesIcon, count: '890 SP', color: 'text-rose-500 bg-rose-500/10' },
    { name: 'Đồng hồ', icon: WatchIcon, count: '650 SP', color: 'text-amber-500 bg-amber-500/10' },
    { name: 'Camera', icon: CameraIcon, count: '430 SP', color: 'text-purple-500 bg-purple-500/10' },
    { name: 'Gaming', icon: Gamepad2Icon, count: '920 SP', color: 'text-indigo-500 bg-indigo-500/10' },
    { name: 'Nhà cửa', icon: HomeIcon, count: '2.1k+ SP', color: 'text-teal-500 bg-teal-500/10' },
    { name: 'Làm đẹp', icon: SparklesIcon, count: '1.8k+ SP', color: 'text-pink-500 bg-pink-500/10' },
    { name: 'Sách & VPP', icon: BookOpenIcon, count: '760 SP', color: 'text-orange-500 bg-orange-500/10' },
    { name: 'Thể thao', icon: TrophyIcon, count: '1.1k+ SP', color: 'text-emerald-600 bg-emerald-600/10' },
]

/* 4. Voucher ưu đãi */
const INITIAL_VOUCHERS = [
    {
        id: 'v-01',
        title: 'Giảm 15% Đơn Đầu',
        type: 'PERCENT',
        value: '15%',
        minSpend: '200.000 ₫',
        maxDiscount: '50.000 ₫',
        expiry: 'Còn 3 ngày',
        code: 'TIMMYNEW15',
        badge: 'Người dùng mới',
    },
    {
        id: 'v-02',
        title: 'Miễn Phí Vận Chuyển',
        type: 'SHIPPING',
        value: 'FREE',
        minSpend: '150.000 ₫',
        maxDiscount: '35.000 ₫',
        expiry: 'Hết hạn hôm nay',
        code: 'FREESHIPMAX',
        badge: 'Toàn sàn',
    },
    {
        id: 'v-03',
        title: 'Giảm 100.000 ₫ Công Nghệ',
        type: 'FIXED',
        value: '100K ₫',
        minSpend: '1.500.000 ₫',
        maxDiscount: '100.000 ₫',
        expiry: 'Còn 5 ngày',
        code: 'TECHMEGA100',
        badge: 'Thiết bị số',
    },
    {
        id: 'v-04',
        title: 'Giảm 20% Thời Trang',
        type: 'PERCENT',
        value: '20%',
        minSpend: '400.000 ₫',
        maxDiscount: '80.000 ₫',
        expiry: 'Còn 2 ngày',
        code: 'FASHION20',
        badge: 'Thời trang hè',
    },
    {
        id: 'v-05',
        title: 'Hoàn Xu 10% Tối Đa 50K',
        type: 'CASHBACK',
        value: '10%',
        minSpend: '300.000 ₫',
        maxDiscount: '50.000 ₫',
        expiry: 'Còn 7 ngày',
        code: 'TIMMYCOIN10',
        badge: 'Hoàn xu',
    },
    {
        id: 'v-06',
        title: 'Giảm 50.000 ₫ Gia Dụng',
        type: 'FIXED',
        value: '50K ₫',
        minSpend: '500.000 ₫',
        maxDiscount: '50.000 ₫',
        expiry: 'Còn 4 ngày',
        code: 'HOMESTYLE50',
        badge: 'Nhà cửa',
    },
]

/* 5. Flash Sale Deals */
const FLASH_SALE_PRODUCTS = [
    {
        id: 'fs-1',
        title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
        category: 'Điện thoại',
        shop: 'Apple Authorized Store',
        verified: true,
        price: '28.990.000',
        originalPrice: '34.990.000',
        discount: 17,
        sold: 84,
        totalStock: 100,
        rating: 4.9,
        reviews: 2430,
        emoji: '📱',
    },
    {
        id: 'fs-2',
        title: 'Tai nghe Sony WH-1000XM5 Chống Ồn Cao Cấp',
        category: 'Âm thanh',
        shop: 'Sony Official Store',
        verified: true,
        price: '6.490.000',
        originalPrice: '8.990.000',
        discount: 28,
        sold: 142,
        totalStock: 150,
        rating: 4.9,
        reviews: 912,
        emoji: '🎧',
    },
    {
        id: 'fs-3',
        title: 'Đồng Hồ Apple Watch Series 9 GPS 45mm',
        category: 'Đồng hồ',
        shop: 'Apple Flagship Store',
        verified: true,
        price: '8.290.000',
        originalPrice: '11.590.000',
        discount: 28,
        sold: 96,
        totalStock: 120,
        rating: 4.8,
        reviews: 754,
        emoji: '⌚',
    },
    {
        id: 'fs-4',
        title: 'Bàn phím cơ không dây Keychron Q1 Pro RGB',
        category: 'Gaming',
        shop: 'Keychron Official VN',
        verified: true,
        price: '3.650.000',
        originalPrice: '4.890.000',
        discount: 25,
        sold: 180,
        totalStock: 200,
        rating: 4.9,
        reviews: 432,
        emoji: '⌨️',
    },
]

/* 6. Post & Video Community Feed */
const COMMUNITY_POSTS = [
    {
        id: 'post-1',
        creator: 'Hoàng Minh Tech',
        avatar: 'HM',
        role: 'KOL Đánh giá',
        title: 'Trên tay iPhone 15 Pro Max sau 6 tháng sử dụng thực tế',
        desc: 'Pin có còn trâu? Khung titan liệu có xước? Đánh giá chi tiết cho anh em đang phân vân!',
        videoDuration: '04:15',
        views: '48.2K',
        likes: 3820,
        comments: 428,
        taggedProduct: 'iPhone 15 Pro Max 256GB',
        productPrice: '28.990.000 ₫',
        accent: 'from-emerald-500/20 to-teal-500/10',
    },
    {
        id: 'post-2',
        creator: 'Linh Trang Lifestyle',
        avatar: 'LT',
        role: 'Sáng tạo nội dung',
        title: 'Decor góc làm việc tối giản công nghệ chỉ với 5 món đồ',
        desc: 'Chia sẻ set đồ setup bàn làm việc vừa thẩm mỹ vừa tăng năng suất làm việc tại nhà.',
        videoDuration: '02:40',
        views: '32.1K',
        likes: 2410,
        comments: 186,
        taggedProduct: 'Bàn nâng hạ thông minh TimmyDesk',
        productPrice: '4.250.000 ₫',
        accent: 'from-purple-500/20 to-pink-500/10',
    },
    {
        id: 'post-3',
        creator: 'Đức Anh Audio',
        avatar: 'DA',
        role: 'Chuyên gia âm thanh',
        title: 'So sánh chất âm Sony WH-1000XM5 vs AirPods Max 2026',
        desc: 'Bài test âm trầm, độ trong trẻo và khả năng chống ồn chủ động trên chuyến bay dài.',
        videoDuration: '06:10',
        views: '61.5K',
        likes: 5120,
        comments: 630,
        taggedProduct: 'Tai nghe Sony WH-1000XM5',
        productPrice: '6.490.000 ₫',
        accent: 'from-blue-500/20 to-indigo-500/10',
    },
]

/* 7. Today Suggestion Products */
const ALL_PRODUCTS = [
    {
        id: 'p-1',
        name: 'MacBook Air 13 inch M3 (8GB RAM / 256GB SSD)',
        category: 'Laptop & PC',
        shop: 'Apple Authorized Store',
        verified: true,
        price: '27.490.000',
        originalPrice: '31.990.000',
        discount: 14,
        sold: 840,
        rating: 4.9,
        reviews: 312,
        isNew: true,
        isBest: true,
        emoji: '💻',
    },
    {
        id: 'p-2',
        name: 'Máy lọc không khí Xiaomi Smart Air Purifier 4 Pro',
        category: 'Nhà cửa',
        shop: 'Xiaomi Official Global',
        verified: true,
        price: '3.990.000',
        originalPrice: '5.490.000',
        discount: 27,
        sold: 1420,
        rating: 4.8,
        reviews: 580,
        isNew: false,
        isBest: true,
        emoji: '💨',
    },
    {
        id: 'p-3',
        name: 'Giày Chạy Bộ Nike Air Zoom Pegasus 40 Nam',
        category: 'Thể thao',
        shop: 'Nike Flagship Store',
        verified: true,
        price: '2.890.000',
        originalPrice: '3.690.000',
        discount: 22,
        sold: 2150,
        rating: 4.9,
        reviews: 940,
        isNew: true,
        isBest: false,
        emoji: '👟',
    },
    {
        id: 'p-4',
        name: 'Máy sấy tóc Dyson Supersonic Nural Bản Giới Hạn',
        category: 'Làm đẹp',
        shop: 'Dyson Beauty Store',
        verified: true,
        price: '12.490.000',
        originalPrice: '14.990.000',
        discount: 17,
        sold: 430,
        rating: 5.0,
        reviews: 198,
        isNew: true,
        isBest: false,
        emoji: '✨',
    },
    {
        id: 'p-5',
        name: 'Máy chơi game Sony PlayStation 5 Slim Standard',
        category: 'Gaming',
        shop: 'PlayStation VN Official',
        verified: true,
        price: '12.990.000',
        originalPrice: '14.500.000',
        discount: 10,
        sold: 960,
        rating: 4.9,
        reviews: 410,
        isNew: false,
        isBest: true,
        emoji: '🎮',
    },
    {
        id: 'p-6',
        name: 'Nồi chiên không dầu điện tử Philips HD9280/90 6.2L',
        category: 'Nhà cửa',
        shop: 'Philips Home Mall',
        verified: true,
        price: '2.490.000',
        originalPrice: '3.890.000',
        discount: 36,
        sold: 3100,
        rating: 4.8,
        reviews: 1220,
        isNew: false,
        isBest: true,
        emoji: '🍳',
    },
    {
        id: 'p-7',
        name: 'Đồng hồ thông minh Garmin Forerunner 265 GPS',
        category: 'Đồng hồ',
        shop: 'Garmin Sport VN',
        verified: true,
        price: '11.290.000',
        originalPrice: '12.990.000',
        discount: 13,
        sold: 390,
        rating: 4.9,
        reviews: 145,
        isNew: true,
        isBest: false,
        emoji: '⌚',
    },
    {
        id: 'p-8',
        name: 'Bộ sách Tư Duy Nhanh Và Chậm (Tái Bản Đặc Biệt)',
        category: 'Sách & VPP',
        shop: 'Nhã Nam Book Store',
        verified: true,
        price: '215.000',
        originalPrice: '280.000',
        discount: 23,
        sold: 4200,
        rating: 4.9,
        reviews: 2840,
        isNew: false,
        isBest: true,
        emoji: '📚',
    },
]

/* ─────────────────────────────────────────────────────────────────────────────
 * SUBCOMPONENTS
 * ───────────────────────────────────────────────────────────────────────────── */

/* Timer block cho Flash sale */
const TimerBlock = memo(function TimerBlock({ val, label }: { val: string; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <span className="flex h-9 w-10 items-center justify-center rounded-lg bg-foreground font-mono text-base font-extrabold text-background shadow-sm tabular-nums">
                {val}
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </span>
        </div>
    )
})

interface HomeProductItem {
    id: string
    name: string
    slug: string
    category: string
    shop: string
    verified: boolean
    price: string
    originalPrice?: string | null
    discount: number
    sold: number
    rating: number
    reviews: number
    image?: string
    emoji?: string
    isNew?: boolean
    isBest?: boolean
}

interface Product3DCardProps {
    product: HomeProductItem
    isLiked: boolean
    onToggleWishlist: (id: string, name: string) => void
}

/* Product Card with Interactive 3D Tilt, Dynamic Glare, and Depth Stacking */
const Product3DCard = memo(function Product3DCard({ product: p, isLiked, onToggleWishlist }: Product3DCardProps) {
    const [tilt, setTilt] = useState({ x: 0, y: 0 })
    const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 })
    const cardRef = useRef<HTMLDivElement>(null)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = Number((((y - centerY) / centerY) * -8).toFixed(2))
        const rotateY = Number((((x - centerX) / centerX) * 8).toFixed(2))
        setTilt({ x: rotateX, y: rotateY })
        setGlare({
            x: Math.round((x / rect.width) * 100),
            y: Math.round((y / rect.height) * 100),
            opacity: 0.18,
        })
    }

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 })
        setGlare((prev) => ({ ...prev, opacity: 0 }))
    }

    const isHovered = tilt.x !== 0 || tilt.y !== 0

    return (
        <div className="[perspective:1000px] h-full">
            <Link
                href={ROUTE.PRODUCT_DETAIL(p.slug || p.id)}
                className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
            >
                <article
                    ref={cardRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        transform: isHovered
                            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px) scale3d(1.02, 1.02, 1.02)`
                            : 'rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)',
                        transition: isHovered
                            ? 'transform 0.1s ease-out'
                            : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm hover:shadow-xl hover:shadow-primary/15 hover:border-primary/50 [transform-style:preserve-3d] select-none"
                >
                    {/* 3D Glare Light Sweep Layer */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 z-20 rounded-2xl transition-opacity duration-300"
                        style={{
                            background: `radial-gradient(circle 240px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, ${glare.opacity}), transparent)`,
                        }}
                    />

                    {/* Product Image & Badges with 3D Popout */}
                    <div className="relative flex h-44 items-center justify-center rounded-xl bg-muted/40 overflow-hidden transition-all duration-300 group-hover:bg-primary/5 [transform:translateZ(20px)]">
                        {p.image ? (
                            <Image
                                src={p.image}
                                alt={p.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                            />
                        ) : (
                            <span className="text-6xl transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-3 select-none drop-shadow-sm">
                                {p.emoji || '🎁'}
                            </span>
                        )}
                        {p.discount > 0 && (
                            <span className="absolute top-2 left-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg] z-20">
                                -{p.discount}%
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onToggleWishlist(p.id, p.name)
                            }}
                            aria-label="Thêm vào yêu thích"
                            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-125 active:scale-90 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40 z-30"
                        >
                            <HeartIcon
                                className={`size-3.5 transition-colors duration-200 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`}
                            />
                        </button>
                    </div>

                    {/* Product Details with 3D Depth */}
                    <div className="mt-3 flex flex-1 flex-col gap-1.5 [transform:translateZ(14px)]">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">{p.category}</span>
                        <h3 className="line-clamp-2 text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                            {p.name}
                        </h3>

                        <div className="mt-auto pt-2 space-y-2">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-105 origin-left inline-block">
                                    {formatCurrencyVND(p.price)}
                                </span>
                                {p.originalPrice && (
                                    <span className="text-[10px] text-muted-foreground line-through">
                                        {formatCurrencyVND(p.originalPrice)}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                    <StarIcon className="size-3 fill-amber-400 text-amber-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                                    <span className="font-semibold text-foreground/90">{p.rating}</span>
                                    <span>({p.reviews})</span>
                                </span>
                                <span suppressHydrationWarning>Đã bán {formatNumber(p.sold)}</span>
                            </div>

                            {/* Seller Footer */}
                            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-1.5 text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                                        <StoreIcon className="size-3" />
                                    </div>
                                    <span className="truncate text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {p.shop}
                                    </span>
                                    {p.verified && (
                                        <CheckCircle2Icon className="size-3.5 text-primary shrink-0 transition-transform duration-300 group-hover:scale-125" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            </Link>
        </div>
    )
})

/* ─────────────────────────────────────────────────────────────────────────────
 * MAIN HOMEPAGE COMPONENT
 * ───────────────────────────────────────────────────────────────────────────── */
export function HomePage() {
    const tNav = useTranslations('nav')
    const { hasPermission } = usePermissions()
    const isSellerByPermission = hasPermission(SELLER_SHOP_PERMISSION) || hasPermission(SELLER_SHOP_ANY_PERMISSION)
    const { data: myShop } = useMyShop({ enabled: !isSellerByPermission })
    const isSeller = isSellerByPermission || Boolean(myShop)
    const sellerRoute = isSeller ? ROUTE.SELLER_PORTAL : ROUTE.SELLER_REGISTER
    const sellerLabel = isSeller ? tNav('sellerPortal') : tNav('becomeSeller')

    // 1. Hero Carousel State
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    useEffect(() => {
        if (isPaused) return
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [isPaused])

    // 2. Flash Sale Countdown State
    const [timeLeft, setTimeLeft] = useState({ h: '05', m: '42', s: '18' })
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                let h = parseInt(prev.h, 10)
                let m = parseInt(prev.m, 10)
                let s = parseInt(prev.s, 10)

                if (--s < 0) {
                    s = 59
                    if (--m < 0) {
                        m = 59
                        if (--h < 0) {
                            h = 12
                        }
                    }
                }
                return {
                    h: String(h).padStart(2, '0'),
                    m: String(m).padStart(2, '0'),
                    s: String(s).padStart(2, '0'),
                }
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    // 3. Saved Vouchers State
    const [savedVouchers, setSavedVouchers] = useState<Set<string>>(new Set(['v-01']))

    const handleSaveVoucher = useCallback((voucherId: string, code: string) => {
        setSavedVouchers((prev) => {
            const next = new Set(prev)
            if (next.has(voucherId)) {
                next.delete(voucherId)
                toast.info(`Đã gỡ mã ${code}`)
            } else {
                next.add(voucherId)
                toast.success(`Đã lưu mã ${code} vào ví voucher của bạn!`, {
                    description: 'Áp dụng tự động tại bước thanh toán.',
                })
            }
            return next
        })
    }, [])

    // 4. Products Tab & View Mode
    const [productTab, setProductTab] = useState<'all' | 'new' | 'best'>('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [wishlist, setWishlist] = useState<Set<string>>(new Set())

    const handleToggleWishlist = useCallback((productId: string, name: string) => {
        setWishlist((prev) => {
            const next = new Set(prev)
            if (next.has(productId)) {
                next.delete(productId)
                toast.info(`Đã xoá khỏi danh sách yêu thích`, { description: name })
            } else {
                next.add(productId)
                toast.success(`Đã thêm vào danh sách yêu thích`, { description: name })
            }
            return next
        })
    }, [])

    // Lấy danh sách sản phẩm thật đã được duyệt từ backend
    const { data: publicProductsData } = usePublicProducts({ pageSize: 30 })

    const approvedRandomProducts = useMemo<HomeProductItem[]>(() => {
        const rawItems = publicProductsData?.items || []
        if (rawItems.length === 0) {
            return ALL_PRODUCTS.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.id,
                category: p.category,
                shop: p.shop,
                verified: p.verified,
                price: p.price,
                originalPrice: p.originalPrice,
                discount: p.discount,
                sold: p.sold,
                rating: p.rating,
                reviews: p.reviews,
                emoji: p.emoji,
                isNew: p.isNew,
                isBest: p.isBest,
            }))
        }

        // Lấy 10 sản phẩm ngẫu nhiên ổn định (deterministic hash để tránh hydration mismatch và giữ React purity)
        const sorted = [...rawItems].sort((a, b) => {
            const hashA = (a.id || '').split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
            const hashB = (b.id || '').split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
            return hashA - hashB
        })
        const tenItems = sorted.slice(0, 10)

        return tenItems.map((p, idx) => {
            const currPrice = p.minPrice ? Number(p.minPrice) : 299000
            const maxP = p.maxPrice ? Number(p.maxPrice) : currPrice * 1.25
            const discount = maxP > currPrice ? Math.round(((maxP - currPrice) / maxP) * 100) : 0

            return {
                id: p.id,
                name: p.name,
                slug: p.slug || p.id,
                category: p.categoryName || 'Sản phẩm',
                shop: p.shopName || 'TimmyHub Mall',
                verified: true,
                price: new Intl.NumberFormat('vi-VN').format(currPrice),
                originalPrice: maxP > currPrice ? new Intl.NumberFormat('vi-VN').format(maxP) : null,
                discount,
                sold: p.soldCount || 120 + idx * 35,
                rating: p.ratingAvg ? Number(p.ratingAvg.toFixed(1)) : 4.9,
                reviews: p.ratingCount || 56 + idx * 11,
                image: p.images?.[0],
                emoji: '🛍️',
                isNew: idx % 2 === 0,
                isBest: idx % 2 === 1,
            }
        })
    }, [publicProductsData?.items])

    const filteredProducts = useMemo(() => {
        if (productTab === 'new') return approvedRandomProducts.filter((p) => p.isNew)
        if (productTab === 'best') return approvedRandomProducts.filter((p) => p.isBest)
        return approvedRandomProducts
    }, [approvedRandomProducts, productTab])

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <div className="relative mx-auto max-w-7xl space-y-12 px-4 py-6 pb-20 sm:px-6">
                {/* ═══════════════════════════════════════════════════════════════════
                 * 1. HERO CAROUSEL BANNER (Có 3D Perspective + Indicator & Controls)
                 * ═══════════════════════════════════════════════════════════════════ */}
                <section
                    aria-label="Khuyến mãi nổi bật"
                    className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-lg"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div className="relative min-h-[460px] sm:min-h-[500px] w-full overflow-hidden">
                        {HERO_SLIDES.map((slide, index) => {
                            const isActive = index === currentSlide
                            return (
                                <div
                                    key={slide.id}
                                    className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-12 transition-all duration-700 ease-out ${
                                        isActive
                                            ? 'opacity-100 translate-x-0 z-10'
                                            : 'opacity-0 translate-x-8 pointer-events-none z-0'
                                    }`}
                                >
                                    {/* High-quality Next.js Image Banner Background with dark overlays */}
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                        <Image
                                            src={slide.image}
                                            alt={slide.title.replace('\n', ' ')}
                                            fill
                                            priority={index === 0}
                                            sizes="(max-width: 1280px) 100vw, 1280px"
                                            className="object-cover scale-105 transition-transform duration-1000 ease-out"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/45" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35" />
                                    </div>

                                    {/* Background Decorative Elements */}
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl"
                                    />
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute bottom-0 right-1/4 size-64 rounded-full bg-primary/10 blur-2xl"
                                    />

                                    {/* Slide Top Info */}
                                    <div className="relative z-10 flex items-center justify-between">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md ${slide.badgeColor}`}
                                        >
                                            <IconPath name="gemini-star" className="size-3 text-white animate-pulse" />
                                            {slide.tag}
                                        </span>
                                        <div className="hidden sm:flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md border border-white/10">
                                            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                                            {slide.stats.label}: {slide.stats.sold} đơn
                                        </div>
                                    </div>

                                    {/* Slide Body & 3D Interactive Card Preview */}
                                    <div className="relative z-10 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
                                        <div className="lg:col-span-7 space-y-4 max-w-xl text-white">
                                            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] whitespace-pre-line drop-shadow-sm">
                                                {slide.title}
                                            </h1>
                                            <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-lg">
                                                {slide.desc}
                                            </p>
                                            <div className="pt-2 flex flex-wrap items-center gap-3">
                                                <a href={slide.href}>
                                                    <Button
                                                        size="lg"
                                                        className="rounded-xl font-semibold gap-2 shadow-lg hover:shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90"
                                                    >
                                                        <ShoppingBagIcon className="size-4 text-primary-foreground" />
                                                        {slide.action}
                                                        <ArrowRightIcon className="size-4 text-primary-foreground" />
                                                    </Button>
                                                </a>
                                                <Link href={ROUTE.SELLER_PORTAL}>
                                                    <Button
                                                        size="lg"
                                                        variant="outline"
                                                        className="rounded-xl font-semibold gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
                                                    >
                                                        <StoreIcon className="size-4 text-white" />
                                                        Kênh người bán
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* 3D Isometric Floating Showcase Card */}
                                        <div className="hidden lg:flex lg:col-span-5 justify-center [perspective:1000px]">
                                            <div className="w-80 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md shadow-2xl text-white transition-all duration-500 ease-out hover:scale-105 [transform:rotateY(-8deg)_rotateX(6deg)] hover:[transform:rotateY(0deg)_rotateX(0deg)] motion-reduce:transform-none select-none">
                                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                                                            T
                                                        </span>
                                                        <span className="font-bold text-xs tracking-wider uppercase text-white">
                                                            TimmyHub Choice
                                                        </span>
                                                    </div>
                                                    <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold gap-1">
                                                        <IconPath
                                                            name="gemini-star"
                                                            className="size-2.5 text-primary-foreground"
                                                        />
                                                        Ưu đãi 2026
                                                    </Badge>
                                                </div>
                                                <div className="my-6 text-center space-y-2">
                                                    <div className="text-6xl drop-shadow-md">🎁</div>
                                                    <p className="text-base font-bold text-white">
                                                        Deal Độc Quyền Hôm Nay
                                                    </p>
                                                    <p className="text-xs text-white/70">
                                                        Cam kết 100% chính hãng · Miễn phí đổi trả 7 ngày
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between rounded-xl bg-black/30 p-2.5 text-xs text-white/90 border border-white/10">
                                                    <span>Đánh giá từ khách</span>
                                                    <span className="flex items-center gap-1 font-bold text-amber-400">
                                                        <StarIcon className="size-3.5 fill-amber-400" />
                                                        {slide.stats.rating}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Slide Bottom Controls & Dots */}
                                    <div className="relative z-10 flex items-center justify-between pt-4">
                                        <div className="flex items-center gap-1">
                                            {HERO_SLIDES.map((_, dotIndex) => (
                                                <button
                                                    key={dotIndex}
                                                    onClick={() => setCurrentSlide(dotIndex)}
                                                    aria-label={`Chuyển tới slide ${dotIndex + 1}`}
                                                    className="group flex min-h-6 min-w-6 items-center justify-center p-1 focus:outline-none"
                                                >
                                                    <span
                                                        className={`h-2 rounded-full transition-all duration-300 ${
                                                            dotIndex === currentSlide
                                                                ? 'w-8 bg-primary'
                                                                : 'w-2 bg-white/40 group-hover:bg-white/70'
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() =>
                                                    setCurrentSlide(
                                                        (prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length,
                                                    )
                                                }
                                                aria-label="Slide trước"
                                                className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors backdrop-blur-md border border-white/10"
                                            >
                                                <ChevronLeftIcon className="size-4" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
                                                }
                                                aria-label="Slide tiếp theo"
                                                className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors backdrop-blur-md border border-white/10"
                                            >
                                                <ChevronRightIcon className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════════
                 * 2. FEATURE SECTION: CAM KẾT DỊCH VỤ SÀN (4 CAM KẾT)
                 * ═══════════════════════════════════════════════════════════════════ */}
                <section aria-label="Cam kết dịch vụ" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {FEATURES.map((f) => (
                        <div
                            key={f.title}
                            className="group flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/40"
                        >
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <f.icon className="size-6 transition-transform group-hover:scale-110" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-foreground leading-tight">{f.title}</h2>
                                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </section>

                {/* ═══════════════════════════════════════════════════════════════════
                 * 3. CATEGORY SECTION: DANH MỤC NGÀNH HÀNG NỔI BẬT
                 * ═══════════════════════════════════════════════════════════════════ */}
                <section aria-labelledby="categories-heading" className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <LayoutGridIcon className="size-4" />
                            </div>
                            <h2
                                id="categories-heading"
                                className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2"
                            >
                                <span>Danh mục sản phẩm</span>
                                <IconPath name="gemini-star" className="size-4 text-primary/70 animate-pulse" />
                            </h2>
                        </div>
                        <button
                            onClick={() => toast.info('Xem tất cả danh mục hàng hoá')}
                            className="group flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                            Xem tất cả
                            <ChevronRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.name}
                                onClick={() => setProductTab('all')}
                                className="group flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 text-center transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md active:scale-95"
                            >
                                <div
                                    className={`flex size-12 items-center justify-center rounded-xl ${cat.color} transition-transform group-hover:scale-110`}
                                >
                                    <cat.icon className="size-6" aria-hidden />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                                        {cat.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{cat.count}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════════
                 * 4. VOUCHER SECTION: MÃ GIẢM GIÁ CHO BẠN (VOUCHER TICKET CARDS)
                 * ═══════════════════════════════════════════════════════════════════ */}
                <section aria-labelledby="vouchers-heading" className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <BadgePercentIcon className="size-4" />
                            </div>
                            <div>
                                <h2
                                    id="vouchers-heading"
                                    className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2"
                                >
                                    <span>Mã giảm giá cho bạn</span>
                                    <IconPath name="gemini-star" className="size-4 text-amber-400 animate-pulse" />
                                </h2>
                            </div>
                            <Badge className="ml-2 hidden sm:inline-flex text-[10px] bg-primary text-primary-foreground border-transparent">
                                Tiết kiệm tối đa
                            </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">Được tài trợ bởi TimmyHub</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {INITIAL_VOUCHERS.map((v) => {
                            const isSaved = savedVouchers.has(v.id)
                            return (
                                <div
                                    key={v.id}
                                    className={`relative flex items-center justify-between overflow-hidden rounded-2xl border-2 border-dashed p-4 transition-all duration-200 hover:shadow-md ${
                                        isSaved
                                            ? 'border-primary/50 bg-primary/5'
                                            : 'border-border/80 bg-card hover:border-primary/40'
                                    }`}
                                >
                                    {/* Left Ticket Content */}
                                    <div className="space-y-1.5 min-w-0 pr-3">
                                        <div className="flex items-center gap-1.5">
                                            <Badge className="text-[10px] px-2 py-0.5 bg-primary text-primary-foreground border-transparent font-medium">
                                                {v.badge}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5">
                                                <ClockIcon className="size-2.5" />
                                                {v.expiry}
                                            </span>
                                        </div>
                                        <p className="text-base font-extrabold text-foreground truncate">{v.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Đơn tối thiểu{' '}
                                            <span className="font-semibold text-foreground">{v.minSpend}</span>
                                        </p>
                                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground pt-0.5">
                                            <span>Mã:</span>
                                            <span className="rounded bg-muted px-1.5 py-0.5 font-bold text-foreground">
                                                {v.code}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Ticket Action */}
                                    <div className="shrink-0 flex flex-col items-end gap-2 border-l border-dashed border-border pl-4">
                                        <span className="font-extrabold text-lg text-emerald-700 dark:text-emerald-400">
                                            {v.value}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant={isSaved ? 'outline' : 'default'}
                                            onClick={() => handleSaveVoucher(v.id, v.code)}
                                            className={`h-8 rounded-lg text-xs font-semibold px-3 ${
                                                isSaved
                                                    ? 'border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40'
                                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            }`}
                                        >
                                            {isSaved ? (
                                                <>
                                                    <CheckIcon className="size-3.5 mr-1 text-emerald-700 dark:text-emerald-400" />
                                                    Đã lưu
                                                </>
                                            ) : (
                                                'Lưu mã'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════════
                 * 5. FLASH SALE SECTION: ĐẾM NGƯỢC THỜI GIAN THỰC & SẢN PHẨM DEAL SỐC
                 * ═══════════════════════════════════════════════════════════════════ */}
                <section
                    aria-label="Flash Sale chớp nhoáng"
                    className="overflow-hidden rounded-3xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-card to-card p-5 sm:p-7 shadow-sm space-y-6"
                >
                    {/* Flash Sale Header with Live Clock */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 rounded-xl bg-destructive px-3.5 py-1.5 text-white shadow-sm">
                                <FlameIcon className="size-4 animate-bounce text-white" />
                                <span className="text-sm font-black tracking-wider uppercase text-white">
                                    FLASH SALE
                                </span>
                                <IconPath name="gemini-star" className="size-3.5 text-amber-300 animate-pulse" />
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <span>Kết thúc sau:</span>
                                <div className="flex items-center gap-1.5">
                                    <TimerBlock val={timeLeft.h} label="Giờ" />
                                    <span className="font-bold text-foreground">:</span>
                                    <TimerBlock val={timeLeft.m} label="Phút" />
                                    <span className="font-bold text-foreground">:</span>
                                    <TimerBlock val={timeLeft.s} label="Giây" />
                                </div>
                            </div>
                        </div>

                        <a
                            href="#products-section"
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                            Xem tất cả deal sốc
                            <ChevronRightIcon className="size-3.5" />
                        </a>
                    </div>

                    {/* Flash Sale Deals Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {FLASH_SALE_PRODUCTS.map((item) => {
                            const progressPercent = Math.round((item.sold / item.totalStock) * 100)
                            return (
                                <div
                                    key={item.id}
                                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-4 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-destructive/15 hover:border-destructive/50"
                                >
                                    {/* Discount Badge */}
                                    <div className="absolute top-3 left-3 z-10 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]">
                                        -{item.discount}%
                                    </div>

                                    {/* Emoji & Visual */}
                                    <div className="relative flex h-36 items-center justify-center rounded-xl bg-muted/40 transition-all duration-500 group-hover:bg-destructive/5 overflow-hidden">
                                        <span className="text-6xl drop-shadow-sm select-none transition-transform duration-500 ease-out group-hover:scale-115 group-hover:-rotate-3">
                                            {item.emoji}
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div className="mt-3 flex flex-1 flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                            {item.category}
                                        </span>
                                        <p className="line-clamp-2 text-xs font-bold text-foreground leading-snug group-hover:text-destructive transition-colors">
                                            {item.title}
                                        </p>

                                        <div className="mt-auto pt-2 space-y-2">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-base font-extrabold text-destructive transition-transform duration-300 group-hover:scale-105 origin-left inline-block">
                                                    {formatCurrencyVND(item.price)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground line-through">
                                                    {formatCurrencyVND(item.originalPrice)}
                                                </span>
                                            </div>

                                            {/* Sold Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-destructive/15">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-destructive transition-all duration-500 group-hover:brightness-110"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                                                    <span className="text-destructive font-bold">
                                                        Đã bán {item.sold}
                                                    </span>
                                                    <span>Còn {item.totalStock - item.sold}</span>
                                                </div>
                                            </div>

                                            {/* Seller Footer */}
                                            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-1.5 text-xs">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive transition-transform duration-300 group-hover:scale-110 group-hover:bg-destructive group-hover:text-white">
                                                        <StoreIcon className="size-3" />
                                                    </div>
                                                    <span className="truncate text-[11px] font-semibold text-foreground group-hover:text-destructive transition-colors">
                                                        {item.shop}
                                                    </span>
                                                    {item.verified && (
                                                        <CheckCircle2Icon className="size-3 text-primary shrink-0 transition-transform duration-300 group-hover:scale-125" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════════
                 * 6. POST FEED SECTION: VIDEO & BÀI VIẾT CỘNG ĐỒNG SÁNG TẠO
                 * ═══════════════════════════════════════════════════════════════════ */}
                <section aria-labelledby="posts-heading" className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <PlayIcon className="size-4 fill-primary" />
                            </div>
                            <div>
                                <h2
                                    id="posts-heading"
                                    className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2"
                                >
                                    <span>Video & Bài viết cộng đồng</span>
                                    <IconPath name="gemini-star" className="size-4 text-primary animate-pulse" />
                                </h2>
                            </div>
                        </div>
                        <button
                            onClick={() => toast.info('Xem thêm video cộng đồng')}
                            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                            Xem tất cả
                            <ChevronRightIcon className="size-3.5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {COMMUNITY_POSTS.map((post) => (
                            <article
                                key={post.id}
                                className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40"
                            >
                                {/* Video Simulated Thumbnail */}
                                <div
                                    className={`relative h-44 w-full bg-gradient-to-br ${post.accent} flex items-center justify-center overflow-hidden border-b border-border/50`}
                                >
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                    <div className="relative flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 group-hover:scale-110">
                                        <PlayIcon className="size-5 fill-current ml-0.5 text-primary-foreground" />
                                    </div>
                                    <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                        {post.videoDuration}
                                    </span>
                                    <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90">
                                        <EyeIcon className="size-3" />
                                        {post.views} lượt xem
                                    </span>
                                </div>

                                {/* Post Meta */}
                                <div className="flex flex-1 flex-col p-4 space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-emerald-800 dark:text-emerald-300 font-bold text-xs ring-1 ring-primary/30">
                                            {post.avatar}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1">
                                                <p className="font-bold text-xs text-foreground truncate">
                                                    {post.creator}
                                                </p>
                                                <CheckCircle2Icon className="size-3 text-primary shrink-0" />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{post.role}</p>
                                        </div>
                                    </div>

                                    <h3 className="line-clamp-2 text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                        {post.desc}
                                    </p>

                                    {/* Tagged Product Link */}
                                    <div className="mt-auto rounded-xl bg-muted/50 p-2.5 border border-border/60 flex items-center gap-2.5 text-xs">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-emerald-800 dark:text-emerald-300">
                                            <ShoppingBagIcon className="size-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-foreground text-[11px]">
                                                {post.taggedProduct}
                                            </p>
                                            <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-xs">
                                                {post.productPrice}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Engagement Counters */}
                                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                                        <span
                                            suppressHydrationWarning
                                            className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <ThumbsUpIcon className="size-3.5" />
                                            {formatNumber(post.likes)}
                                        </span>
                                        <span className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                                            <MessageCircleIcon className="size-3.5" />
                                            {post.comments}
                                        </span>
                                        <span className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                                            <Share2Icon className="size-3.5" />
                                            Chia sẻ
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════════
                 * 7. PRODUCTS SECTION: GỢI Ý HÔM NAY (TODAY SUGGESTION TABS + GRID)
                 * ═══════════════════════════════════════════════════════════════════ */}
                <section id="products-section" aria-labelledby="today-heading" className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <SparklesIcon className="size-4" />
                            </div>
                            <h2
                                id="today-heading"
                                className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2"
                            >
                                <span>Gợi ý hôm nay</span>
                                <IconPath name="gemini-star" className="size-4 text-primary animate-pulse" />
                            </h2>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Tab Pills */}
                            <div className="flex rounded-xl bg-muted p-1 border border-border/60 text-xs font-semibold">
                                <button
                                    onClick={() => setProductTab('all')}
                                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                                        productTab === 'all'
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-foreground/80 hover:text-foreground'
                                    }`}
                                >
                                    Tất cả
                                </button>
                                <button
                                    onClick={() => setProductTab('new')}
                                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                                        productTab === 'new'
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-foreground/80 hover:text-foreground'
                                    }`}
                                >
                                    Mới nhất
                                </button>
                                <button
                                    onClick={() => setProductTab('best')}
                                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                                        productTab === 'best'
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-foreground/80 hover:text-foreground'
                                    }`}
                                >
                                    Bán chạy
                                </button>
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex rounded-xl border border-border/60 bg-muted/40 p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    aria-label="Xem dạng lưới"
                                    className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <LayoutGridIcon className="size-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    aria-label="Xem dạng danh sách"
                                    className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <ListIcon className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Products Grid or List View */}
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                            {filteredProducts.map((p) => {
                                const isLiked = wishlist.has(p.id)
                                return (
                                    <Product3DCard
                                        key={p.id}
                                        product={p}
                                        isLiked={isLiked}
                                        onToggleWishlist={handleToggleWishlist}
                                    />
                                )
                            })}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredProducts.map((p) => (
                                <Link key={p.id} href={ROUTE.PRODUCT_DETAIL(p.slug || p.id)} className="block group">
                                    <article className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50">
                                        <div className="relative flex size-24 shrink-0 items-center justify-center rounded-xl bg-muted/40 overflow-hidden text-4xl select-none transition-all duration-500 ease-out group-hover:scale-105 group-hover:bg-primary/5">
                                            {p.image ? (
                                                <Image
                                                    src={p.image}
                                                    alt={p.name}
                                                    fill
                                                    sizes="96px"
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                p.emoji
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <span className="font-semibold">{p.category}</span>
                                                <span>•</span>
                                                <span>{p.shop}</span>
                                                {p.verified && (
                                                    <CheckCircle2Icon className="size-3.5 text-primary transition-transform duration-300 group-hover:scale-110" />
                                                )}
                                            </div>
                                            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                                {p.name}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <StarIcon className="size-3.5 fill-amber-400 text-amber-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                                                    <span className="font-bold text-foreground">{p.rating}</span>
                                                    <span>({p.reviews})</span>
                                                </span>
                                                <span suppressHydrationWarning>Đã bán {formatNumber(p.sold)}</span>
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0">
                                            <div className="text-left sm:text-right">
                                                <p className="text-lg font-extrabold text-primary transition-transform duration-300 group-hover:scale-105 origin-right">
                                                    {formatCurrencyVND(p.price)}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-through">
                                                    {formatCurrencyVND(p.originalPrice)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-1.5 border border-border/60 transition-colors group-hover:border-primary/40">
                                                <div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                                                    <StoreIcon className="size-3" />
                                                </div>
                                                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                                    {p.shop}
                                                </span>
                                                {p.verified && (
                                                    <CheckCircle2Icon className="size-3.5 text-primary transition-transform duration-300 group-hover:scale-125" />
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* ═══════════════════════════════════════════════════════════════════
                 * 8. FOOTER PROMO BANNER: TRẢI NGHIỆM APP & ĐĂNG KÝ BÁN HÀNG
                 * ═══════════════════════════════════════════════════════════════════ */}
                <section
                    aria-label="Khuyến mãi chân trang"
                    className="overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/10 shadow-lg"
                >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 sm:p-10">
                        <div className="md:col-span-8 space-y-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                                <SparklesIcon className="size-3 text-primary-foreground" />
                                Độc quyền trên TimmyHub App
                            </span>
                            <h2 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                                Tải App Ngay — Nhận Quà Tặng 100.000 ₫ Cho Đơn Hàng Đầu Tiên!
                            </h2>
                            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                                Trải nghiệm mua sắm nhanh hơn, săn sale chớp nhoáng, theo dõi trạng thái đơn hàng thời
                                gian thực và nhận thông báo khuyến mãi cá nhân hoá mỗi ngày.
                            </p>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                    size="lg"
                                    className="rounded-xl font-semibold gap-2 shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => toast.info('Tính năng tải ứng dụng iOS sắp ra mắt!')}
                                >
                                    <IconPath name="apple" size={16} className="text-primary-foreground" />
                                    App Store
                                </Button>
                                <Button
                                    size="lg"
                                    className="rounded-xl font-semibold gap-2 shadow-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                                    onClick={() => toast.info('Tính năng tải ứng dụng Android sắp ra mắt!')}
                                >
                                    <PlayIcon className="size-4 fill-current text-white" />
                                    Google Play
                                </Button>
                                <Link href={sellerRoute}>
                                    <Button
                                        size="lg"
                                        className="rounded-xl font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                    >
                                        <StoreIcon className="size-4 text-primary-foreground" />
                                        {sellerLabel}
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="md:col-span-4 flex justify-center [perspective:800px]">
                            <div className="w-64 rounded-2xl border border-border/60 bg-card p-5 shadow-2xl text-center space-y-3 transition-transform duration-300 hover:rotate-0 hover:scale-105 [transform:rotateY(-6deg)_rotateX(4deg)] motion-reduce:transform-none select-none">
                                <div className="size-16 mx-auto rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl shadow-md">
                                    T
                                </div>
                                <h3 className="font-bold text-base text-foreground">TimmyHub Mobile</h3>
                                <p className="text-xs text-muted-foreground">
                                    Quét mã QR để tải ngay ứng dụng cho điện thoại của bạn
                                </p>
                                <div className="rounded-xl bg-muted p-4 border border-border font-mono text-xs font-bold text-foreground">
                                    [ QR CODE SCAN ]
                                </div>
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                    iOS & Android Hỗ Trợ 100%
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
