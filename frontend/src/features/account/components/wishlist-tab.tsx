'use client'

import Link from 'next/link'
import { Heart, HeartOff, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button, Skeleton } from '@/components'
import { ROUTE } from '@/constants'
import { ProductCard } from '@/features/products'
import { useWishlist } from '@/hooks'
import { resolveMediaUrl } from '@/utils'

export interface WishlistTabProps {
    onCloseDialog?: () => void
}

export function WishlistTab({ onCloseDialog }: WishlistTabProps = {}) {
    const t = useTranslations('account.wishlist')
    const { items, isLoading, removeFromWishlist } = useWishlist()

    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Heart className="size-5 text-rose-500 fill-rose-500" />
                    <span>{t('title')}</span>
                    {items.length > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            {items.length}
                        </span>
                    )}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-3">
                            <Skeleton className="h-44 w-full rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-1/3" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-5 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border/80 rounded-3xl bg-muted/20">
                    <div className="size-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 shadow-inner">
                        <HeartOff className="size-8 stroke-[1.5]" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">{t('emptyTitle')}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-1 mb-6">
                        {t('emptyDescription')}
                    </p>
                    <Button asChild className="rounded-xl font-bold gap-2 px-6 shadow-md">
                        <Link href={ROUTE.PRODUCTS} onClick={onCloseDialog}>
                            <ShoppingBag className="size-4" />
                            <span>{t('exploreBtn')}</span>
                        </Link>
                    </Button>
                </div>
            )}

            {/* Items Grid - Reusing shared ProductCard identical to Home page */}
            {!isLoading && items.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                    {items.map((item) => (
                        <ProductCard
                            key={item.id}
                            product={{
                                id: item.productId,
                                name: item.name,
                                slug: item.slug || item.productId,
                                price: item.minPrice,
                                originalPrice: item.maxPrice > item.minPrice ? item.maxPrice : undefined,
                                image: resolveMediaUrl(item.images[0]) || '/placeholder-product.png',
                                images: item.images,
                                rating: item.ratingAvg > 0 ? Number(item.ratingAvg.toFixed(1)) : 5.0,
                                reviews: item.ratingCount,
                            }}
                            isLiked={true}
                            onToggleWishlist={() => removeFromWishlist(item.productId, item.name)}
                            onCardClick={onCloseDialog}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
