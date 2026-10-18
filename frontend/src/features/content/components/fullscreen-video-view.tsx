'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { VideoPostDto } from '@timmyhub/contracts'
import {
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Eye,
    Heart,
    MessageCircle,
    Pause,
    Play,
    Share2,
    ShoppingBag,
    Volume2,
    VolumeX,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage, Button, Card } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useAddToCart } from '@/hooks'
import { cn } from '@/utils'

import { useVideoFeed } from '../hooks/use-video-feed'
import { HlsVideoPlayer } from './hls-video-player'
import { VideoCommentDrawer } from './video-comment-drawer'

// ═══════════════════════════════════════════════════════════════════════════
// 2. SUB-COMPONENT: FullscreenFeedItem (Mỗi video item trong scroll-snap feed)
// ═══════════════════════════════════════════════════════════════════════════
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

function FullscreenFeedItem({
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
    const [selectedProductIndex, setSelectedProductIndex] = useState(0)
    const [videoRect, setVideoRect] = useState<{ left: number; width: number } | null>(null)
    const [isHeartAnimating, setIsHeartAnimating] = useState(false)
    const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<boolean | null>(null)

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
        // Flash play/pause icon in center
        setShowPlayPauseIcon((prev) => (prev === null ? false : !prev))
        setTimeout(() => setShowPlayPauseIcon(null), 600)
    }

    const taggedProducts = video.productTags || []
    const currentProduct = taggedProducts[selectedProductIndex]?.product
    const currentVariantId = taggedProducts[selectedProductIndex]?.variantId

    // Căn chỉnh nội dung & icons bám theo video frame như timmyhub gốc
    const isWidescreen = windowWidth >= 768
    const hasCenteredVideo = isWidescreen && !!videoRect && videoRect.width < windowWidth - 100

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

    const actionsStyle: React.CSSProperties =
        canDockBesideVideo && iconsLeft !== undefined
            ? {
                  left: iconsLeft,
                  right: 'auto',
              }
            : {}

    return (
        <div className="relative size-full flex items-center justify-center bg-black overflow-hidden select-none">
            {/* ═══════════════════════════════════════════════════════════════
             * VIDEO PLAYER CANVAS (Không dùng poster ảnh stock ngoài để tránh chớp giật)
             * ═══════════════════════════════════════════════════════════════ */}
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

            {/* ═══════════════════════════════════════════════════════════════
             * BOTTOM LEFT: SHOPPABLE PRODUCT TAG & CAPTION METADATA
             * ═══════════════════════════════════════════════════════════════ */}
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
                                Theo dõi
                            </Button>
                        </div>
                        <span className="text-[11px] text-white/75 drop-shadow">Shop chính hãng trên TimmyHub</span>
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

                {/* SHOPPABLE FLOATING CARD (Sản phẩm gắn kèm bài đăng) */}
                {currentProduct && (
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
                                    Mua ngay
                                </Button>

                                <Button
                                    size="icon"
                                    variant="ghost"
                                    asChild
                                    className="size-8 rounded-xl bg-white/10 text-white hover:bg-white/20"
                                    title="Xem chi tiết sản phẩm"
                                >
                                    <Link
                                        href={ROUTE.PRODUCT_DETAIL(currentProduct.slug || currentProduct.id)}
                                        target="_blank"
                                    >
                                        <ExternalLink className="size-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Indicator nếu có nhiều hơn 1 sản phẩm */}
                        {taggedProducts.length > 1 && (
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/10 text-[10px] text-white/60">
                                <span>
                                    Sản phẩm {selectedProductIndex + 1}/{taggedProducts.length}
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
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
             * RIGHT FLOATING ACTIONS STACK: Tương tác Reels / TikTok
             * ═══════════════════════════════════════════════════════════════ */}
            <aside
                className="absolute right-3 sm:right-6 md:right-8 lg:right-12 bottom-20 sm:bottom-28 z-30 flex flex-col items-center gap-4 pointer-events-auto transition-all duration-300"
                style={actionsStyle}
            >
                {/* Like button */}
                <div className="flex flex-col items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleItemLike}
                        className={cn(
                            'size-12 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 hover:scale-110 active:scale-95 transition-all shadow-lg',
                            video.isLiked && 'text-red-500 bg-red-500/20 border-red-500/40',
                        )}
                        title="Thích video"
                    >
                        <Heart
                            className={cn(
                                'size-6 transition-transform',
                                video.isLiked && 'fill-red-500 text-red-500 scale-110',
                            )}
                        />
                    </Button>
                    <span className="text-[11px] font-bold text-white drop-shadow font-mono">
                        {video.likeCount.toLocaleString('vi-VN')}
                    </span>
                </div>

                {/* Comments button */}
                <div className="flex flex-col items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onOpenComments}
                        className="size-12 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 hover:scale-110 active:scale-95 transition-all shadow-lg"
                        title="Bình luận video"
                    >
                        <MessageCircle className="size-6" />
                    </Button>
                    <span className="text-[11px] font-bold text-white drop-shadow font-mono">{video.commentCount}</span>
                </div>

                {/* Share button */}
                <div className="flex flex-col items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onShare}
                        className="size-12 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 hover:scale-110 transition-all shadow-lg"
                        title="Chia sẻ video"
                    >
                        <Share2 className="size-6" />
                    </Button>
                    <span className="text-[11px] font-medium text-white/80 drop-shadow">Chia sẻ</span>
                </div>

                {/* View count */}
                <div className="flex flex-col items-center gap-1">
                    <div className="flex size-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md border border-white/10">
                        <Eye className="size-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/70 font-mono">{video.viewCount}</span>
                </div>

                {/* Next & Previous Video Arrows */}
                <div className="hidden sm:flex flex-col items-center gap-2 pt-2 border-t border-white/10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className="size-9 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 disabled:opacity-30 disabled:pointer-events-none"
                        title="Video trước (Mũi tên lên)"
                    >
                        <ChevronUp className="size-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNext}
                        disabled={!hasNext}
                        className="size-9 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 disabled:opacity-30 disabled:pointer-events-none"
                        title="Video tiếp theo (Mũi tên xuống)"
                    >
                        <ChevronDown className="size-5" />
                    </Button>
                </div>
            </aside>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MAIN COMPONENT: FullscreenVideoView
// ═══════════════════════════════════════════════════════════════════════════
export function FullscreenVideoView() {
    // 3.1. Routing & Query Params
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialIdFromUrl = searchParams.get('id')

    // 3.2. Data Hooks
    const { videos, isLoading, toggleLike, recordView } = useVideoFeed({ limit: 12 })
    const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart()

    // 3.3. State
    const [activeIndex, setActiveIndex] = useState(0)
    const [isMuted, setIsMuted] = useState(true)
    const [showComments, setShowComments] = useState(false)
    const [commentVideo, setCommentVideo] = useState<VideoPostDto | null>(null)
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280)

    const containerRef = useRef<HTMLDivElement>(null)
    const recordedVideoIdsRef = useRef<Set<string>>(new Set())
    const scrolledToTargetRef = useRef(false)

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

    // Smooth scroll to video index
    const scrollToIndex = useCallback((idx: number) => {
        const container = containerRef.current
        if (!container) return
        const item = container.querySelector(`[data-post-index="${idx}"]`) as HTMLElement
        item?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [])

    // IntersectionObserver để theo dõi video nào đang hiển thị trong viewport (chuẩn timmyhub gốc)
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

    // Lắng nghe Keyboard (Mũi tên Lên/Xuống & Escape) giống timmyhub gốc
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
                if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back()
                } else {
                    router.push(ROUTE.HOME)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeIndex, videos.length, scrollToIndex, router])

    // 3.4. Action Handlers
    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            router.push(ROUTE.HOME)
        }
    }

    const handleShare = (video: VideoPostDto) => {
        if (typeof window === 'undefined') return
        const shareUrl = `${window.location.origin}${ROUTE.VIDEOS}?id=${encodeURIComponent(video.id)}`
        navigator.clipboard
            ?.writeText(shareUrl)
            .then(() => {
                toast.success('Đã sao chép liên kết video vào bộ nhớ tạm!')
            })
            .catch(() => {
                toast.info('Chia sẻ video!')
            })
    }

    const handleQuickAddToCart = (
        e: React.MouseEvent,
        productId: string,
        productName: string,
        slug?: string,
        variantId?: string,
    ) => {
        e.stopPropagation()
        if (variantId) {
            addToCart(
                { variantId, quantity: 1 },
                {
                    onSuccess: () => {
                        toast.success(`Đã thêm "${productName}" vào giỏ hàng!`)
                    },
                    onError: () => {
                        toast.error('Không thể thêm vào giỏ hàng. Vui lòng thử lại!')
                    },
                },
            )
        } else {
            router.push(ROUTE.PRODUCT_DETAIL(slug || productId))
        }
    }

    // 3.5. Loading & Empty States
    if (isLoading && videos.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
                <div className="space-y-4 text-center">
                    <div className="size-12 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <p className="text-sm font-medium text-white/70">Đang chuẩn bị luồng video chất lượng cao...</p>
                </div>
            </div>
        )
    }

    if (!isLoading && videos.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-4 text-center text-white">
                <p className="text-lg font-bold">Chưa có video bài đăng nào</p>
                <Button asChild className="mt-4 rounded-xl" variant="secondary">
                    <Link href={ROUTE.HOME}>Quay lại trang chủ</Link>
                </Button>
            </div>
        )
    }

    const activeVideoForDrawer = commentVideo ?? videos[activeIndex] ?? null

    // 3.6. Render Fullscreen Layout
    return (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-black select-none">
            {/* ═══════════════════════════════════════════════════════════════
             * TOP NAVIGATION BAR (Tối giản: chỉ có nút Quay lại bên trái & Âm thanh bên phải)
             * Đã bỏ Logo TimmyHub và bỏ Button Trang chủ theo yêu cầu của user
             * ═══════════════════════════════════════════════════════════════ */}
            <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 sm:px-6 py-4 pointer-events-none">
                <div className="pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        className="size-10 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-black/60 hover:scale-105 transition-transform"
                        title="Quay lại (Phím Esc)"
                    >
                        <ArrowLeft className="size-5" />
                    </Button>
                </div>

                <div className="pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMuted((prev) => !prev)}
                        className="size-10 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-black/60 transition-all"
                        title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                    >
                        {isMuted ? (
                            <VolumeX className="size-5 text-red-400" />
                        ) : (
                            <Volume2 className="size-5 text-emerald-400" />
                        )}
                    </Button>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════════
             * VERTICAL SCROLL-SNAP CONTAINER (Chuẩn kiến trúc timmyhub gốc)
             * Cho phép cuộn mượt mà bằng phím lên/xuống, chuột lăn hoặc touch
             * Không chớp hình ảnh do các video đã được render và giữ trong feed
             * ═══════════════════════════════════════════════════════════════ */}
            <div
                ref={containerRef}
                className="size-full overflow-y-scroll snap-y snap-mandatory scrollbar-none bg-black"
                style={{
                    height: '100dvh',
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    scrollbarWidth: 'none',
                }}
            >
                {videos.map((video, idx) => (
                    <div
                        key={video.id}
                        data-post-item
                        data-post-index={idx}
                        className="relative size-full snap-start snap-always shrink-0 overflow-hidden bg-black flex items-center justify-center"
                        style={{
                            height: '100dvh',
                            scrollSnapAlign: 'start',
                            scrollSnapStop: 'always',
                        }}
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

            {/* ═══════════════════════════════════════════════════════════════
             * COMMENT DRAWER (Bình luận trượt vào từ cạnh phải giống timmyhub gốc)
             * ═══════════════════════════════════════════════════════════════ */}
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
