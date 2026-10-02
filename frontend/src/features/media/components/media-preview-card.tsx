'use client'

import Image from 'next/image'
import React, { useRef, useState } from 'react'
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize2,
    Trash2,
    RotateCw,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Film,
    Image as ImageIcon,
    FileIcon,
} from 'lucide-react'

import { formatBytes } from '@/utils'

export interface UploadQueueItem {
    id: string
    file: File
    previewUrl: string
    type: 'IMAGE' | 'VIDEO'
    sizeBytes: number
    status: 'idle' | 'uploading' | 'success' | 'error'
    progress: number
    errorMessage?: string
    publicUrl?: string
    speedBytesPerSec?: number
}

interface MediaPreviewCardProps {
    item: UploadQueueItem
    onRemove?: (id: string) => void
    onRetry?: (id: string) => void
    onOpenLightbox?: (url: string, type: 'IMAGE' | 'VIDEO', title: string) => void
}

export function MediaPreviewCard({ item, onRemove, onRetry, onOpenLightbox }: MediaPreviewCardProps) {
    // ===== State =====
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(true)

    // ===== Handlers =====
    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!videoRef.current) return
        if (isPlaying) {
            videoRef.current.pause()
            setIsPlaying(false)
        } else {
            void videoRef.current.play()
            setIsPlaying(true)
        }
    }

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!videoRef.current) return
        videoRef.current.muted = !isMuted
        setIsMuted(!isMuted)
    }

    const ext = item.file.name.split('.').pop()?.toUpperCase() || 'FILE'

    return (
        <div className="group relative flex flex-col rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            {/* Media Thumbnail / Preview Section */}
            <div className="relative aspect-video w-full overflow-hidden bg-neutral-950 flex items-center justify-center">
                {item.type === 'VIDEO' ? (
                    <div className="relative w-full h-full flex items-center justify-center group/video">
                        <video
                            ref={videoRef}
                            src={item.previewUrl}
                            muted={isMuted}
                            playsInline
                            loop
                            onEnded={() => setIsPlaying(false)}
                            className="w-full h-full object-cover"
                        />
                        {/* Video Controls Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/video:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={togglePlay}
                                className="p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-transform active:scale-95"
                                title={isPlaying ? 'Tạm dừng' : 'Phát thử'}
                                aria-label={isPlaying ? 'Tạm dừng' : 'Phát thử'}
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                            </button>
                            <button
                                type="button"
                                onClick={toggleMute}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-transform active:scale-95"
                                title={isMuted ? 'Bật âm thanh' : 'Tắt âm'}
                                aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm'}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        </div>
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/70 text-amber-300 backdrop-blur-sm flex items-center gap-1">
                            <Film className="w-3 h-3" /> Video
                        </span>
                    </div>
                ) : item.type === 'IMAGE' ? (
                    <div className="relative w-full h-full">
                        {/*
                         * previewUrl là blob URL từ createObjectURL — không qua
                         * Next.js image optimization server, dùng unoptimized
                         */}
                        <Image
                            src={item.previewUrl}
                            alt={item.file.name}
                            fill
                            unoptimized
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/70 text-sky-300 backdrop-blur-sm flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Ảnh
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-400">
                        <FileIcon className="w-10 h-10 mb-1" />
                        <span className="text-xs">{ext}</span>
                    </div>
                )}

                {/* Top-Right Quick Overlay Buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onOpenLightbox && (item.publicUrl || item.previewUrl) && (
                        <button
                            type="button"
                            onClick={() => onOpenLightbox(item.publicUrl || item.previewUrl, item.type, item.file.name)}
                            className="p-1.5 rounded-lg bg-neutral-900/80 text-white hover:bg-neutral-800 transition-colors backdrop-blur-md shadow"
                            title="Phóng to"
                            aria-label="Phóng to"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onRemove && item.status !== 'uploading' && (
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="p-1.5 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-900 transition-colors backdrop-blur-md shadow"
                            title="Xoá bỏ"
                            aria-label="Xoá bỏ"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Status Indicator Overlay Badge */}
                <div className="absolute top-2 left-2">
                    {item.status === 'uploading' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/90 text-white backdrop-blur-sm shadow animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> {item.progress}%
                        </span>
                    )}
                    {item.status === 'success' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-600/90 text-white backdrop-blur-sm shadow">
                            <CheckCircle2 className="w-3 h-3" /> Sẵn sàng
                        </span>
                    )}
                    {item.status === 'error' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-600/90 text-white backdrop-blur-sm shadow">
                            <AlertCircle className="w-3 h-3" /> Lỗi
                        </span>
                    )}
                </div>
            </div>

            {/* Content & Metadata Section */}
            <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p
                            className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate"
                            title={item.file.name}
                        >
                            {item.file.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                            <span className="px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[10px] uppercase">
                                {ext}
                            </span>
                            <span>•</span>
                            <span>{formatBytes(item.sizeBytes)}</span>
                            {item.speedBytesPerSec && item.status === 'uploading' && (
                                <>
                                    <span>•</span>
                                    <span className="text-sky-500 font-mono">
                                        {formatBytes(item.speedBytesPerSec)}/s
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Retry Button on Error */}
                    {item.status === 'error' && onRetry && (
                        <button
                            type="button"
                            onClick={() => onRetry(item.id)}
                            className="p-1 rounded-md text-neutral-500 hover:text-sky-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Thử lại"
                            aria-label="Thử lại"
                        >
                            <RotateCw className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Progress Bar */}
                {item.status === 'uploading' && (
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                )}

                {/* Error Message readout */}
                {item.status === 'error' && item.errorMessage && (
                    <p className="text-[11px] text-rose-500 dark:text-rose-400 truncate" title={item.errorMessage}>
                        {item.errorMessage}
                    </p>
                )}
            </div>
        </div>
    )
}
