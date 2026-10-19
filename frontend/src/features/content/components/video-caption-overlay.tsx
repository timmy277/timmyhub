'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import type { PostProductDto, VideoPostDto } from '@timmyhub/contracts'

import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components/ui'
import { ShoppableProductCard } from './shoppable-product-card'

interface VideoCaptionOverlayProps {
    video: VideoPostDto
    taggedProducts: PostProductDto[]
    contentStyle?: React.CSSProperties
    onAddToCart: (
        e: React.MouseEvent,
        productId: string,
        productName: string,
        slug?: string,
        variantId?: string,
    ) => void
    isAddingToCart: boolean
}

export function VideoCaptionOverlay({
    video,
    taggedProducts,
    contentStyle,
    onAddToCart,
    isAddingToCart,
}: VideoCaptionOverlayProps) {
    const t = useTranslations('content')

    return (
        <div
            className="absolute bottom-6 left-4 sm:bottom-8 sm:left-8 md:left-12 z-20 max-w-lg sm:max-w-xl md:max-w-2xl space-y-3 pointer-events-auto transition-all duration-300"
            style={contentStyle}
        >
            {/* Thông tin Shop & Creator */}
            <div className="flex items-center gap-2.5">
                <Avatar className="size-10 ring-2 ring-emerald-500 shadow-md">
                    {video.shopLogo && <AvatarImage src={video.shopLogo} alt={video.shopName} />}
                    <AvatarFallback className="bg-emerald-950 text-emerald-300 font-bold text-xs">
                        {video.shopName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white drop-shadow truncate">
                            {video.shopName}
                        </span>
                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 rounded-full border-white/60 bg-white/10 text-white text-[11px] px-2.5 hover:bg-white/20 font-bold backdrop-blur-sm"
                        >
                            {t('follow')}
                        </Button>
                    </div>
                    <span className="text-[11px] text-white/75 drop-shadow">{t('officialShop')}</span>
                </div>
            </div>

            {/* Tiêu đề & Nội dung bài đăng */}
            <div className="space-y-1.5">
                <h1 className="font-bold text-sm sm:text-base md:text-lg text-white leading-snug drop-shadow line-clamp-2">
                    {video.title}
                </h1>
                {video.content && (
                    <p className="text-xs sm:text-sm text-white/85 line-clamp-2 leading-relaxed drop-shadow">
                        {video.content}
                    </p>
                )}
                {video.hashtags && video.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {video.hashtags.map((tag) => (
                            <span key={tag} className="text-xs font-semibold text-emerald-400 drop-shadow">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Shoppable Floating Card */}
            {taggedProducts.length > 0 && (
                <ShoppableProductCard
                    taggedProducts={taggedProducts}
                    onAddToCart={onAddToCart}
                    isAddingToCart={isAddingToCart}
                />
            )}
        </div>
    )
}
