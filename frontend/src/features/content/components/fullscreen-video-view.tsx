'use client'

import React, { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { VideoPostDto } from '@timmyhub/contracts'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useAddToCart } from '@/hooks'

import { useVideoFeed } from '../hooks/use-video-feed'
import { useFullscreenNavigation } from '../hooks/use-fullscreen-navigation'
import { FullscreenFeedItem } from './fullscreen-feed-item'
import { FullscreenHeader } from './fullscreen-header'
import { VideoCommentDrawer } from './video-comment-drawer'

export function FullscreenVideoView() {
    // ===== 1. State & Refs =====
    const [isMuted, setIsMuted] = useState(true)
    const [showComments, setShowComments] = useState(false)
    const [commentVideo, setCommentVideo] = useState<VideoPostDto | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // ===== 2. Hooks & Data Fetching =====
    const router = useRouter()
    const t = useTranslations('content')
    const { videos, isLoading, toggleLike, recordView } = useVideoFeed({ limit: 12 })
    const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart()

    const { activeIndex, windowWidth, handleBack, scrollToIndex } = useFullscreenNavigation({
        videos,
        containerRef,
        recordView,
    })

    const activeVideoForDrawer = commentVideo ?? videos[activeIndex] ?? null

    // ===== 3. Handlers =====
    const handleShare = useCallback(
        (video: VideoPostDto) => {
            if (typeof window === 'undefined') return
            const shareUrl = `${window.location.origin}${ROUTE.VIDEOS}?id=${encodeURIComponent(video.id)}`
            navigator.clipboard
                ?.writeText(shareUrl)
                .then(() => {
                    toast.success(t('shareCopied'))
                })
                .catch(() => {
                    toast.info(t('shareSuccess'))
                })
        },
        [t],
    )

    const handleQuickAddToCart = useCallback(
        (e: React.MouseEvent, productId: string, productName: string, slug?: string, variantId?: string) => {
            e.stopPropagation()
            if (variantId) {
                addToCart(
                    { variantId, quantity: 1 },
                    {
                        onSuccess: () => {
                            toast.success(t('addedToCart', { name: productName }))
                        },
                        onError: () => {
                            toast.error(t('addToCartError'))
                        },
                    },
                )
            } else {
                router.push(ROUTE.PRODUCT_DETAIL(slug || productId))
            }
        },
        [addToCart, router, t],
    )

    // ===== 4. Loading & Empty States =====
    if (isLoading && videos.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
                <div className="space-y-4 text-center">
                    <div className="size-12 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <p className="text-sm font-medium text-white/70">{t('loading')}</p>
                </div>
            </div>
        )
    }

    if (!isLoading && videos.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-4 text-center text-white">
                <p className="text-lg font-bold">{t('emptyTitle')}</p>
                <Button asChild className="mt-4 rounded-xl" variant="secondary">
                    <Link href={ROUTE.HOME}>{t('backHome')}</Link>
                </Button>
            </div>
        )
    }

    // ===== 5. Render =====
    return (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-black select-none">
            {/* Top Navigation Bar */}
            <FullscreenHeader onBack={handleBack} />

            {/* Vertical Scroll-Snap Feed Container */}
            <div
                ref={containerRef}
                className="size-full h-dvh overflow-y-scroll snap-y snap-mandatory scrollbar-none bg-black"
            >
                {videos.map((video, idx) => (
                    <div
                        key={video.id}
                        data-post-item
                        data-post-index={idx}
                        className="relative size-full h-dvh snap-start snap-always shrink-0 overflow-hidden bg-black flex items-center justify-center"
                    >
                        <FullscreenFeedItem
                            video={video}
                            isActive={activeIndex === idx}
                            isMuted={isMuted}
                            windowWidth={windowWidth}
                            onToggleMute={() => setIsMuted((prev) => !prev)}
                            onLike={() => toggleLike(video.id)}
                            onOpenComments={() => {
                                setCommentVideo(video)
                                setShowComments(true)
                            }}
                            onShare={() => handleShare(video)}
                            onNext={() => scrollToIndex(Math.min(idx + 1, videos.length - 1))}
                            onPrev={() => scrollToIndex(Math.max(idx - 1, 0))}
                            hasPrev={idx > 0}
                            hasNext={idx < videos.length - 1}
                            onAddToCart={handleQuickAddToCart}
                            isAddingToCart={isAddingToCart}
                        />
                    </div>
                ))}
            </div>

            {/* Comment Drawer */}
            {activeVideoForDrawer && (
                <VideoCommentDrawer
                    video={activeVideoForDrawer}
                    isOpen={showComments}
                    onClose={() => {
                        setShowComments(false)
                        setCommentVideo(null)
                    }}
                />
            )}
        </div>
    )
}
