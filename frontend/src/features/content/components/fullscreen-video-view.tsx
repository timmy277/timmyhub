'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { VideoPostDto } from '@timmyhub/contracts'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useAddToCart } from '@/hooks'

import { useVideoFeed } from '../hooks/use-video-feed'
import { FullscreenFeedItem } from './fullscreen-feed-item'
import { FullscreenHeader } from './fullscreen-header'
import { VideoCommentDrawer } from './video-comment-drawer'

export function FullscreenVideoView() {
    // ===== State =====
    const [activeIndex, setActiveIndex] = useState(0)
    const [isMuted, setIsMuted] = useState(true)
    const [showComments, setShowComments] = useState(false)
    const [commentVideo, setCommentVideo] = useState<VideoPostDto | null>(null)
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280)

    const containerRef = useRef<HTMLDivElement>(null)
    const recordedVideoIdsRef = useRef<Set<string>>(new Set())
    const scrolledToTargetRef = useRef(false)

    // ===== Hooks =====
    const router = useRouter()
    const searchParams = useSearchParams()
    const t = useTranslations('content')
    const initialIdFromUrl = searchParams.get('id')

    const { videos, isLoading, toggleLike, recordView } = useVideoFeed({ limit: 12 })
    const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart()

    // ===== Derived =====
    const activeVideoForDrawer = commentVideo ?? videos[activeIndex] ?? null

    // ===== Handlers =====
    const handleBack = useCallback(() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            router.push(ROUTE.HOME)
        }
    }, [router])

    const scrollToIndex = useCallback((idx: number) => {
        const container = containerRef.current
        if (!container) return
        const item = container.querySelector(`[data-post-index="${idx}"]`) as HTMLElement
        item?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [])

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

    // ===== Effects =====
    // Window resize tracking
    useEffect(() => {
        let rId: number | null = null
        const handleResize = () => {
            if (rId) cancelAnimationFrame(rId)
            rId = requestAnimationFrame(() => {
                setWindowWidth(window.innerWidth)
            })
        }
        window.addEventListener('resize', handleResize, { passive: true })
        return () => {
            if (rId) cancelAnimationFrame(rId)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    // IntersectionObserver để theo dõi video nào đang hiển thị trong viewport
    useEffect(() => {
        const container = containerRef.current
        if (!container || videos.length === 0) return

        const items = container.querySelectorAll('[data-post-item]')
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const idx = Number((entry.target as HTMLElement).dataset.postIndex)
                        if (!Number.isNaN(idx)) {
                            setActiveIndex(idx)
                        }
                    }
                })
            },
            { root: container, threshold: 0.6 },
        )

        items.forEach((item) => observer.observe(item))
        return () => observer.disconnect()
    }, [videos.length])

    // Scroll ban đầu đến video được chỉ định bởi URL param `?id=`
    useEffect(() => {
        if (!initialIdFromUrl || scrolledToTargetRef.current || videos.length === 0) return
        const idx = videos.findIndex((v) => v.id === initialIdFromUrl)
        if (idx !== -1) {
            scrolledToTargetRef.current = true
            const container = containerRef.current
            const item = container?.querySelector(`[data-post-index="${idx}"]`) as HTMLElement
            item?.scrollIntoView({ behavior: 'auto', block: 'start' })
        }
    }, [initialIdFromUrl, videos])

    // Cập nhật URL bằng replaceState để đổi URL 0ms không kích hoạt RSC re-fetch
    useEffect(() => {
        const currentVideo = videos[activeIndex]
        if (currentVideo && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            if (params.get('id') !== currentVideo.id) {
                params.set('id', currentVideo.id)
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
            }
        }
    }, [activeIndex, videos])

    // Ghi nhận lượt xem video một lần duy nhất cho mỗi video active
    useEffect(() => {
        const currentVideo = videos[activeIndex]
        if (currentVideo && !recordedVideoIdsRef.current.has(currentVideo.id)) {
            recordedVideoIdsRef.current.add(currentVideo.id)
            recordView(currentVideo.id)
        }
    }, [activeIndex, videos, recordView])

    // Lắng nghe Keyboard (Mũi tên Lên/Xuống & Escape)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                scrollToIndex(Math.min(activeIndex + 1, videos.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                scrollToIndex(Math.max(activeIndex - 1, 0))
            } else if (e.key === 'Escape') {
                e.preventDefault()
                handleBack()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeIndex, videos.length, scrollToIndex, handleBack])

    // Loading & Empty States
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

    return (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-black select-none">
            {/* TOP NAVIGATION BAR */}
            <FullscreenHeader isMuted={isMuted} onToggleMute={() => setIsMuted((prev) => !prev)} onBack={handleBack} />

            {/* VERTICAL SCROLL-SNAP CONTAINER (100% Tailwind CSS classes, no static inline styles) */}
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

            {/* COMMENT DRAWER */}
            {activeVideoForDrawer && (
                <VideoCommentDrawer
                    video={activeVideoForDrawer}
                    isOpen={showComments}
                    onClose={() => setShowComments(false)}
                />
            )}
        </div>
    )
}
