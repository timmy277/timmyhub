'use client'

import React, { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { cn } from '@/utils'

// ===== 1. Types & Interfaces =====

export interface VideoProgressBarProps {
    currentTime: number
    duration: number
    onSeek: (targetTime: number) => void
    className?: string
}

// ===== 2. Constants & Helpers =====

function formatTime(seconds: number): string {
    if (!seconds || Number.isNaN(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

// ===== 3. Component Definition =====

export function VideoProgressBar({ currentTime, duration, onSeek, className }: VideoProgressBarProps) {
    const t = useTranslations('content.player')

    // ===== 4. State & Refs =====
    const [isDragging, setIsDragging] = useState(false)
    const [scrubPercent, setScrubPercent] = useState<number | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [hoverPercent, setHoverPercent] = useState<number | null>(null)
    const trackRef = useRef<HTMLDivElement>(null)

    // ===== 5. Derived Values =====
    const max = duration > 0 ? duration : 100
    const playedPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
    const effectivePercent = isDragging && scrubPercent !== null ? scrubPercent : playedPercent

    // Toạ độ của Tooltip hiển thị thời gian: bám theo điểm kéo hoặc vị trí hover
    const tooltipPercent = isDragging ? effectivePercent : (hoverPercent ?? effectivePercent)
    const tooltipTime = duration > 0 ? (tooltipPercent / 100) * duration : 0

    // ===== 6. Handlers =====
    const calculatePercent = useCallback((clientX: number): number => {
        const track = trackRef.current
        if (!track) return 0
        const rect = track.getBoundingClientRect()
        const clickX = clientX - rect.left
        return Math.min(100, Math.max(0, (clickX / rect.width) * 100))
    }, [])

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsDragging(true)
        const pct = calculatePercent(e.clientX)
        setScrubPercent(pct)
        if (duration > 0) {
            onSeek((pct / 100) * duration)
        }
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const pct = calculatePercent(e.clientX)
        setHoverPercent(pct)
        if (isDragging) {
            setScrubPercent(pct)
            if (duration > 0) {
                onSeek((pct / 100) * duration)
            }
        }
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {
                // Ignore if pointer capture already lost
            }
            setIsDragging(false)
            // Giữ scrubPercent thêm một chu kỳ ngắn để video kịp seek đến vị trí mới
            setTimeout(() => setScrubPercent(null), 120)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!duration) return
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            onSeek(Math.min(duration, currentTime + 5))
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            onSeek(Math.max(0, currentTime - 5))
        } else if (e.key === 'Home') {
            e.preventDefault()
            onSeek(0)
        } else if (e.key === 'End') {
            e.preventDefault()
            onSeek(duration)
        }
    }

    // ===== 7. Render =====
    return (
        <div
            role="slider"
            tabIndex={0}
            aria-label={t('progressAria')}
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(max)}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            className={cn(
                'absolute bottom-0 inset-x-0 z-30 flex flex-col justify-end select-none pointer-events-auto h-7 sm:h-8 group/scrubber cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary',
                className,
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleKeyDown}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => {
                setIsHovered(false)
                setHoverPercent(null)
            }}
        >
            {/* 1. Tooltip shadcn hiển thị thời gian khi rê chuột hoặc kéo tua */}
            <Tooltip open={(hoverPercent !== null || isDragging) && duration > 0}>
                <TooltipTrigger asChild>
                    <div
                        className="absolute bottom-4 -translate-x-1/2 pointer-events-none transition-all duration-75"
                        // Dynamic style: Điểm neo của Tooltip bám theo toạ độ chuột / tiến trình tua
                        style={{ left: `${tooltipPercent}%` }}
                    />
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="rounded-full bg-neutral-950/90 text-white border border-primary/40 px-2.5 py-0.5 text-[11px] font-mono font-semibold shadow-2xl backdrop-blur-md flex items-center gap-1"
                >
                    <span className="text-primary font-bold">{formatTime(tooltipTime)}</span>
                    <span className="text-white/50">/</span>
                    <span className="text-white/80">{formatTime(duration)}</span>
                </TooltipContent>
            </Tooltip>

            {/* 2. Thanh rãnh trượt chính (Track) */}
            <div
                ref={trackRef}
                className="relative w-full h-1 group-hover/scrubber:h-2 transition-all duration-200 bg-white/20 backdrop-blur-sm"
            >
                {/* 2a. Dải Hover Preview chạy theo con trỏ chuột (chuẩn YouTube/TikTok) */}
                {hoverPercent !== null && !isDragging && (
                    <div
                        className="absolute inset-y-0 left-0 bg-white/35 pointer-events-none transition-none"
                        // Dynamic style: Dải sáng mở rộng theo con trỏ chuột khi hover
                        style={{ width: `${hoverPercent}%` }}
                    />
                )}

                {/* 2b. Phần tiến trình đã phát (Fill) - CSS transition 250ms tuyến tính */}
                <div
                    className={cn(
                        'absolute inset-y-0 left-0 bg-primary shadow-[0_0_12px_rgba(16,185,129,0.7)] transform-gpu',
                        isDragging ? 'transition-none' : 'transition-[width] duration-250 ease-linear',
                    )}
                    // Dynamic style: % chiều rộng tiến trình phát video tính toán theo thời gian thực
                    style={{ width: `${effectivePercent}%` }}
                />

                {/* 2c. Chấm tròn tua video (Thumb) */}
                <div
                    className={cn(
                        'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full bg-primary ring-2 ring-white shadow-xl pointer-events-none transition-transform transform-gpu',
                        isDragging ? 'scale-125' : isHovered ? 'scale-100' : 'scale-0',
                    )}
                    // Dynamic style: % vị trí điểm nút tua video trên trục ngang
                    style={{ left: `${effectivePercent}%` }}
                />
            </div>
        </div>
    )
}
