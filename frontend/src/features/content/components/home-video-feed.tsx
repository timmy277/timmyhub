'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
    CheckCircle2,
    ChevronRight,
    Eye,
    Heart,
    MessageCircle,
    Play,
    Share2,
    ShoppingBag,
    Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, Skeleton } from '@/components/ui'
import { ROUTE } from '@/constants'
import { cn } from '@/utils'

import { useVideoFeed } from '../hooks/use-video-feed'

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONSTANTS & ACCENT PALETTES
// ═══════════════════════════════════════════════════════════════════════════
const ACCENT_GRADIENTS = [
    'from-emerald-500/25 via-teal-500/15 to-emerald-900/40',
    'from-purple-500/25 via-pink-500/15 to-purple-900/40',
    'from-amber-500/25 via-orange-500/15 to-amber-900/40',
    'from-blue-500/25 via-cyan-500/15 to-blue-900/40',
]

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function HomeVideoFeed() {
    // 3.1. State & Routing Hooks
    const router = useRouter()
    const { videos, isLoading, toggleLike } = useVideoFeed({ limit: 3 })
    const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({})

    // 3.2. Handlers: Điều hướng trực tiếp sang trang xem video full màn hình
    const handleOpenVideo = (videoId?: string) => {
        if (videoId) {
            router.push(ROUTE.VIDEO_DETAIL(videoId))
        } else {
            router.push(ROUTE.VIDEOS)
        }
    }

    const handleShare = (e: React.MouseEvent, postId: string, title: string) => {
        e.stopPropagation()
        if (typeof window !== 'undefined') {
            const shareUrl = `${window.location.origin}${ROUTE.VIDEO_DETAIL(postId)}`
            navigator.clipboard?.writeText(shareUrl)
            toast.success(`Đã sao chép liên kết video: "${title}"`)
        }
    }

    const handleLikeClick = (e: React.MouseEvent, postId: string) => {
        e.stopPropagation()
        toggleLike(postId)
    }

    const handleThumbnailError = (postId: string) => {
        setFailedThumbnails((prev) => ({ ...prev, [postId]: true }))
    }

    // 3.3. Loading Skeletons
    if (isLoading && videos.length === 0) {
        return (
            <section aria-labelledby="posts-heading" className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                        <Skeleton className="size-7 rounded-lg" />
                        <Skeleton className="h-6 w-56" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="overflow-hidden rounded-2xl border border-border/70 p-0">
                            <Skeleton className="h-44 w-full" />
                            <div className="p-4 space-y-3">
                                <div className="flex items-center gap-2.5">
                                    <Skeleton className="size-8 rounded-full" />
                                    <div className="space-y-1 flex-1">
                                        <Skeleton className="h-3 w-28" />
                                        <Skeleton className="h-2.5 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                            </div>
                        </Card>
                    ))}
                </div>
            </section>
        )
    }

    // Nếu không có video bài đăng nào
    if (!isLoading && videos.length === 0) {
        return null
    }

    // 3.4. JSX Return
    return (
        <section aria-labelledby="posts-heading" className="space-y-4">
            {/* ═══════════════════════════════════════════════════════════════════
             * HEADER SECTION: VIDEO & BÀI VIẾT CỘNG ĐỒNG SÁNG TẠO
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Play className="size-4 fill-primary" />
                    </div>
                    <div>
                        <h2
                            id="posts-heading"
                            className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2"
                        >
                            <span>Video & Bài viết cộng đồng</span>
                            <Sparkles className="size-4 text-primary animate-pulse" />
                        </h2>
                    </div>
                </div>
                <Button
                    onClick={() => handleOpenVideo()}
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    variant="ghost"
                >
                    Xem tất cả
                    <ChevronRight className="size-3.5" />
                </Button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * GRID 3 VIDEO NGẪU NHIÊN CÓ THẬT TỪ DATABASE
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {videos.map((post, idx) => {
                    const primaryProduct = post.productTags[0]?.product
                    const accentGradient = ACCENT_GRADIENTS[idx % ACCENT_GRADIENTS.length]
                    const isThumbFailed = failedThumbnails[post.id]

                    return (
                        <Card
                            key={post.id}
                            onClick={() => handleOpenVideo(post.id)}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 cursor-pointer p-0"
                        >
                            {/* Video Thumbnail với gradient background rực rỡ, không bao giờ đen sì */}
                            <div
                                className={cn(
                                    'relative h-48 w-full bg-gradient-to-br flex items-center justify-center overflow-hidden border-b border-border/50',
                                    accentGradient,
                                )}
                            >
                                {post.thumbnailUrl && !isThumbFailed ? (
                                    <Image
                                        src={post.thumbnailUrl}
                                        alt={post.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        unoptimized
                                        onError={() => handleThumbnailError(post.id)}
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : !post.videoUrl.includes('.m3u8') ? (
                                    <video
                                        src={post.videoUrl.includes('#t=') ? post.videoUrl : `${post.videoUrl}#t=0.001`}
                                        preload="metadata"
                                        playsInline
                                        muted
                                        onError={() => handleThumbnailError(post.id)}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                                    />
                                ) : null}

                                {/* Overlay gradient mềm mượt */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:via-black/10 transition-colors" />

                                {/* Play button icon hiệu ứng nổi bật */}
                                <div className="relative flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/95">
                                    <Play className="size-5 fill-current ml-0.5 text-primary-foreground" />
                                </div>

                                {/* Badge thời lượng / HLS Adaptive */}
                                <Badge
                                    variant="secondary"
                                    className="absolute bottom-2.5 right-2.5 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] font-bold text-white border border-white/10 backdrop-blur-sm"
                                >
                                    {post.videoDuration || 'HLS HD'}
                                </Badge>

                                {/* Badge lượt xem */}
                                <Badge
                                    variant="secondary"
                                    className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white border border-white/10 backdrop-blur-sm shadow-sm"
                                >
                                    <Eye className="size-3 text-emerald-400" />
                                    {post.viewCount.toLocaleString('vi-VN')} lượt xem
                                </Badge>
                            </div>

                            {/* Card Content & Metadata */}
                            <div className="flex flex-1 flex-col p-4 space-y-3">
                                {/* Creator Info */}
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="size-8 ring-1 ring-primary/40 shadow-sm">
                                        {post.shopLogo && <AvatarImage src={post.shopLogo} alt={post.shopName} />}
                                        <AvatarFallback className="bg-primary/10 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                                            {post.shopName.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            <p className="font-bold text-xs text-foreground truncate">
                                                {post.shopName}
                                            </p>
                                            <CheckCircle2 className="size-3 text-primary shrink-0" />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Shop chính hãng</p>
                                    </div>
                                </div>

                                {/* Post Title & Content */}
                                <h3 className="line-clamp-2 text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                                    {post.title}
                                </h3>
                                {post.content && (
                                    <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                        {post.content}
                                    </p>
                                )}

                                {/* Tagged Shoppable Product Link */}
                                {primaryProduct ? (
                                    <div className="mt-auto rounded-xl bg-muted/60 p-2.5 border border-border/70 flex items-center gap-2.5 text-xs transition-colors group-hover:border-primary/30">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                            <ShoppingBag className="size-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-foreground text-[11px]">
                                                {primaryProduct.name}
                                            </p>
                                            <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-xs">
                                                {primaryProduct.price.toLocaleString('vi-VN')} đ
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-auto rounded-xl bg-muted/40 p-2 border border-border/40 text-[11px] text-muted-foreground italic text-center">
                                        Video đánh giá sản phẩm
                                    </div>
                                )}

                                {/* Engagement Counters */}
                                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleLikeClick(e, post.id)}
                                        className={cn(
                                            'h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-primary',
                                            post.isLiked && 'text-red-500 font-bold hover:text-red-600',
                                        )}
                                    >
                                        <Heart
                                            className={cn('size-3.5', post.isLiked && 'fill-red-500 text-red-500')}
                                        />
                                        <span>{post.likeCount.toLocaleString('vi-VN')}</span>
                                    </Button>

                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MessageCircle className="size-3.5" />
                                        <span>{post.commentCount}</span>
                                    </span>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleShare(e, post.id, post.title)}
                                        className="h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-primary"
                                    >
                                        <Share2 className="size-3.5" />
                                        <span>Chia sẻ</span>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </section>
    )
}
