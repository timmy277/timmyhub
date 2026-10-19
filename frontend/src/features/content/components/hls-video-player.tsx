'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/utils'

import { HlsPlayerControls } from './hls-player-controls'
import { HlsPlayerOverlays } from './hls-player-overlays'
import type { QualityLevel } from './hls-quality-menu'
import { VideoProgressBar } from './video-progress-bar'
import { useHlsSource } from '../hooks/use-hls-source'

// ===== 1. Types & Interfaces =====

export interface VideoMeasureRect {
    left: number
    top: number
    width: number
    height: number
}

export interface HlsVideoPlayerProps {
    src: string
    poster?: string | null
    autoPlay?: boolean
    isActive?: boolean
    loop?: boolean
    muted?: boolean
    playsInline?: boolean
    className?: string
    onEnded?: () => void
    onClick?: () => void
    onPlayPauseChange?: (isPlaying: boolean) => void
    onMeasure?: (rect: VideoMeasureRect) => void
    showCustomControls?: boolean
    showProgressBar?: boolean
    onQualitiesLoaded?: (qualities: QualityLevel[], selectQuality: (index: number) => void) => void
}

// ===== 2. Constants =====

const HLS_REGEX = /\.m3u8($|\?)/i

// ===== 3. Component =====

export function HlsVideoPlayer({
    src,
    poster,
    autoPlay = false,
    isActive = true,
    loop = true,
    muted = true,
    playsInline = true,
    className,
    onEnded,
    onClick,
    onPlayPauseChange,
    onMeasure,
    showCustomControls = true,
    showProgressBar = true,
    onQualitiesLoaded,
}: HlsVideoPlayerProps) {
    // ===== 4. Hooks & Translations =====
    const t = useTranslations('content.player')

    // ===== 5. State & Refs =====
    const [isPlaying, setIsPlaying] = useState(autoPlay && isActive)
    const [internalMuted, setInternalMuted] = useState(muted)
    const isMuted = muted !== undefined ? muted : internalMuted
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [selectedQuality, setSelectedQuality] = useState<number>(-1)
    const [isBuffering, setIsBuffering] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [controlsVisible, setControlsVisible] = useState(true)

    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const prevActiveRef = useRef(isActive)
    const onMeasureRef = useRef(onMeasure)

    // ===== 6. HLS Source Hook =====
    const { hlsRef, qualities, activeQualityLabel, setActiveQualityLabel } = useHlsSource({
        src,
        videoRef,
        autoPlay,
        isActive,
        selectedQuality,
    })

    // ===== 7. Handlers =====
    const measure = useCallback(() => {
        requestAnimationFrame(() => {
            const video = videoRef.current
            const container = containerRef.current
            if (!video || !container || !onMeasureRef.current) return
            const cW = container.clientWidth
            const cH = container.clientHeight
            if (!cW || !cH) return
            const scale = Math.min(cW / (video.videoWidth || 9), cH / (video.videoHeight || 16))
            onMeasureRef.current({
                left: Math.round((cW - Math.round((video.videoWidth || 9) * scale)) / 2),
                top: Math.round((cH - Math.round((video.videoHeight || 16) * scale)) / 2),
                width: Math.round((video.videoWidth || 9) * scale),
                height: Math.round((video.videoHeight || 16) * scale),
            })
        })
    }, [])

    const togglePlay = useCallback(
        (e?: React.MouseEvent) => {
            if (e) e.stopPropagation()
            const video = videoRef.current
            if (!video) return
            if (video.paused) {
                void video
                    .play()
                    .then(() => {
                        setIsPlaying(true)
                        onPlayPauseChange?.(true)
                    })
                    .catch(() => setIsPlaying(false))
            } else {
                video.pause()
                setIsPlaying(false)
                onPlayPauseChange?.(false)
            }
        },
        [onPlayPauseChange],
    )

    const toggleMute = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        const video = videoRef.current
        if (!video) return
        video.muted = !video.muted
        setInternalMuted(video.muted)
    }, [])

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current
        if (!video || !duration) return
        const newTime = (Number(e.target.value) / 100) * duration
        video.currentTime = newTime
        setCurrentTime(newTime)
    }

    const handleDirectSeek = useCallback((targetTime: number) => {
        const video = videoRef.current
        if (!video) return
        video.currentTime = targetTime
        setCurrentTime(targetTime)
    }, [])

    const handleQualitySelect = useCallback(
        (qualityIndex: number) => {
            const hls = hlsRef.current
            if (!hls) return
            setSelectedQuality(qualityIndex)
            hls.currentLevel = qualityIndex
            if (qualityIndex === -1) {
                setActiveQualityLabel(t('autoQuality'))
            } else {
                const matched = qualities.find((q) => q.index === qualityIndex)
                setActiveQualityLabel(matched?.label ?? t('customQuality'))
            }
        },
        [hlsRef, qualities, t, setActiveQualityLabel],
    )

    const toggleFullscreen = () => {
        const container = containerRef.current
        if (!container) return
        if (!document.fullscreenElement) {
            void container.requestFullscreen?.()
        } else {
            void document.exitFullscreen?.()
        }
    }

    // ===== 8. Effects =====
    useEffect(() => {
        onMeasureRef.current = onMeasure
    }, [onMeasure])

    useEffect(() => {
        onQualitiesLoaded?.(qualities, handleQualitySelect)
    }, [qualities, handleQualitySelect, onQualitiesLoaded])

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = muted
        }
    }, [muted])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        if (isActive && !prevActiveRef.current) {
            void video.play().catch(() => {})
        } else if (!isActive) {
            video.pause()
            if (video.currentTime > 0) video.currentTime = 0
        }
        prevActiveRef.current = isActive
    }, [isActive])

    useEffect(() => {
        const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', handler)
        return () => document.removeEventListener('fullscreenchange', handler)
    }, [])

    // ===== 9. Render =====
    if (!src) {
        return (
            <div className={cn('flex items-center justify-center bg-black text-muted-foreground text-xs', className)}>
                <div className="flex flex-col items-center gap-2">
                    <Play className="size-8 opacity-40" />
                    <span>{t('noSource')}</span>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            onMouseMove={() => {
                setControlsVisible(true)
                clearTimeout(controlsTimeoutRef.current!)
                controlsTimeoutRef.current = setTimeout(() => isPlaying && setControlsVisible(false), 3000)
            }}
            onMouseLeave={() => isPlaying && setControlsVisible(false)}
            onClick={(e) => {
                togglePlay(e)
                onClick?.()
            }}
            className={cn(
                'group relative flex items-center justify-center overflow-hidden bg-black select-none',
                className,
            )}
        >
            <video
                ref={videoRef}
                poster={poster || (!HLS_REGEX.test(src) && src ? `${src.replace(/#t=[^&]*/, '')}#t=0.001` : undefined)}
                loop={loop}
                muted={isMuted}
                playsInline={playsInline}
                preload="metadata"
                onLoadedMetadata={() => {
                    measure()
                    if (videoRef.current) {
                        setDuration(videoRef.current.duration || 0)
                    }
                }}
                onTimeUpdate={() => {
                    if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime)
                        setDuration(videoRef.current.duration || 0)
                    }
                }}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => {
                    setIsBuffering(false)
                    setIsPlaying(true)
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={onEnded}
                className="size-full object-contain cursor-pointer"
            />

            <HlsPlayerOverlays
                isPlaying={isPlaying}
                isBuffering={isBuffering}
                hasQualities={qualities.length > 0}
                activeQualityLabel={activeQualityLabel}
                onTogglePlay={togglePlay}
            />

            {showProgressBar && !showCustomControls && (
                <VideoProgressBar currentTime={currentTime} duration={duration} onSeek={handleDirectSeek} />
            )}

            {showCustomControls && (
                <HlsPlayerControls
                    isPlaying={isPlaying}
                    isMuted={isMuted}
                    currentTime={currentTime}
                    duration={duration}
                    isFullscreen={isFullscreen}
                    qualities={qualities}
                    selectedQuality={selectedQuality}
                    controlsVisible={controlsVisible}
                    onTogglePlay={togglePlay}
                    onToggleMute={toggleMute}
                    onSeek={handleSeek}
                    onSelectQuality={handleQualitySelect}
                    onToggleFullscreen={toggleFullscreen}
                />
            )}
        </div>
    )
}
