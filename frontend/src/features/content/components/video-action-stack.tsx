'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Eye, Heart, MessageCircle, Share2 } from 'lucide-react'

import type { VideoPostDto } from '@timmyhub/contracts'

import { Button } from '@/components/ui'
import { cn } from '@/utils'

interface VideoActionStackProps {
    video: VideoPostDto
    onLike: () => void
    onOpenComments: () => void
    onShare: () => void
    onNext: () => void
    onPrev: () => void
    hasPrev: boolean
    hasNext: boolean
    style?: React.CSSProperties
}

export function VideoActionStack({
    video,
    onLike,
    onOpenComments,
    onShare,
    onNext,
    onPrev,
    hasPrev,
    hasNext,
    style,
}: VideoActionStackProps) {
    // ===== Hooks =====
    const t = useTranslations('content')

    return (
        <aside
            className="absolute right-3 sm:right-6 md:right-8 lg:right-12 bottom-20 sm:bottom-28 z-30 flex flex-col items-center gap-4 pointer-events-auto transition-all duration-300"
            style={style}
        >
            {/* Nút Thích (Like) */}
            <div className="flex flex-col items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onLike}
                    className={cn(
                        'size-12 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 hover:scale-110 active:scale-95 transition-all shadow-lg',
                        video.isLiked && 'text-red-500 bg-red-500/20 border-red-500/40',
                    )}
                    title={t('like')}
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

            {/* Nút Bình luận (Comments) */}
            <div className="flex flex-col items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenComments}
                    className="size-12 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 hover:scale-110 active:scale-95 transition-all shadow-lg"
                    title={t('comments')}
                >
                    <MessageCircle className="size-6" />
                </Button>
                <span className="text-[11px] font-bold text-white drop-shadow font-mono">{video.commentCount}</span>
            </div>

            {/* Nút Chia sẻ (Share) */}
            <div className="flex flex-col items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onShare}
                    className="size-12 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 hover:scale-110 transition-all shadow-lg"
                    title={t('share')}
                >
                    <Share2 className="size-6" />
                </Button>
                <span className="text-[11px] font-medium text-white/80 drop-shadow">{t('share')}</span>
            </div>

            {/* Lượt xem (View count) */}
            <div className="flex flex-col items-center gap-1">
                <div className="flex size-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md border border-white/10">
                    <Eye className="size-4" />
                </div>
                <span className="text-[10px] font-medium text-white/70 font-mono">{video.viewCount}</span>
            </div>

            {/* Mũi tên chuyển Video Lên/Xuống trên desktop */}
            <div className="hidden sm:flex flex-col items-center gap-2 pt-2 border-t border-white/10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPrev}
                    disabled={!hasPrev}
                    className="size-9 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 disabled:opacity-30 disabled:pointer-events-none"
                    title={t('prevVideo')}
                >
                    <ChevronUp className="size-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onNext}
                    disabled={!hasNext}
                    className="size-9 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 disabled:opacity-30 disabled:pointer-events-none"
                    title={t('nextVideo')}
                >
                    <ChevronDown className="size-5" />
                </Button>
            </div>
        </aside>
    )
}
