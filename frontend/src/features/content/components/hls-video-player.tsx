'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { Check, Maximize, Minimize, Pause, Play, Settings, Volume2, VolumeX } from 'lucide-react'

import {
    Badge,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Input,
    Spinner,
} from '@/components/ui'
import { cn } from '@/utils'

// ═══════════════════════════════════════════════════════════════════════════
// 2. TYPES / INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
export interface QualityLevel {
    index: number
    height: number
    bitrate: number
    label: string
}

export interface HlsVideoPlayerProps {
    src: string
    poster?: string | null
    autoPlay?: boolean
    loop?: boolean
    muted?: boolean
    playsInline?: boolean
    className?: string
    onEnded?: () => void
    onClick?: () => void
    showCustomControls?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const HLS_REGEX = /\.m3u8($|\?)/i

// ═══════════════════════════════════════════════════════════════════════════
// 4. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function HlsVideoPlayer({
    src,
    poster,
    autoPlay = false,
    loop = true,
    muted = true,
    playsInline = true,
    className,
    onEnded,
    onClick,
    showCustomControls = true,
}: HlsVideoPlayerProps) {
    // 4.1. Props & State
    const [isPlaying, setIsPlaying] = useState(autoPlay)
    const [isMuted, setIsMuted] = useState(muted)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [qualities, setQualities] = useState<QualityLevel[]>([])
    const [selectedQuality, setSelectedQuality] = useState<number>(-1) // -1 là Auto
    const [activeQualityLabel, setActiveQualityLabel] = useState<string>('Auto')
    const [isBuffering, setIsBuffering] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [controlsVisible, setControlsVisible] = useState(true)

    // 4.2. Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const selectedQualityRef = useRef(selectedQuality)

    // Đồng bộ ref của selectedQuality
    useEffect(() => {
        selectedQualityRef.current = selectedQuality
    }, [selectedQuality])

    // 4.3. Custom Hooks / Helpers
    const formatTime = (seconds: number) => {
        if (!seconds || Number.isNaN(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    // 4.4. Effects
    // Khởi tạo player (HLS hoặc MP4 trực tiếp kèm fallback thumbnail 0.0001s)
    useEffect(() => {
        const video = videoRef.current
        if (!video || !src) return

        // Dọn dẹp HLS cũ nếu đổi src
        if (hlsRef.current) {
            hlsRef.current.destroy()
            hlsRef.current = null
        }

        const isHlsStream = HLS_REGEX.test(src)

        if (isHlsStream && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
            })
            hlsRef.current = hls

            hls.loadSource(src)
            hls.attachMedia(video)

            hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                const mappedLevels: QualityLevel[] = data.levels.map((lvl, idx) => ({
                    index: idx,
                    height: lvl.height,
                    bitrate: lvl.bitrate,
                    label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
                }))
                // Sắp xếp độ phân giải từ cao đến thấp
                mappedLevels.sort((a, b) => b.height - a.height)
                setQualities(mappedLevels)

                if (autoPlay) {
                    const playPromise = video.play()
                    if (playPromise !== undefined) {
                        playPromise.catch(() => setIsPlaying(false))
                    }
                }
            })

            hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
                const currentLvl = hls.levels[data.level]
                if (currentLvl) {
                    setActiveQualityLabel(
                        selectedQualityRef.current === -1 ? `Auto (${currentLvl.height}p)` : `${currentLvl.height}p`,
                    )
                }
            })

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError()
                            break
                        default:
                            hls.destroy()
                            break
                    }
                }
            })
        } else if (isHlsStream && video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS fallback (Safari)
            video.src = src
            if (autoPlay) {
                const playPromise = video.play()
                if (playPromise !== undefined) {
                    playPromise.catch(() => setIsPlaying(false))
                }
            }
        } else if (!isHlsStream) {
            // Native video fallback (MP4 / WebM)
            const cleanSrc = src.replace(/#t=[^&]*/, '')
            if (video.src !== cleanSrc) {
                video.src = cleanSrc
            }
            if (autoPlay) {
                const playPromise = video.play()
                if (playPromise !== undefined) {
                    playPromise.catch(() => setIsPlaying(false))
                }
            }
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy()
                hlsRef.current = null
            }
        }
    }, [src, autoPlay])

    // Cập nhật mức phân giải HLS khi người dùng chọn chất lượng khác mà không cần khởi tạo lại Hls instance
    useEffect(() => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = selectedQuality
        }
    }, [selectedQuality])

    // Cập nhật trạng thái Fullscreen
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement))
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // 4.5. Handlers
    const togglePlay = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        const video = videoRef.current
        if (!video) return

        if (video.paused) {
            const playPromise = video.play()
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch((err) => {
                        console.warn('Playback could not start:', err)
                        setIsPlaying(false)
                    })
            }
        } else {
            video.pause()
            setIsPlaying(false)
        }
    }, [])

    const toggleMute = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        const video = videoRef.current
        if (!video) return

        video.muted = !video.muted
        setIsMuted(video.muted)
    }, [])

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current
        if (!video || !duration) return

        const newTime = (Number(e.target.value) / 100) * duration
        video.currentTime = newTime
        setCurrentTime(newTime)
    }

    const handleQualitySelect = (qualityIndex: number) => {
        const hls = hlsRef.current
        if (!hls) return

        setSelectedQuality(qualityIndex)
        hls.currentLevel = qualityIndex

        if (qualityIndex === -1) {
            setActiveQualityLabel('Auto')
        } else {
            const matched = qualities.find((q) => q.index === qualityIndex)
            setActiveQualityLabel(matched?.label ?? 'Custom')
        }
    }

    const toggleFullscreen = () => {
        const container = containerRef.current
        if (!container) return

        if (!document.fullscreenElement) {
            void container.requestFullscreen?.()
        } else {
            void document.exitFullscreen?.()
        }
    }

    const handleMouseMove = () => {
        setControlsVisible(true)
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setControlsVisible(false)
            }
        }, 3000)
    }

    // Fallback thumbnail nếu poster không được truyền (chỉ áp dụng cho non-HLS)
    const resolvedPoster =
        poster || (!HLS_REGEX.test(src) && src ? `${src.replace(/#t=[^&]*/, '')}#t=0.001` : undefined)

    if (!src) {
        return (
            <div
                className={cn(
                    'group relative flex items-center justify-center overflow-hidden bg-black select-none text-muted-foreground text-xs',
                    className,
                )}
            >
                <div className="flex flex-col items-center gap-2">
                    <Play className="size-8 opacity-40" />
                    <span>Chưa có nguồn video</span>
                </div>
            </div>
        )
    }

    // 4.6. JSX Return
    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setControlsVisible(false)}
            onClick={onClick ?? togglePlay}
            className={cn(
                'group relative flex items-center justify-center overflow-hidden bg-black select-none',
                className,
            )}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={!HLS_REGEX.test(src) && src ? src.replace(/#t=[^&]*/, '') : undefined}
                poster={resolvedPoster}
                loop={loop}
                muted={isMuted}
                playsInline={playsInline}
                preload="metadata"
                onTimeUpdate={() => {
                    const video = videoRef.current
                    if (video) {
                        setCurrentTime(video.currentTime)
                        setDuration(video.duration || 0)
                    }
                }}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => {
                    setIsBuffering(false)
                    setIsPlaying(true)
                }}
                onPause={() => setIsPlaying(false)}
                onError={(e) => {
                    console.warn('Video source load error:', e)
                    setIsBuffering(false)
                    setIsPlaying(false)
                }}
                onEnded={onEnded}
                className="h-full w-full object-contain cursor-pointer"
            />

            {/* Spinner khi buffer video */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                    <Spinner className="size-10 text-primary animate-spin" />
                </div>
            )}

            {/* Overlay icon Pause/Play to ở giữa khi dừng */}
            {!isPlaying && !isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none transition-opacity">
                    <div className="flex size-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-2xl backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
                        <Play className="size-7 fill-current ml-1 text-white" />
                    </div>
                </div>
            )}

            {/* Badge hiển thị chất lượng hiện tại góc trên */}
            {qualities.length > 0 && (
                <div className="absolute top-3 left-3 z-20 pointer-events-none">
                    <Badge
                        variant="secondary"
                        className="bg-black/60 backdrop-blur-md text-white border-white/10 text-[10px] font-mono tracking-wider px-2 py-0.5"
                    >
                        {activeQualityLabel}
                    </Badge>
                </div>
            )}

            {/* Controls Bar */}
            {showCustomControls && (
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
                            onChange={handleSeek}
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
                                onClick={togglePlay}
                                className="size-7 text-white hover:text-white hover:bg-white/20 rounded-full"
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
                                onClick={toggleMute}
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
                            {/* Nút cài đặt chất lượng video HLS */}
                            {qualities.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-7 text-white hover:text-white hover:bg-white/20 rounded-full"
                                            title="Chất lượng video"
                                        >
                                            <Settings className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="w-48 bg-neutral-900/95 backdrop-blur-md text-white border-neutral-800"
                                    >
                                        <DropdownMenuLabel className="text-xs text-neutral-400">
                                            Chất lượng video (HLS)
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-neutral-800" />

                                        {/* Tự động Adaptive */}
                                        <DropdownMenuItem
                                            onClick={() => handleQualitySelect(-1)}
                                            className={cn(
                                                'flex items-center justify-between text-xs cursor-pointer focus:bg-white/10 focus:text-white',
                                                selectedQuality === -1 && 'font-bold text-primary',
                                            )}
                                        >
                                            <span>Tự động (Adaptive)</span>
                                            {selectedQuality === -1 && <Check className="size-3.5 text-primary" />}
                                        </DropdownMenuItem>

                                        {/* Các mức phân giải có sẵn từ HLS */}
                                        {qualities.map((q) => (
                                            <DropdownMenuItem
                                                key={q.index}
                                                onClick={() => handleQualitySelect(q.index)}
                                                className={cn(
                                                    'flex items-center justify-between text-xs cursor-pointer focus:bg-white/10 focus:text-white',
                                                    selectedQuality === q.index && 'font-bold text-primary',
                                                )}
                                            >
                                                <span>{q.label}</span>
                                                {selectedQuality === q.index && (
                                                    <Check className="size-3.5 text-primary" />
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Nút phóng to / thu nhỏ Fullscreen */}
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={toggleFullscreen}
                                className="size-7 text-white hover:text-white hover:bg-white/20 rounded-full"
                            >
                                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
