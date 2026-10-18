'use client'

import React, { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Heart, Pause, Play } from 'lucide-react'

import type { VideoPostDto } from '@timmyhub/contracts'

import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components/ui'

import { ShoppableProductCard } from './shoppable-product-card'
import { VideoActionStack } from './video-action-stack'

// Rule 12: Thư viện nặng (hls.js / Video Player) phải next/dynamic — 0 KB vào gói chung
const HlsVideoPlayer = dynamic(() => import('./hls-video-player').then((mod) => mod.HlsVideoPlayer), {
    ssr: false,
    loading: () => <div className="size-full bg-black flex items-center justify-center" />,
})

interface FullscreenFeedItemProps {
    video: VideoPostDto
    isActive: boolean
    isMuted: boolean
    windowWidth: number
    onLike: () => void
    onOpenComments: () => void
    onShare: () => void
    onNext: () => void
    onPrev: () => void
    hasPrev: boolean
    hasNext: boolean
    onAddToCart: (
        e: React.MouseEvent,
        productId: string,
        productName: string,
        slug?: string,
        variantId?: string,
    ) => void
    isAddingToCart: boolean
}

export function FullscreenFeedItem({
    video,
    isActive,
    isMuted,
    windowWidth,
    onLike,
    onOpenComments,
    onShare,
    onNext,
    onPrev,
    hasPrev,
    hasNext,
    onAddToCart,
    isAddingToCart,
}: FullscreenFeedItemProps) {
    // ===== State =====
    const [videoRect, setVideoRect] = useState<{ left: number; width: number } | null>(null)
    const [isHeartAnimating, setIsHeartAnimating] = useState(false)
    const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<boolean | null>(null)

    // ===== Hooks =====
    const t = useTranslations('content')

    // ===== Derived =====
    const taggedProducts = video.productTags || []
    const isWidescreen = windowWidth >= 768
    const hasCenteredVideo = isWidescreen && !!videoRect && videoRect.width < windowWidth - 100

    // Ngoại lệ Rule 30: Đo đạc runtime toạ độ DOM video rect để căn chỉnh bám khung hình
    const contentStyle: React.CSSProperties =
        hasCenteredVideo && videoRect
            ? {
                  left: Math.max(16, videoRect.left + 16),
                  maxWidth: Math.max(320, Math.min(videoRect.width - 32, 580)),
                  right: 'auto',
              }
            : {}

    const iconsLeft = videoRect ? videoRect.left + videoRect.width + 16 : undefined
    const canDockBesideVideo = isWidescreen && iconsLeft !== undefined && iconsLeft + 56 <= windowWidth

    // Ngoại lệ Rule 30: Vị trí docking bên cạnh video player tính toán động từ DOM
    const actionsStyle: React.CSSProperties =
        canDockBesideVideo && iconsLeft !== undefined
            ? {
                  left: iconsLeft,
                  right: 'auto',
              }
            : {}

    // ===== Handlers =====
    const handleMeasure = useCallback((rect: { left: number; width: number }) => {
        setVideoRect((prev) => {
            if (prev && prev.left === rect.left && prev.width === rect.width) {
                return prev
            }
            return rect
        })
    }, [])

    const handleItemLike = () => {
        setIsHeartAnimating(true)
        setTimeout(() => setIsHeartAnimating(false), 600)
        onLike()
    }

    const handleVideoClick = () => {
        setShowPlayPauseIcon((prev) => (prev === null ? false : !prev))
        setTimeout(() => setShowPlayPauseIcon(null), 600)
    }

    return (
        <div className="relative size-full flex items-center justify-center bg-black overflow-hidden select-none">
            {/* VIDEO PLAYER CANVAS */}
            <div className="relative size-full flex items-center justify-center">
                <HlsVideoPlayer
                    src={video.videoUrl}
                    isActive={isActive}
                    muted={isMuted}
                    autoPlay
                    loop
                    onEnded={onNext}
                    onMeasure={handleMeasure}
                    onClick={handleVideoClick}
                    showCustomControls={false}
                    className="size-full"
                />

                {/* Gradient shadow overlay phía dưới video để làm nổi bật text */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

                {/* Heart splash animation khi bấm Like hoặc double-tap */}
                {isHeartAnimating && (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                        <Heart className="size-28 fill-red-500 text-red-500 drop-shadow-2xl animate-ping" />
                    </div>
                )}

                {/* Play/Pause flash icon khi tap vào màn hình giống timmyhub gốc */}
                {showPlayPauseIcon !== null && (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                        <div className="flex size-16 items-center justify-center rounded-full bg-black/60 text-white shadow-2xl backdrop-blur-sm animate-scale-in">
                            {showPlayPauseIcon ? (
                                <Play className="size-8 fill-current ml-1" />
                            ) : (
                                <Pause className="size-8 fill-current" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* BOTTOM LEFT: SHOPPABLE PRODUCT TAG & CAPTION METADATA */}
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

            {/* RIGHT FLOATING ACTIONS STACK */}
            <VideoActionStack
                video={video}
                onLike={handleItemLike}
                onOpenComments={onOpenComments}
                onShare={onShare}
                onNext={onNext}
                onPrev={onPrev}
                hasPrev={hasPrev}
                hasNext={hasNext}
                style={actionsStyle}
            />
        </div>
    )
}
