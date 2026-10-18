'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { VideoPostDto } from '@timmyhub/contracts'
import { CheckCircle2, ChevronDown, ChevronUp, Eye, Heart, MessageCircle, Share2, ShoppingBag, X } from 'lucide-react'
import { toast } from 'sonner'

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    Card,
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui'
import { useAddToCart } from '@/hooks'
import { cn } from '@/utils'

import { HlsVideoPlayer } from './hls-video-player'

// ═══════════════════════════════════════════════════════════════════════════
// 2. TYPES / INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
export interface ShoppableVideoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialPostId?: string
    videos: VideoPostDto[]
    onToggleLike?: (postId: string) => void
    onRecordView?: (postId: string) => void
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const SCROLL_COOLDOWN_MS = 600

// ═══════════════════════════════════════════════════════════════════════════
// 4. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function ShoppableVideoModal({
    open,
    onOpenChange,
    initialPostId,
    videos,
    onToggleLike,
    onRecordView,
}: ShoppableVideoModalProps) {
    // 4.1. Props & State (Không dùng setState trong Effect)
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
    const [isHeartAnimating, setIsHeartAnimating] = useState(false)
    const [lastScrollTime, setLastScrollTime] = useState(0)
    const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart()

    // Tính toán index hiện tại dựa vào activeVideoId hoặc initialPostId
    const currentTargetId = activeVideoId ?? initialPostId ?? videos[0]?.id
    const targetIdx = videos.findIndex((v) => v.id === currentTargetId)
    const currentIndex = targetIdx !== -1 ? targetIdx : 0
    const currentVideo = videos[currentIndex]

    // 4.2. Effects
    // Ghi nhận lượt xem video khi mở modal hoặc chuyển video
    useEffect(() => {
        if (open && currentVideo) {
            onRecordView?.(currentVideo.id)
        }
    }, [open, currentVideo, onRecordView])

    // Reset activeVideoId khi đóng modal
    const handleModalOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setActiveVideoId(null)
        }
        onOpenChange(newOpen)
    }

    // 4.3. Navigation Handlers
    const goToNextVideo = useCallback(() => {
        if (videos.length === 0) return
        const nextIndex = (currentIndex + 1) % videos.length
        setActiveVideoId(videos[nextIndex]?.id ?? null)
    }, [currentIndex, videos])

    const goToPrevVideo = useCallback(() => {
        if (videos.length === 0) return
        const prevIndex = (currentIndex - 1 + videos.length) % videos.length
        setActiveVideoId(videos[prevIndex]?.id ?? null)
    }, [currentIndex, videos])

    // Lắng nghe con lăn chuột (Wheel) và phím mũi tên Lên/Xuống
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                goToNextVideo()
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                goToPrevVideo()
            }
        }

        const handleWheel = (e: WheelEvent) => {
            const now = Date.now()
            if (now - lastScrollTime < SCROLL_COOLDOWN_MS) return

            if (e.deltaY > 50) {
                setLastScrollTime(now)
                goToNextVideo()
            } else if (e.deltaY < -50) {
                setLastScrollTime(now)
                goToPrevVideo()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('wheel', handleWheel, { passive: true })

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('wheel', handleWheel)
        }
    }, [open, lastScrollTime, goToNextVideo, goToPrevVideo])

    // 4.4. Action Handlers
    const handleLike = () => {
        if (!currentVideo) return
        setIsHeartAnimating(true)
        setTimeout(() => setIsHeartAnimating(false), 500)
        onToggleLike?.(currentVideo.id)
    }

    const handleShare = () => {
        if (!currentVideo) return
        const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/#video-${currentVideo.id}` : ''
        navigator.clipboard
            ?.writeText(shareUrl)
            .then(() => {
                toast.success('Đã sao chép liên kết video vào bộ nhớ tạm!')
            })
            .catch(() => {
                toast.info('Chia sẻ video!')
            })
    }

    const handleAddToCart = (productId: string, variantId?: string | null) => {
        addToCart(
            {
                variantId: variantId ?? 'default-variant',
                quantity: 1,
            },
            {
                onSuccess: () => {
                    toast.success('Đã thêm sản phẩm vào giỏ hàng!')
                },
            },
        )
    }

    if (!currentVideo) return null

    const primaryProduct = currentVideo.productTags[0]?.product

    // 4.5. JSX Return
    return (
        <Dialog open={open} onOpenChange={handleModalOpenChange}>
            <DialogContent className="max-w-4xl p-0 h-[92vh] max-h-[850px] bg-black/95 text-white border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl rounded-2xl">
                <DialogTitle className="sr-only">{currentVideo.title || 'Xem video bán hàng'}</DialogTitle>

                {/* Nút đóng modal góc trên bên phải */}
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleModalOpenChange(false)}
                    className="absolute top-3 right-3 z-50 text-white/80 hover:text-white hover:bg-white/20 rounded-full size-8"
                >
                    <X className="size-5" />
                </Button>

                {/* ═══════════════════════════════════════════════════════════
                 * CỘT TRÁI: VIDEO PLAYER (Vertical TikTok / Reels 9:16 aspect)
                 * ═══════════════════════════════════════════════════════════ */}
                <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden h-full">
                    <HlsVideoPlayer
                        key={currentVideo.id}
                        src={currentVideo.videoUrl}
                        poster={currentVideo.thumbnailUrl}
                        autoPlay={true}
                        loop={true}
                        muted={false}
                        className="w-full h-full aspect-[9/16] max-w-md mx-auto"
                    />

                    {/* Nút chuyển video Lên / Xuống dạng chevrons nổi */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={goToPrevVideo}
                            title="Video trước (Phím mũi tên Lên)"
                            className="size-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 shadow-lg backdrop-blur-sm transition-transform active:scale-90"
                        >
                            <ChevronUp className="size-5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={goToNextVideo}
                            title="Video tiếp theo (Phím mũi tên Xuống)"
                            className="size-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 shadow-lg backdrop-blur-sm transition-transform active:scale-90"
                        >
                            <ChevronDown className="size-5" />
                        </Button>
                    </div>

                    {/* Shoppable Floating Product Card đè góc dưới video trên Mobile */}
                    {primaryProduct && (
                        <div className="absolute bottom-14 left-3 right-16 z-20 md:hidden">
                            <Card className="bg-black/80 backdrop-blur-md border-white/20 p-2.5 flex items-center gap-2.5 rounded-xl shadow-xl">
                                <div className="relative size-11 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                                    {primaryProduct.thumbnailUrl ? (
                                        <Image
                                            src={primaryProduct.thumbnailUrl}
                                            alt={primaryProduct.name}
                                            fill
                                            sizes="44px"
                                            unoptimized
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-primary">
                                            <ShoppingBag className="size-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">{primaryProduct.name}</p>
                                    <p className="text-xs font-extrabold text-emerald-400">
                                        {primaryProduct.price.toLocaleString('vi-VN')} đ
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleAddToCart(primaryProduct.id)}
                                    disabled={isAddingToCart}
                                    className="h-7 px-2.5 text-[11px] font-bold rounded-lg shrink-0"
                                >
                                    Mua ngay
                                </Button>
                            </Card>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                 * CỘT PHẢI: CHI TIẾT NGƯỜI BÁN, TƯƠNG TÁC & SHOPPABLE PRODUCTS
                 * ═══════════════════════════════════════════════════════════ */}
                <div className="w-full md:w-80 lg:w-96 flex flex-col justify-between p-5 bg-neutral-950 border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto">
                    {/* Header: Shop & Creator Profile */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="size-10 ring-2 ring-primary/40 shrink-0">
                                    {currentVideo.shopLogo && <AvatarImage src={currentVideo.shopLogo} />}
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                                        {currentVideo.shopName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-bold text-sm text-white truncate">{currentVideo.shopName}</p>
                                        <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                                    </div>
                                    <p className="text-xs text-neutral-400">Người bán chính thức</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold rounded-full border-white/20 hover:bg-white/10 text-white"
                            >
                                Xem Shop
                            </Button>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2">
                            <h3 className="font-bold text-base text-white leading-snug">{currentVideo.title}</h3>
                            {currentVideo.content && (
                                <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3">
                                    {currentVideo.content}
                                </p>
                            )}

                            {/* Hashtags */}
                            {currentVideo.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {currentVideo.hashtags.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium hover:bg-primary/20 cursor-pointer"
                                        >
                                            #{tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Engagement Stats Bar */}
                        <div className="flex items-center justify-around py-3 px-2 rounded-xl bg-neutral-900/80 border border-white/10 text-xs">
                            {/* Like Button */}
                            <Button
                                variant="ghost"
                                onClick={handleLike}
                                className="flex flex-col items-center gap-1 h-auto py-1 px-2 text-white hover:text-white hover:bg-white/5"
                            >
                                <div
                                    className={cn(
                                        'p-2 rounded-full transition-colors',
                                        currentVideo.isLiked
                                            ? 'bg-red-500/20 text-red-500'
                                            : 'bg-white/10 text-white/80',
                                        isHeartAnimating && 'animate-ping',
                                    )}
                                >
                                    <Heart
                                        className={cn('size-5', currentVideo.isLiked && 'fill-red-500 text-red-500')}
                                    />
                                </div>
                                <span className="font-bold text-[11px]">
                                    {currentVideo.likeCount.toLocaleString('vi-VN')}
                                </span>
                            </Button>

                            {/* Comment Count */}
                            <div className="flex flex-col items-center gap-1 text-white/80 py-1 px-2">
                                <div className="p-2 rounded-full bg-white/10">
                                    <MessageCircle className="size-5" />
                                </div>
                                <span className="font-bold text-[11px]">{currentVideo.commentCount}</span>
                            </div>

                            {/* View Count */}
                            <div className="flex flex-col items-center gap-1 text-white/80 py-1 px-2">
                                <div className="p-2 rounded-full bg-white/10">
                                    <Eye className="size-5" />
                                </div>
                                <span className="font-bold text-[11px]">
                                    {currentVideo.viewCount.toLocaleString('vi-VN')}
                                </span>
                            </div>

                            {/* Share Button */}
                            <Button
                                variant="ghost"
                                onClick={handleShare}
                                className="flex flex-col items-center gap-1 h-auto py-1 px-2 text-white/80 hover:text-white hover:bg-white/5"
                            >
                                <div className="p-2 rounded-full bg-white/10">
                                    <Share2 className="size-5" />
                                </div>
                                <span className="font-bold text-[11px]">Chia sẻ</span>
                            </Button>
                        </div>
                    </div>

                    {/* Shoppable Products Section (Desktop & Tablet) */}
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <ShoppingBag className="size-3.5 text-primary" />
                                Sản phẩm gắn trong video ({currentVideo.productTags.length})
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                            {currentVideo.productTags.map((tag) => {
                                const prod = tag.product
                                return (
                                    <Card
                                        key={tag.id}
                                        className="bg-neutral-900 border-white/10 p-2.5 flex items-center gap-3 rounded-xl hover:border-primary/40 transition-colors"
                                    >
                                        <div className="relative size-12 rounded-lg bg-neutral-800 overflow-hidden shrink-0 border border-white/10">
                                            {prod.thumbnailUrl ? (
                                                <Image
                                                    src={prod.thumbnailUrl}
                                                    alt={prod.name}
                                                    fill
                                                    sizes="48px"
                                                    unoptimized
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-primary">
                                                    <ShoppingBag className="size-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={`/products/${prod.slug}`}
                                                className="block text-xs font-bold text-white hover:text-primary transition-colors truncate"
                                            >
                                                {prod.name}
                                            </Link>
                                            <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                                                {prod.price.toLocaleString('vi-VN')} đ
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddToCart(prod.id, tag.variantId)}
                                            disabled={isAddingToCart}
                                            className="h-8 px-3 text-xs font-bold rounded-lg shrink-0 shadow-md"
                                        >
                                            Thêm giỏ
                                        </Button>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
