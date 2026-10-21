'use client'

import React, { useCallback, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Heart } from 'lucide-react'

import type { VideoPostDto } from '@timmyhub/contracts'

import type { QualityLevel } from './hls-quality-menu'
import { VideoCaptionOverlay } from './video-caption-overlay'
import { VideoActionStack } from './video-action-stack'

const HlsVideoPlayer = dynamic(() => import('./hls-video-player').then((mod) => mod.HlsVideoPlayer), {
    ssr: false,
    loading: () => <div className="size-full bg-black flex items-center justify-center" />,
})

// ===== 1. Types & Interfaces =====

interface FullscreenFeedItemProps {
    video: VideoPostDto
    isActive: boolean
    isMuted: boolean
    windowWidth: number
    onToggleMute: () => void
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

// ===== 2. Component =====

export function FullscreenFeedItem({
    video,
    isActive,
    isMuted,
    windowWidth,
    onToggleMute,
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
    // ===== 3. State & Refs =====
    const [videoRect, setVideoRect] = useState<{ left: number; width: number } | null>(null)
    const [isHeartAnimating, setIsHeartAnimating] = useState(false)
    const [qualities, setQualities] = useState<QualityLevel[]>([])
    const [selectedQuality, setSelectedQuality] = useState<number>(-1)
    const selectQualityRef = useRef<((idx: number) => void) | null>(null)

    // ===== 4. Derived Layout Calculations =====
    const taggedProducts = video.productTags || []
    const isWidescreen = windowWidth >= 768
    const hasCenteredVideo = isWidescreen && !!videoRect && videoRect.width < windowWidth - 100

    // Runtime dynamic style: Căn lề trái overlay caption bám sát cạnh khung video khi ở widescreen
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

    // Runtime dynamic style: Neo thanh action stack sát mép ngoài video canvas trên desktop
    const actionsStyle: React.CSSProperties =
        canDockBesideVideo && iconsLeft !== undefined
            ? {
                  left: iconsLeft,
                  right: 'auto',
              }
            : {}

    // ===== 5. Handlers =====
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

    const handleQualitiesLoaded = useCallback((loadedQualities: QualityLevel[], selector: (index: number) => void) => {
        setQualities(loadedQualities)
        selectQualityRef.current = selector
    }, [])

    const handleSelectQuality = useCallback((index: number) => {
        setSelectedQuality(index)
        selectQualityRef.current?.(index)
    }, [])

    // ===== 6. Render =====
    return (
        <div className="relative size-full flex items-center justify-center bg-black overflow-hidden select-none">
            {/* Trình phát HLS Video Player */}
            <div className="relative size-full flex items-center justify-center">
                <HlsVideoPlayer
                    src={video.videoUrl}
                    poster={video.thumbnailUrl}
                    isActive={isActive}
                    muted={isMuted}
                    autoPlay
                    loop
                    onEnded={onNext}
                    onMeasure={handleMeasure}
                    onQualitiesLoaded={handleQualitiesLoaded}
                    showCustomControls={false}
                    className="size-full"
                />

                {/* Gradient phủ mờ bảo vệ độ tương phản chữ */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

                {/* Heart splash animation khi người dùng bấm like */}
                {isHeartAnimating && (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                        <Heart className="size-28 fill-primary text-primary drop-shadow-[0_0_35px_rgba(16,185,129,0.6)] animate-ping" />
                    </div>
                )}
            </div>

            {/* Khối Caption & Thẻ sản phẩm Shoppable góc dưới bên trái */}
            <VideoCaptionOverlay
                video={video}
                taggedProducts={taggedProducts}
                contentStyle={contentStyle}
                onAddToCart={onAddToCart}
                isAddingToCart={isAddingToCart}
            />

            {/* Cột các nút tương tác trôi góc phải */}
            <VideoActionStack
                video={video}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
                qualities={qualities}
                selectedQuality={selectedQuality}
                onSelectQuality={handleSelectQuality}
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
