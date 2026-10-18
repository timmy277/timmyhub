'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ExternalLink, ShoppingBag } from 'lucide-react'

import type { VideoPostDto } from '@timmyhub/contracts'

import { Button, Card } from '@/components/ui'
import { ROUTE } from '@/constants'
import { cn } from '@/utils'

interface ShoppableProductCardProps {
    taggedProducts: NonNullable<VideoPostDto['productTags']>
    onAddToCart: (
        e: React.MouseEvent,
        productId: string,
        productName: string,
        slug?: string,
        variantId?: string,
    ) => void
    isAddingToCart: boolean
}

export function ShoppableProductCard({ taggedProducts, onAddToCart, isAddingToCart }: ShoppableProductCardProps) {
    // ===== State =====
    const [selectedProductIndex, setSelectedProductIndex] = useState(0)

    // ===== Hooks =====
    const t = useTranslations('content')

    // ===== Derived =====
    const currentProduct = taggedProducts[selectedProductIndex]?.product
    const currentVariantId = taggedProducts[selectedProductIndex]?.variantId

    if (!currentProduct) {
        return null
    }

    return (
        <Card className="rounded-2xl border border-white/20 bg-black/70 backdrop-blur-md p-3 shadow-2xl transition-all duration-300 max-w-md sm:max-w-lg">
            <div className="flex items-center gap-2.5">
                {/* Ảnh sản phẩm */}
                <div className="relative size-12 shrink-0 rounded-xl overflow-hidden bg-neutral-800 border border-white/10">
                    {currentProduct.thumbnailUrl ? (
                        <Image
                            src={currentProduct.thumbnailUrl}
                            alt={currentProduct.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center bg-emerald-500/20 text-emerald-400">
                            <ShoppingBag className="size-5" />
                        </div>
                    )}
                </div>

                {/* Tên & Giá sản phẩm */}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{currentProduct.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-extrabold text-sm text-emerald-400 font-mono">
                            {currentProduct.price.toLocaleString('vi-VN')} đ
                        </span>
                        {currentProduct.originalPrice && (
                            <span className="text-[11px] text-white/50 line-through">
                                {currentProduct.originalPrice.toLocaleString('vi-VN')} đ
                            </span>
                        )}
                    </div>
                </div>

                {/* Nút Xem / Mua ngay */}
                <div className="flex items-center gap-1.5">
                    <Button
                        size="sm"
                        onClick={(e) =>
                            onAddToCart(
                                e,
                                currentProduct.id,
                                currentProduct.name,
                                currentProduct.slug ?? undefined,
                                currentVariantId ?? undefined,
                            )
                        }
                        disabled={isAddingToCart}
                        className="h-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs px-3 shadow-md transition-all active:scale-95"
                    >
                        <ShoppingBag className="size-3.5 mr-1" />
                        {t('buyNow')}
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        asChild
                        className="size-8 rounded-xl bg-white/10 text-white hover:bg-white/20"
                        title={t('viewProductDetail')}
                    >
                        <Link href={ROUTE.PRODUCT_DETAIL(currentProduct.slug || currentProduct.id)} target="_blank">
                            <ExternalLink className="size-3.5" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Indicator nếu có nhiều hơn 1 sản phẩm */}
            {taggedProducts.length > 1 && (
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/10 text-[10px] text-white/60">
                    <span>
                        {t('productIndicator', {
                            current: selectedProductIndex + 1,
                            total: taggedProducts.length,
                        })}
                    </span>
                    <div className="flex items-center gap-1">
                        {taggedProducts.map((_, idx) => (
                            <Button
                                key={idx}
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedProductIndex(idx)}
                                className={cn(
                                    'h-1.5 p-0 rounded-full transition-all hover:bg-transparent',
                                    selectedProductIndex === idx
                                        ? 'w-4 bg-emerald-400'
                                        : 'w-1.5 bg-white/30 hover:bg-white/60',
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}
        </Card>
    )
}
