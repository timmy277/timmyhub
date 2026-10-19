'use client'

import React from 'react'
import { Play } from 'lucide-react'
import { Badge, Button, Spinner } from '@/components/ui'

// ===== 1. Types & Interfaces =====

interface HlsPlayerOverlaysProps {
    isPlaying: boolean
    isBuffering: boolean
    hasQualities: boolean
    activeQualityLabel: string
    onTogglePlay: (e?: React.MouseEvent) => void
}

// ===== 2. Component =====

export function HlsPlayerOverlays({
    isPlaying,
    isBuffering,
    hasQualities,
    activeQualityLabel,
    onTogglePlay,
}: HlsPlayerOverlaysProps) {
    // ===== 3. Render =====
    return (
        <>
            {/* Buffering spinner */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-20">
                    <Spinner className="size-10 text-primary animate-spin" />
                </div>
            )}

            {/* Duy nhất 1 nút Play khi video đang pause, click không bị bubble event */}
            {!isPlaying && !isBuffering && (
                <div
                    onClick={(e) => {
                        e.stopPropagation()
                        onTogglePlay(e)
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-20"
                >
                    <Button
                        type="button"
                        variant="default"
                        size="icon"
                        className="size-16 rounded-full bg-primary text-primary-foreground shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-90 pointer-events-none"
                    >
                        <Play className="size-8 fill-current ml-1 text-primary-foreground" />
                    </Button>
                </div>
            )}

            {/* Quality label badge - đặt cạnh nút Back để tránh đè lên nút quay lại */}
            {hasQualities && (
                <div className="absolute top-4 left-16 sm:left-20 z-20 pointer-events-none">
                    <Badge
                        variant="secondary"
                        className="bg-black/60 backdrop-blur-md text-white border-white/10 text-[10px] font-mono px-2 py-0.5"
                    >
                        {activeQualityLabel}
                    </Badge>
                </div>
            )}
        </>
    )
}
