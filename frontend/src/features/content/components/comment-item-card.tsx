'use client'

import React from 'react'
import type { PostCommentDto } from '@timmyhub/contracts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui'

interface CommentItemCardProps {
    comment: PostCommentDto
}

export function CommentItemCard({ comment }: CommentItemCardProps) {
    const initial = comment.user?.name?.slice(0, 2).toUpperCase() || 'U'
    const dateStr = new Date(comment.createdAt).toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
    })

    return (
        <div className="flex gap-2.5 items-start text-xs group">
            <Avatar className="size-8 ring-1 ring-border/80 shadow-sm shrink-0 mt-0.5">
                {comment.user?.avatar && <AvatarImage src={comment.user.avatar} alt={comment.user.name} />}
                <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">{initial}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground text-xs truncate">
                        {comment.user?.name || 'Người dùng'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{dateStr}</span>
                </div>
                <div className="text-xs text-foreground/90 leading-relaxed break-words bg-muted/40 hover:bg-muted/60 transition-colors p-2.5 rounded-xl border border-border/50">
                    {comment.content}
                </div>
            </div>
        </div>
    )
}
