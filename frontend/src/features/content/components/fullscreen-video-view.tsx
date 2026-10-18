'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Eye,
    Heart,
    Home,
    MessageCircle,
    Share2,
    ShoppingBag,
    Sparkles,
    Volume2,
    VolumeX,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useAddToCart } from '@/hooks'
import { cn } from '@/utils'

import { useVideoFeed } from '../hooks/use-video-feed'
import { HlsVideoPlayer } from './hls-video-player'
import { VideoCommentDrawer } from './video-comment-drawer'

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const SCROLL_COOLDOWN_MS = 600

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
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
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
    const [isHeartAnimating, setIsHeartAnimating] = useState(false)
    const [isMuted, setIsMuted] = useState(true)
    const [showComments, setShowComments] = useState(false)
    const [selectedProductIndex, setSelectedProductIndex] = useState(0)

    const lastScrollTimeRef = useRef(0)
    const recordedVideoIdsRef = useRef<Set<string>>(new Set())
    const recordViewRef = useRef(recordView)

    useEffect(() => {
        recordViewRef.current = recordView
    })

    // Tính toán index video hiện tại
    const currentTargetId = activeVideoId ?? initialIdFromUrl ?? videos[0]?.id
    const targetIdx = videos.findIndex((v) => v.id === currentTargetId)
    const currentIndex = targetIdx !== -1 ? targetIdx : 0
    const currentVideo = videos[currentIndex]
    const currentVideoId = currentVideo?.id

    // Cập nhật URL query params khi chuyển video mà không làm reload trang
    useEffect(() => {
        if (currentVideoId && initialIdFromUrl !== currentVideoId) {
            const params = new URLSearchParams(searchParams.toString())
            params.set('id', currentVideoId)
            router.replace(`${ROUTE.VIDEOS}?${params.toString()}`, { scroll: false })
        }
    }, [currentVideoId, initialIdFromUrl, router, searchParams])

    // Ghi nhận lượt xem video
    useEffect(() => {
        if (currentVideoId && !recordedVideoIdsRef.current.has(currentVideoId)) {
            recordedVideoIdsRef.current.add(currentVideoId)
            recordViewRef.current?.(currentVideoId)
        }
    }, [currentVideoId])

    // 3.4. Navigation Handlers
    const goToNextVideo = useCallback(() => {
        if (videos.length === 0) return
        const nextIndex = (currentIndex + 1) % videos.length
        setActiveVideoId(videos[nextIndex]?.id ?? null)
        setSelectedProductIndex(0)
    }, [currentIndex, videos])

    const goToPrevVideo = useCallback(() => {
        if (videos.length === 0) return
        const prevIndex = (currentIndex - 1 + videos.length) % videos.length
        setActiveVideoId(videos[prevIndex]?.id ?? null)
        setSelectedProductIndex(0)
    }, [currentIndex, videos])

    // Lắng nghe Keyboard (Mũi tên Lên/Xuống) và Wheel (Con lăn chuột)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                goToNextVideo()
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                goToPrevVideo()
            } else if (e.key === 'Escape') {
                e.preventDefault()
                router.push(ROUTE.HOME)
            }
        }

        const handleWheel = (e: WheelEvent) => {
            const now = Date.now()
            if (now - lastScrollTimeRef.current < SCROLL_COOLDOWN_MS) return

            if (e.deltaY > 40) {
                lastScrollTimeRef.current = now
                goToNextVideo()
            } else if (e.deltaY < -40) {
                lastScrollTimeRef.current = now
                goToPrevVideo()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('wheel', handleWheel, { passive: true })

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('wheel', handleWheel)
        }
    }, [goToNextVideo, goToPrevVideo, router])

    // 3.5. Action Handlers
    const handleLike = () => {
        if (!currentVideo) return
        setIsHeartAnimating(true)
        setTimeout(() => setIsHeartAnimating(false), 500)
        toggleLike(currentVideo.id)
    }

    const handleShare = () => {
        if (!currentVideo || typeof window === 'undefined') return
        const shareUrl = `${window.location.origin}${ROUTE.VIDEOS}?id=${encodeURIComponent(currentVideo.id)}`
        navigator.clipboard
            ?.writeText(shareUrl)
            .then(() => {
                toast.success('Đã sao chép liên kết video vào bộ nhớ tạm!')
            })
            .catch(() => {
                toast.info('Chia sẻ video!')
            })
    }

    const handleQuickAddToCart = (e: React.MouseEvent, productId: string, productName: string, slug?: string) => {
        e.stopPropagation()
        const targetTag = taggedProducts[selectedProductIndex]
        if (targetTag?.variantId) {
            addToCart(
                { variantId: targetTag.variantId, quantity: 1 },
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
            // Nếu sản phẩm có nhiều biến thể hoặc chưa chọn variantId, mở trang chi tiết sản phẩm
            router.push(ROUTE.PRODUCT_DETAIL(slug || productId))
        }
    }

    // 3.6. Loading state
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

    if (!currentVideo) {
        return null
    }

    const taggedProducts = currentVideo.productTags || []
    const currentProduct = taggedProducts[selectedProductIndex]?.product

    // 3.7. Render Fullscreen Layout
    return (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-black select-none">
            {/* ═══════════════════════════════════════════════════════════════
             * TOP NAVIGATION BAR (Glassmorphism Header)
             * ═══════════════════════════════════════════════════════════════ */}
            <header className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(ROUTE.HOME)}
                        className="size-10 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:scale-105 transition-transform"
                        title="Quay lại trang chủ (Phím Esc)"
                    >
                        <ArrowLeft className="size-5" />
                    </Button>

                    <div className="hidden sm:flex items-center gap-2">
                        <Link
                            href={ROUTE.HOME}
                            className="flex items-center gap-2 text-white font-black text-lg tracking-tight hover:text-emerald-400 transition-colors"
                        >
                            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-black font-black text-sm">
                                T
                            </span>
                            TimmyHub
                        </Link>
                        <Badge
                            variant="secondary"
                            className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full"
                        >
                            <Sparkles className="size-3 mr-1 inline" />
                            Shoppable Video Feed
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMuted((prev) => !prev)}
                        className="size-10 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all"
                        title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                    >
                        {isMuted ? (
                            <VolumeX className="size-5 text-red-400" />
                        ) : (
                            <Volume2 className="size-5 text-emerald-400" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-full bg-white/10 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 gap-1.5 px-3.5 h-10"
                    >
                        <Link href={ROUTE.HOME}>
                            <Home className="size-4" />
                            <span className="hidden sm:inline">Trang chủ</span>
                        </Link>
                    </Button>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════════
             * MAIN VIDEO CANVAS: Căn giữa màn hình chuẩn tỉ lệ dọc TikTok/Reels
             * ═══════════════════════════════════════════════════════════════ */}
            <main className="relative flex flex-1 items-center justify-center w-full h-full overflow-hidden">
                <div className="relative h-full w-full max-w-[480px] md:max-w-[420px] lg:max-w-[440px] flex items-center justify-center bg-neutral-950 md:rounded-3xl overflow-hidden shadow-2xl md:border md:border-white/10">
                    {/* Trình phát HLS Video Player thích ứng */}
                    <HlsVideoPlayer
                        key={currentVideo.id}
                        src={currentVideo.videoUrl}
                        poster={currentVideo.thumbnailUrl ?? undefined}
                        muted={isMuted}
                        onEnded={goToNextVideo}
                        autoPlay
                    />

                    {/* Gradient shadow overlay phía dưới */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

                    {/* Heart splash animation khi bấm Like */}
                    {isHeartAnimating && (
                        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                            <Heart className="size-28 fill-red-500 text-red-500 drop-shadow-2xl animate-ping" />
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                     * BOTTOM LEFT: SHOPPABLE PRODUCT TAG & CAPTION METADATA
                     * ═══════════════════════════════════════════════════════════ */}
                    <div className="absolute bottom-5 inset-x-4 z-20 space-y-3 pointer-events-auto">
                        {/* Thông tin Shop & Creator */}
                        <div className="flex items-center gap-2.5">
                            <Avatar className="size-10 ring-2 ring-emerald-500 shadow-md">
                                {currentVideo.shopLogo && (
                                    <AvatarImage src={currentVideo.shopLogo} alt={currentVideo.shopName} />
                                )}
                                <AvatarFallback className="bg-emerald-950 text-emerald-300 font-bold text-xs">
                                    {currentVideo.shopName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm text-white drop-shadow truncate">
                                        {currentVideo.shopName}
                                    </span>
                                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                                </div>
                                <span className="text-[11px] text-white/70">Shop chính hãng trên TimmyHub</span>
                            </div>
                        </div>

                        {/* Tiêu đề & Caption */}
                        <div className="space-y-1">
                            <h1 className="font-bold text-sm sm:text-base text-white leading-snug drop-shadow line-clamp-2">
                                {currentVideo.title}
                            </h1>
                            {currentVideo.content && (
                                <p className="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow">
                                    {currentVideo.content}
                                </p>
                            )}
                            {currentVideo.hashtags && currentVideo.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {currentVideo.hashtags.map((tag) => (
                                        <span key={tag} className="text-xs font-semibold text-emerald-400 drop-shadow">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ═══════════════════════════════════════════════════════
                         * SHOPPABLE FLOATING CARD (Sản phẩm gắn kèm)
                         * ═══════════════════════════════════════════════════════ */}
                        {currentProduct && (
                            <Card className="rounded-2xl border border-white/20 bg-black/60 backdrop-blur-md p-2.5 shadow-xl transition-all duration-300">
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
                                                handleQuickAddToCart(
                                                    e,
                                                    currentProduct.id,
                                                    currentProduct.name,
                                                    currentProduct.slug,
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

                                {/* Indicator nếu video có nhiều hơn 1 sản phẩm */}
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
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                 * RIGHT FLOATING ACTIONS STACK: Tương tác kiểu TikTok / Reels
                 * ═══════════════════════════════════════════════════════════════ */}
                <aside className="absolute right-3 sm:right-6 md:right-8 lg:right-12 bottom-20 sm:bottom-28 z-30 flex flex-col items-center gap-4 pointer-events-auto">
                    {/* Like button */}
                    <div className="flex flex-col items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLike}
                            className={cn(
                                'size-12 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 hover:scale-110 active:scale-95 transition-all shadow-lg',
                                currentVideo.isLiked && 'text-red-500 bg-red-500/20 border-red-500/40',
                            )}
                            title="Thích video"
                        >
                            <Heart
                                className={cn(
                                    'size-6 transition-transform',
                                    currentVideo.isLiked && 'fill-red-500 text-red-500 scale-110',
                                )}
                            />
                        </Button>
                        <span className="text-[11px] font-bold text-white drop-shadow font-mono">
                            {currentVideo.likeCount.toLocaleString('vi-VN')}
                        </span>
                    </div>

                    {/* Comments */}
                    <div className="flex flex-col items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowComments((prev) => !prev)}
                            className={cn(
                                'size-12 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 hover:scale-110 active:scale-95 transition-all shadow-lg',
                                showComments && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                            )}
                            title="Bình luận video"
                        >
                            <MessageCircle className="size-6" />
                        </Button>
                        <span className="text-[11px] font-bold text-white drop-shadow font-mono">
                            {currentVideo.commentCount}
                        </span>
                    </div>

                    {/* Share */}
                    <div className="flex flex-col items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleShare}
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
                        <span className="text-[10px] font-medium text-white/70 font-mono">
                            {currentVideo.viewCount}
                        </span>
                    </div>

                    {/* Next & Previous Video Arrows */}
                    <div className="hidden sm:flex flex-col items-center gap-2 pt-2 border-t border-white/10">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPrevVideo}
                            className="size-9 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70"
                            title="Video trước (Mũi tên lên)"
                        >
                            <ChevronUp className="size-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNextVideo}
                            className="size-9 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70"
                            title="Video tiếp theo (Mũi tên xuống)"
                        >
                            <ChevronDown className="size-5" />
                        </Button>
                    </div>
                </aside>

                {/* ═══════════════════════════════════════════════════════════
                 * COMMENT DRAWER (Bình luận trượt vào từ cạnh phải giống timmyhub gốc)
                 * ═══════════════════════════════════════════════════════════ */}
                <VideoCommentDrawer video={currentVideo} isOpen={showComments} onClose={() => setShowComments(false)} />
            </main>
        </div>
    )
}
