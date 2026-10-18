'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react'
import type { VideoPostDto } from '@timmyhub/contracts'
import { MessageCircle, Send, X } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage, Button, Input, ScrollArea } from '@/components/ui'
import { cn } from '@/utils'
import { useSession } from 'next-auth/react'

import { useVideoComments } from '../hooks/use-video-comments'

// ═══════════════════════════════════════════════════════════════════════════
// 2. TYPES / PROPS
// ═══════════════════════════════════════════════════════════════════════════
interface VideoCommentDrawerProps {
    video: VideoPostDto
    isOpen: boolean
    onClose: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function VideoCommentDrawer({ video, isOpen, onClose }: VideoCommentDrawerProps) {
    // 3.1. Auth & Data Hooks
    const { data: session } = useSession()
    const user = session?.user
    const isAuthenticated = Boolean(user?.id)
    const { comments, isLoading, addComment, isAddingComment } = useVideoComments({
        postId: video.id,
        enabled: isOpen,
    })

    // 3.2. State
    const [inputValue, setInputValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const scrollBottomRef = useRef<HTMLDivElement>(null)

    // Tự động focus input khi mở
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 300)
        }
    }, [isOpen])

    // 3.3. Handlers
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

    // 3.4. JSX
    return (
        <aside
            aria-label="Khung bình luận video"
            className={cn(
                'absolute inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[380px] md:w-[400px] bg-background/95 backdrop-blur-xl border-l border-border/80 shadow-2xl transition-transform duration-300 ease-out select-text pointer-events-auto',
                isOpen ? 'translate-x-0' : 'translate-x-full',
            )}
        >
            {/* ═══════════════════════════════════════════════════════════════
             * HEADER
             * ═══════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/70">
                <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-emerald-500" />
                    <h2 className="font-bold text-sm text-foreground">
                        Bình luận <span className="text-muted-foreground font-mono">({totalComments})</span>
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

            {/* ═══════════════════════════════════════════════════════════════
             * SHOP & VIDEO PREVIEW BANNER
             * ═══════════════════════════════════════════════════════════════ */}
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

            {/* ═══════════════════════════════════════════════════════════════
             * COMMENTS SCROLL AREA
             * ═══════════════════════════════════════════════════════════════ */}
            <ScrollArea className="flex-1 p-4">
                {isLoading && comments.length === 0 ? (
                    <div className="space-y-4 py-6 text-center text-xs text-muted-foreground">
                        <div className="size-6 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        <p>Đang tải bình luận...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-muted-foreground">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60">
                            <MessageCircle className="size-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Chưa có bình luận nào</p>
                        <p className="text-xs max-w-xs">Hãy là người đầu tiên để lại cảm nghĩ về video này!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => {
                            const initial = comment.user?.name?.slice(0, 2).toUpperCase() || 'U'
                            const dateStr = new Date(comment.createdAt).toLocaleDateString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                            })

                            return (
                                <div key={comment.id} className="flex gap-2.5 items-start text-xs group">
                                    <Avatar className="size-7 ring-1 ring-border shrink-0 mt-0.5">
                                        {comment.user?.avatar && (
                                            <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                                        )}
                                        <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">
                                            {initial}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground text-xs">
                                                {comment.user?.name || 'Người dùng'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {dateStr}
                                            </span>
                                        </div>
                                        <p className="text-xs text-foreground/90 leading-relaxed break-words bg-muted/30 p-2 rounded-xl border border-border/40">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={scrollBottomRef} />
                    </div>
                )}
            </ScrollArea>

            {/* ═══════════════════════════════════════════════════════════════
             * INPUT BAR (CHÂN TRANG)
             * ═══════════════════════════════════════════════════════════════ */}
            <div className="p-3 border-t border-border/80 bg-background/90">
                {isAuthenticated ? (
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <Avatar className="size-8 shrink-0">
                            {user?.image && <AvatarImage src={user.image} alt="Avatar" />}
                            <AvatarFallback className="text-xs font-bold bg-emerald-500/20 text-emerald-600">
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
                    <div className="py-1 text-center">
                        <p className="text-xs text-muted-foreground">Vui lòng đăng nhập để tham gia bình luận video.</p>
                    </div>
                )}
            </div>
        </aside>
    )
}
