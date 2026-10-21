'use client'

import React from 'react'
import Image from 'next/image'
import { CheckCircle2, Eye, Heart, MessageCircle, Share2, ShoppingBag } from 'lucide-react'
import type { VideoPostDto } from '@timmyhub/contracts'

import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card } from '@/components/ui'
import { cn } from '@/utils'

export const ACCENT_GRADIENTS = [
    'from-emerald-500/25 via-teal-500/15 to-emerald-900/40',
    'from-purple-500/25 via-pink-500/15 to-purple-900/40',
    'from-amber-500/25 via-orange-500/15 to-amber-900/40',
    'from-blue-500/25 via-cyan-500/15 to-blue-900/40',
]

interface HomeVideoCardProps {
    post: VideoPostDto
    index: number
    isThumbFailed: boolean
    onOpen: (id: string) => void
    onLike: (e: React.MouseEvent, id: string) => void
    onShare: (e: React.MouseEvent, id: string, title: string) => void
    onThumbError: (id: string) => void
}

export function HomeVideoCard({
    post,
    index,
    isThumbFailed,
    onOpen,
    onLike,
    onShare,
    onThumbError,
}: HomeVideoCardProps) {
    const primaryProduct = post.productTags[0]?.product
    const accentGradient = ACCENT_GRADIENTS[index % ACCENT_GRADIENTS.length]

    return (
        <Card
            onClick={() => onOpen(post.id)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 cursor-pointer p-0"
        >
            {/* Video Thumbnail không còn icon play ở giữa theo yêu cầu */}
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
                        loading="lazy"
                        onError={() => onThumbError(post.id)}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : !post.videoUrl.includes('.m3u8') ? (
                    <video
                        src={post.videoUrl.includes('#t=') ? post.videoUrl : `${post.videoUrl}#t=0.001`}
                        preload="none"
                        playsInline
                        muted
                        onError={() => onThumbError(post.id)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                    />
                ) : null}

                {/* Overlay gradient nhẹ nhàng */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-black/70 transition-colors" />

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
                            <p className="font-bold text-xs text-foreground truncate">{post.shopName}</p>
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
                    <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{post.content}</p>
                )}

                {/* Tagged Shoppable Product Link */}
                {primaryProduct ? (
                    <div className="mt-auto rounded-xl bg-muted/60 p-2.5 border border-border/70 flex items-center gap-2.5 text-xs transition-colors group-hover:border-primary/30">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <ShoppingBag className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground text-[11px]">{primaryProduct.name}</p>
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
                        onClick={(e) => onLike(e, post.id)}
                        className={cn(
                            'h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-primary',
                            post.isLiked && 'text-red-500 font-bold hover:text-red-600',
                        )}
                    >
                        <Heart className={cn('size-3.5', post.isLiked && 'fill-red-500 text-red-500')} />
                        <span>{post.likeCount.toLocaleString('vi-VN')}</span>
                    </Button>

                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="size-3.5" />
                        <span>{post.commentCount}</span>
                    </span>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => onShare(e, post.id, post.title)}
                        className="h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-primary"
                    >
                        <Share2 className="size-3.5" />
                        <span>Chia sẻ</span>
                    </Button>
                </div>
            </div>
        </Card>
    )
}
