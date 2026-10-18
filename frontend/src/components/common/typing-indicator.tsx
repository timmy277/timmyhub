'use client'

import { useTranslations } from 'next-intl'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui'

interface TypingIndicatorProps {
    peerName?: string | undefined
    peerAvatar?: string | null | undefined
    className?: string | undefined
}

// Bong bóng hiển thị đối phương đang soạn tin nhắn realtime (Messenger Facebook style)
export function TypingIndicator({ peerName, peerAvatar, className = '' }: TypingIndicatorProps) {
    const t = useTranslations('chat')
    const displayName = peerName || t('peerUser')

    return (
        <div
            className={`flex items-end gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200 ${className}`}
            aria-live="polite"
        >
            {/* Avatar nhỏ của đối tác */}
            <div className="size-6 mb-0.5 shrink-0">
                <Avatar className="size-6 border border-border/50">
                    <AvatarImage src={peerAvatar ?? undefined} alt={displayName} />
                    <AvatarFallback className="text-[8px] bg-muted font-bold">
                        {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </div>

            {/* Bong bóng 3 chấm nhảy */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl rounded-bl-xs bg-muted/80 text-muted-foreground border border-border/40 shadow-xs">
                <div className="flex items-center gap-1 py-0.5">
                    <span className="size-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.32s]" />
                    <span className="size-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.16s]" />
                    <span className="size-1.5 rounded-full bg-primary/70 animate-bounce" />
                </div>
                <span className="text-[10px] text-muted-foreground/80 font-medium ml-1 select-none">
                    {t('typing', { name: displayName })}
                </span>
            </div>
        </div>
    )
}
