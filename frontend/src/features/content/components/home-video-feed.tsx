'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Sparkles, Video } from 'lucide-react'
import { toast } from 'sonner'

import type { VideoFeedResponseDto } from '@timmyhub/contracts'

import { Button, Card, Skeleton } from '@/components/ui'
import { ROUTE } from '@/constants'

import { useVideoFeed } from '../hooks/use-video-feed'
import { HomeVideoCard } from './home-video-card'

interface HomeVideoFeedProps {
    initialData?: VideoFeedResponseDto
}

export function HomeVideoFeed({ initialData }: HomeVideoFeedProps = {}) {
    // 1. Hooks & State
    const router = useRouter()
    const { videos, isLoading, toggleLike } = useVideoFeed({
        limit: 3,
        random: true,
        initialData,
    })
    const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({})

    // 2. Handlers
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

    // 3. Loading Skeletons
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

    if (!isLoading && videos.length === 0) {
        return null
    }

    return (
        <section aria-labelledby="posts-heading" className="space-y-4">
            {/* Header: Video & Bài viết cộng đồng */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Video className="size-4 text-primary" />
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

            {/* Video Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {videos.map((post, idx) => (
                    <HomeVideoCard
                        key={post.id}
                        post={post}
                        index={idx}
                        isThumbFailed={Boolean(failedThumbnails[post.id])}
                        onOpen={handleOpenVideo}
                        onLike={handleLikeClick}
                        onShare={handleShare}
                        onThumbError={handleThumbnailError}
                    />
                ))}
            </div>
        </section>
    )
}
