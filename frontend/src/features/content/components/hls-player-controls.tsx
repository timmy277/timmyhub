'use client'

import React from 'react'
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button, Input } from '@/components/ui'
import { cn } from '@/utils'

import { HlsQualityMenu, type QualityLevel } from './hls-quality-menu'

export interface HlsPlayerControlsProps {
    isPlaying: boolean
    isMuted: boolean
    currentTime: number
    duration: number
    isFullscreen: boolean
    qualities: QualityLevel[]
    selectedQuality: number
    controlsVisible: boolean
    onTogglePlay: (e?: React.MouseEvent) => void
    onToggleMute: (e?: React.MouseEvent) => void
    onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSelectQuality: (qualityIndex: number) => void
    onToggleFullscreen: () => void
}

function formatTime(seconds: number): string {
    if (!seconds || Number.isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export function HlsPlayerControls({
    isPlaying,
    isMuted,
    currentTime,
    duration,
    isFullscreen,
    qualities,
    selectedQuality,
    controlsVisible,
    onTogglePlay,
    onToggleMute,
    onSeek,
    onSelectQuality,
    onToggleFullscreen,
}: HlsPlayerControlsProps) {
    const t = useTranslations('content.player')

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
                'absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8 transition-opacity duration-300 flex flex-col gap-2',
                controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
        >
            {/* Thanh timeline scrubber */}
            <div className="relative flex items-center group/timeline">
                <Input
                    type="range"
                    min="0"
                    max="100"
                    value={duration ? (currentTime / duration) * 100 : 0}
                    onChange={onSeek}
                    className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary group-hover/timeline:h-2 transition-all p-0 border-0"
                />
            </div>

            {/* Hàng nút bấm điều khiển */}
            <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2">
                    {/* Play / Pause */}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onTogglePlay}
                        className="size-7 text-white hover:text-white hover:bg-white/20 rounded-full"
                        title={isPlaying ? t('pause') : t('play')}
                    >
                        {isPlaying ? (
                            <Pause className="size-4 fill-white" />
                        ) : (
                            <Play className="size-4 fill-white ml-0.5" />
                        )}
                    </Button>

                    {/* Mute / Unmute */}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onToggleMute}
                        className="size-7 text-white hover:text-white hover:bg-white/20 rounded-full"
                    >
                        {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                    </Button>

                    {/* Time counter */}
                    <span className="font-mono text-[11px] text-white/80 select-none">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Menu chất lượng HLS */}
                    <HlsQualityMenu
                        qualities={qualities}
                        selectedQuality={selectedQuality}
                        onSelectQuality={onSelectQuality}
                    />

                    {/* Fullscreen toggle */}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onToggleFullscreen}
                        className="size-7 text-white hover:text-white hover:bg-white/20 rounded-full"
                        title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
                    >
                        {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}
