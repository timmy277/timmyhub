'use client'

import { memo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2Icon, HeartIcon, StarIcon, StoreIcon, TruckIcon } from 'lucide-react'

import type { SearchProductDoc } from '@timmyhub/contracts'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useWishlist } from '@/hooks'
import { cn, formatCurrencyVND } from '@/utils'

function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export interface ProductCardItem {
    id: string
    name: string
    slug?: string | null
    category?: string | null
    shop?: string | null
    shopSlug?: string | null
    shopId?: string | null
    verified?: boolean
    price: string | number
    originalPrice?: string | number | null
    discount?: number
    sold?: number
    rating?: number
    reviews?: number
    image?: string | null
    images?: string[]
    emoji?: string
    isNew?: boolean
    isBest?: boolean
    highlightNameHtml?: string
}

export interface ProductCardProps {
    product: ProductCardItem | SearchProductDoc
    isLiked?: boolean
    onToggleWishlist?: (id: string, name: string) => void
    className?: string
    showFreeshipBadge?: boolean
}

/**
 * Reusable Product Card featuring interactive 3D tilt, glare sweep lighting,
 * wishlist toggle, shop navigation, and search keyword highlighting.
 */
export const ProductCard = memo(function ProductCard({
    product,
    isLiked,
    onToggleWishlist,
    className,
    showFreeshipBadge = true,
}: ProductCardProps) {
    const router = useRouter()
    const wishlist = useWishlist()
    const [tilt, setTilt] = useState({ x: 0, y: 0 })
    const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 })
    const cardRef = useRef<HTMLDivElement>(null)

    // Normalize product fields regardless of input schema
    const id = product.id
    const name = product.name
    const slug = product.slug || id
    const image =
        'image' in product && product.image
            ? product.image
            : 'images' in product && product.images?.[0]
              ? product.images[0]
              : undefined
    const emoji = 'emoji' in product ? product.emoji : undefined
    const category =
        'category' in product ? product.category : 'categoryName' in product ? product.categoryName : undefined
    const shop = 'shop' in product ? product.shop : 'shopName' in product ? product.shopName : undefined
    const shopSlug =
        ('shopSlug' in product && product.shopSlug) ||
        ('shopId' in product && product.shopId) ||
        ('sellerId' in product && product.sellerId) ||
        undefined
    const verified = 'verified' in product ? Boolean(product.verified) : true
    const price = product.price
    const originalPrice = product.originalPrice
    const discount = product.discount ?? 0
    const rating =
        'rating' in product && product.rating !== undefined
            ? product.rating
            : 'ratingAvg' in product && product.ratingAvg > 0
              ? Number(product.ratingAvg.toFixed(1))
              : 5.0
    const reviews =
        'reviews' in product && product.reviews !== undefined
            ? product.reviews
            : 'ratingCount' in product
              ? product.ratingCount
              : 0
    const sold =
        'sold' in product && product.sold !== undefined ? product.sold : 'soldCount' in product ? product.soldCount : 0
    const highlightNameHtml =
        'highlightNameHtml' in product
            ? product.highlightNameHtml
            : 'highlight' in product
              ? product.highlight?.name?.[0]
              : undefined

    // Wishlist handling
    const activeIsLiked = isLiked !== undefined ? isLiked : wishlist.isInWishlist(id)
    const handleWishlistClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (onToggleWishlist) {
            onToggleWishlist(id, name)
        } else {
            wishlist.toggleWishlist(id)
        }
    }

    // 3D Tilt handlers
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
        <div className={cn('[perspective:1000px] h-full', className)}>
            <Link
                href={ROUTE.PRODUCT_DETAIL(slug)}
                prefetch={false}
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
                        {image ? (
                            <Image
                                src={image}
                                alt={name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                            />
                        ) : (
                            <span className="text-6xl transition-transform duration-500 ease-out group-hover:scale-115 group-hover:rotate-3 select-none drop-shadow-sm">
                                {emoji || '🎁'}
                            </span>
                        )}

                        {/* Discount & Freeship Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20">
                            {discount > 0 && (
                                <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]">
                                    -{discount}%
                                </span>
                            )}
                            {showFreeshipBadge && (
                                <span className="rounded-md bg-emerald-500 text-white px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5 shadow-xs">
                                    <TruckIcon className="size-2.5" />
                                    Freeship
                                </span>
                            )}
                        </div>

                        {/* Wishlist Button */}
                        <Button
                            type="button"
                            onClick={handleWishlistClick}
                            aria-label="Thêm vào yêu thích"
                            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-125 active:scale-90 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40 z-30"
                            variant="ghost"
                        >
                            <HeartIcon
                                className={cn(
                                    'size-3.5 transition-colors duration-200',
                                    activeIsLiked && 'fill-rose-500 text-rose-500',
                                )}
                            />
                        </Button>
                    </div>

                    {/* Product Details with 3D Depth */}
                    <div className="mt-3 flex flex-1 flex-col gap-1.5 [transform:translateZ(14px)]">
                        {category && (
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase truncate">
                                {category}
                            </span>
                        )}

                        <h3 className="line-clamp-2 text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                            {highlightNameHtml ? (
                                <span dangerouslySetInnerHTML={{ __html: highlightNameHtml }} />
                            ) : (
                                name
                            )}
                        </h3>

                        <div className="mt-auto pt-2 space-y-2">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-105 origin-left inline-block">
                                    {formatCurrencyVND(price)}
                                </span>
                                {originalPrice && Number(originalPrice) > Number(price) && (
                                    <span className="text-[10px] text-muted-foreground line-through">
                                        {formatCurrencyVND(originalPrice)}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                    <StarIcon className="size-3 fill-amber-400 text-amber-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                                    <span className="font-semibold text-foreground/90">{rating}</span>
                                    {reviews > 0 && <span>({reviews})</span>}
                                </span>
                                <span suppressHydrationWarning>Đã bán {formatNumber(sold)}</span>
                            </div>

                            {/* Seller Footer */}
                            {shop && (
                                <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-1.5 text-xs">
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            if (shopSlug) {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                router.push(ROUTE.SHOP_DETAIL(shopSlug))
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && shopSlug) {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                router.push(ROUTE.SHOP_DETAIL(shopSlug))
                                            }
                                        }}
                                        className="flex items-center gap-1.5 min-w-0 min-h-[28px] py-1 hover:underline cursor-pointer group/vendor z-30"
                                    >
                                        <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-transform duration-300 group-hover/vendor:scale-110 group-hover/vendor:bg-primary group-hover/vendor:text-primary-foreground">
                                            <StoreIcon className="size-3" />
                                        </div>
                                        <span className="truncate text-[11px] font-semibold text-foreground group-hover/vendor:text-primary transition-colors">
                                            {shop}
                                        </span>
                                        {verified && (
                                            <CheckCircle2Icon className="size-3.5 text-primary shrink-0 transition-transform duration-300 group-hover/vendor:scale-125" />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </article>
            </Link>
        </div>
    )
})
