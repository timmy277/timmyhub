'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, HeartOff, ShoppingBag, Star, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge, Button, Card, CardContent, Skeleton } from '@/components'
import { ROUTE } from '@/constants'
import { useWishlist } from '@/hooks'
import { formatCurrencyVND, resolveMediaUrl } from '@/utils'

export interface WishlistTabProps {
    onCloseDialog?: () => void
}

export function WishlistTab({ onCloseDialog }: WishlistTabProps = {}) {
    const t = useTranslations('account.wishlist')
    const { items, isLoading, removeFromWishlist, isRemoving } = useWishlist()

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden border border-border/70 rounded-2xl">
                            <Skeleton className="h-44 w-full" />
                            <CardContent className="p-4 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <div className="flex justify-between items-center pt-2">
                                    <Skeleton className="h-6 w-20" />
                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                </div>
                            </CardContent>
                        </Card>
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

            {/* Items Grid */}
            {!isLoading && items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => {
                        const imageUrl = resolveMediaUrl(item.images[0]) || '/placeholder-product.png'
                        const productUrl = ROUTE.PRODUCT_DETAIL(item.slug || item.productId)

                        return (
                            <Card
                                key={item.id}
                                className="group relative overflow-hidden border border-border/70 hover:border-primary/50 transition-all duration-300 rounded-2xl bg-card hover:shadow-lg flex flex-col"
                            >
                                {/* Image Container */}
                                <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                                    <Link href={productUrl} onClick={onCloseDialog} className="block size-full">
                                        <Image
                                            src={imageUrl}
                                            alt={item.name}
                                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            width={400}
                                            height={400}
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            unoptimized
                                        />
                                    </Link>

                                    {/* Stock Badge */}
                                    <div className="absolute top-2.5 left-2.5">
                                        <Badge
                                            variant={item.inStock ? 'secondary' : 'destructive'}
                                            className="text-[10px] font-semibold backdrop-blur-xs"
                                        >
                                            {item.inStock ? t('inStock') : t('outOfStock')}
                                        </Badge>
                                    </div>

                                    {/* Remove Wishlist Button */}
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        disabled={isRemoving}
                                        onClick={() => removeFromWishlist(item.productId, item.name)}
                                        className="absolute top-2.5 right-2.5 size-8 rounded-full bg-background/80 hover:bg-rose-500 hover:text-white backdrop-blur-xs shadow-md transition-colors text-muted-foreground"
                                        title={t('remove')}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>

                                {/* Content Container */}
                                <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
                                    <div className="space-y-1.5">
                                        <Link
                                            href={productUrl}
                                            onClick={onCloseDialog}
                                            className="block group-hover:text-primary transition-colors"
                                        >
                                            <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                                                {item.name}
                                            </h4>
                                        </Link>

                                        {/* Rating & reviews */}
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-0.5 text-amber-500">
                                                <Star className="size-3.5 fill-amber-500" />
                                                <span className="font-bold text-foreground">
                                                    {item.ratingAvg > 0 ? item.ratingAvg.toFixed(1) : '5.0'}
                                                </span>
                                            </div>
                                            {item.ratingCount > 0 && (
                                                <span className="text-[11px]">({item.ratingCount})</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Price and Action */}
                                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-base font-extrabold text-primary">
                                                {formatCurrencyVND(item.minPrice)}
                                            </span>
                                            {item.maxPrice > item.minPrice && (
                                                <span className="text-[11px] text-muted-foreground line-through">
                                                    {formatCurrencyVND(item.maxPrice)}
                                                </span>
                                            )}
                                        </div>

                                        <Button
                                            asChild
                                            size="sm"
                                            className="rounded-xl font-bold text-xs gap-1 shadow-xs"
                                        >
                                            <Link href={productUrl} onClick={onCloseDialog}>
                                                <ShoppingBag className="size-3.5" />
                                                <span>{t('viewDetail')}</span>
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
