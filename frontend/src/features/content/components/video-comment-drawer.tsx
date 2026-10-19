'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { VideoPostDto } from '@timmyhub/contracts'
import { MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useSession } from 'next-auth/react'

import { Avatar, AvatarFallback, AvatarImage, Button, Input, ScrollArea } from '@/components/ui'
import { cn } from '@/utils'

import { useVideoComments } from '../hooks/use-video-comments'
import { CommentItemCard } from './comment-item-card'

interface VideoCommentDrawerProps {
    video: VideoPostDto
    isOpen: boolean
    onClose: () => void
}

export function VideoCommentDrawer({ video, isOpen, onClose }: VideoCommentDrawerProps) {
    // 1. Auth & Data Hooks
    const { data: session } = useSession()
    const user = session?.user
    const isAuthenticated = Boolean(user?.id)
    const { comments, isLoading, addComment, isAddingComment } = useVideoComments({
        postId: video.id,
        enabled: isOpen,
    })

    // 2. State & Refs
    const [inputValue, setInputValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const scrollBottomRef = useRef<HTMLDivElement>(null)

    // Focus input khi mở
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus()
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    // Cuộn xuống comment mới nhất khi danh sách thay đổi
    useEffect(() => {
        if (comments.length > 0) {
            scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [comments.length])

    // 3. Handlers
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!inputValue.trim() || isAddingComment) return
        addComment(inputValue)
        setInputValue('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const totalComments = comments.length > 0 ? comments.length : video.commentCount

    return (
        <aside
            aria-label="Khung bình luận video"
            className={cn(
                'absolute inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[380px] md:w-[420px] bg-background/95 backdrop-blur-2xl border-l border-border/80 shadow-2xl transition-transform duration-300 ease-out select-text pointer-events-auto',
                isOpen ? 'translate-x-0' : 'translate-x-full',
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/70">
                <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-emerald-500" />
                    <h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <span>Bình luận</span>
                        <span className="text-muted-foreground font-mono text-xs">({totalComments})</span>
                    </h2>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                    title="Đóng (Esc)"
                >
                    <X className="size-4" />
                </Button>
            </div>

            {/* Shop & Video Header Banner */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b border-border/60">
                <Avatar className="size-8 ring-1 ring-border shrink-0">
                    {video.shopLogo && <AvatarImage src={video.shopLogo} alt={video.shopName} />}
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {video.shopName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{video.shopName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{video.title}</p>
                </div>
            </div>

            {/* Comments List */}
            <ScrollArea className="flex-1 p-4">
                {isLoading && comments.length === 0 ? (
                    <div className="space-y-4 py-12 text-center text-xs text-muted-foreground">
                        <div className="size-6 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        <p>Đang tải bình luận...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 text-muted-foreground">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 border border-border/60 text-muted-foreground">
                            <Sparkles className="size-6 text-emerald-500/80 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">Chưa có bình luận nào</p>
                            <p className="text-xs max-w-xs text-muted-foreground">
                                Hãy là người đầu tiên để lại cảm nghĩ về video này!
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <CommentItemCard key={comment.id} comment={comment} />
                        ))}
                        <div ref={scrollBottomRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Input Bar */}
            <div className="p-3 border-t border-border/80 bg-background/90 backdrop-blur-md">
                {isAuthenticated ? (
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <Avatar className="size-8 shrink-0 ring-1 ring-border">
                            {user?.image && <AvatarImage src={user.image} alt="Avatar" />}
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="relative flex-1">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Viết bình luận của bạn..."
                                disabled={isAddingComment}
                                maxLength={500}
                                className="h-9 pr-9 text-xs rounded-xl bg-muted/50 border-border/80 focus-visible:ring-emerald-500"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                variant="ghost"
                                disabled={!inputValue.trim() || isAddingComment}
                                className="absolute right-1 top-1 size-7 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
                                title="Gửi bình luận (Enter)"
                            >
                                <Send className="size-3.5" />
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="py-2 text-center bg-muted/30 rounded-xl border border-border/50">
                        <p className="text-xs text-muted-foreground">Vui lòng đăng nhập để tham gia bình luận video.</p>
                    </div>
                )}
            </div>
        </aside>
    )
}
