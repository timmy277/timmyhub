'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
    X,
    Download,
    Copy,
    Check,
    Film,
    Image as ImageIcon,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Play,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components'

export interface MediaLightboxItem {
    url: string
    title?: string
    type: 'IMAGE' | 'VIDEO'
    sizeBytes?: number | null
}

export interface MediaLightboxProps {
    item?: MediaLightboxItem | null
    items?: MediaLightboxItem[]
    initialIndex?: number
    onClose: () => void
}

export function MediaLightbox({ item, items, initialIndex = 0, onClose }: MediaLightboxProps) {
    const t = useTranslations('media.lightbox')

    // Normalized items list
    const normalizedItems = useMemo<MediaLightboxItem[]>(() => {
        if (items && items.length > 0) return items
        if (item) return [item]
        return []
    }, [items, item])

    // Find initial index
    const resolvedInitialIndex = useMemo(() => {
        if (typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < normalizedItems.length) {
            return initialIndex
        }
        if (item) {
            const found = normalizedItems.findIndex((it) => it.url === item.url)
            if (found >= 0) return found
        }
        return 0
    }, [initialIndex, item, normalizedItems])

    const [prevInitialIndex, setPrevInitialIndex] = useState(resolvedInitialIndex)
    const [currentIndex, setCurrentIndex] = useState(resolvedInitialIndex)
    const [copied, setCopied] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)

    // Sync state during render when resolvedInitialIndex changes (avoids cascading effect renders)
    if (prevInitialIndex !== resolvedInitialIndex) {
        setPrevInitialIndex(resolvedInitialIndex)
        setCurrentIndex(resolvedInitialIndex)
        setZoom(1)
        setRotation(0)
    }

    const currentItem = normalizedItems[currentIndex] || null
    const hasMultiple = normalizedItems.length > 1

    const handlePrev = useCallback(() => {
        if (!hasMultiple) return
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : normalizedItems.length - 1))
        setZoom(1)
        setRotation(0)
    }, [hasMultiple, normalizedItems.length])

    const handleNext = useCallback(() => {
        if (!hasMultiple) return
        setCurrentIndex((prev) => (prev < normalizedItems.length - 1 ? prev + 1 : 0))
        setZoom(1)
        setRotation(0)
    }, [hasMultiple, normalizedItems.length])

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 3))
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5))
    const handleResetZoom = () => {
        setZoom(1)
        setRotation(0)
    }
    const handleRotate = () => setRotation((r) => (r + 90) % 360)

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft') handlePrev()
            if (e.key === 'ArrowRight') handleNext()
            if (e.key === '+' || e.key === '=') handleZoomIn()
            if (e.key === '-') handleZoomOut()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose, handlePrev, handleNext])

    if (!currentItem) return null

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(currentItem.url)
            setCopied(true)
            toast.success(t('copySuccess'))
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error(t('copyFailed'))
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col justify-between bg-black/92 backdrop-blur-2xl p-3 sm:p-6 animate-in fade-in duration-200 select-none overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Xem chi tiết Media"
            onClick={onClose}
        >
            {/* Top Bar: Title & Counter on Left, Actions on Right */}
            <header
                className="relative z-20 flex items-center justify-between gap-3 w-full max-w-7xl mx-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left: Counter & Type */}
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-white shadow-xl">
                    {currentItem.type === 'VIDEO' ? (
                        <Film className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                        <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                    <span className="text-xs sm:text-sm font-semibold truncate max-w-[200px] sm:max-w-xs">
                        {currentItem.title || (currentItem.type === 'VIDEO' ? 'Video' : 'Hình ảnh')}
                    </span>
                    {hasMultiple && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-mono font-medium">
                            {currentIndex + 1} / {normalizedItems.length}
                        </span>
                    )}
                </div>

                {/* Right: Glassmorphic Control Bar */}
                <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-xl text-white">
                    {currentItem.type === 'IMAGE' && (
                        <>
                            <Button
                                type="button"
                                onClick={handleZoomIn}
                                disabled={zoom >= 3}
                                className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/15 transition-all disabled:opacity-40"
                                title="Phóng to (+)"
                                aria-label="Phóng to"
                                variant="ghost"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                            <Button
                                type="button"
                                onClick={handleZoomOut}
                                disabled={zoom <= 0.5}
                                className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/15 transition-all disabled:opacity-40"
                                title="Thu nhỏ (-)"
                                aria-label="Thu nhỏ"
                                variant="ghost"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </Button>
                            <Button
                                type="button"
                                onClick={handleRotate}
                                className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/15 transition-all"
                                title="Xoay 90°"
                                aria-label="Xoay ảnh"
                                variant="ghost"
                            >
                                <RotateCw className="w-4 h-4" />
                            </Button>
                            {zoom !== 1 && (
                                <Button
                                    type="button"
                                    onClick={handleResetZoom}
                                    className="px-2 py-1 rounded-full text-[11px] font-mono text-neutral-300 hover:text-white hover:bg-white/15 transition-all"
                                    title="Đặt lại kích thước"
                                    variant="ghost"
                                >
                                    100%
                                </Button>
                            )}
                            <div className="h-4 w-px bg-white/20 mx-0.5" />
                        </>
                    )}

                    <Button
                        type="button"
                        onClick={handleCopy}
                        className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/15 transition-all"
                        title="Sao chép URL"
                        aria-label="Sao chép URL"
                        variant="ghost"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>

                    <a
                        href={currentItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/15 transition-all"
                        title="Mở tab mới"
                        aria-label="Mở tab mới"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>

                    <a
                        href={currentItem.url}
                        download
                        className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/15 transition-all"
                        title="Tải về"
                        aria-label="Tải về"
                    >
                        <Download className="w-4 h-4" />
                    </a>

                    <div className="h-4 w-px bg-white/20 mx-0.5" />

                    <Button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-all shadow-md"
                        title="Đóng (Esc)"
                        aria-label="Đóng"
                        variant="ghost"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Main Center Display Stage */}
            <div
                className="relative flex-1 flex items-center justify-center w-full max-w-7xl mx-auto my-auto overflow-hidden p-2 sm:p-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Previous Button */}
                {hasMultiple && (
                    <Button
                        type="button"
                        onClick={handlePrev}
                        className="absolute left-2 sm:left-6 z-30 flex size-11 sm:size-13 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-xl border border-white/15 shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                        aria-label="Xem ảnh trước"
                        title="Ảnh trước (←)"
                        variant="ghost"
                    >
                        <ChevronLeft className="size-6 sm:size-7" />
                    </Button>
                )}

                {/* Media Content */}
                <div className="relative flex items-center justify-center max-h-[74vh] max-w-full overflow-hidden">
                    {currentItem.type === 'VIDEO' ? (
                        <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black">
                            <video
                                src={currentItem.url}
                                controls
                                autoPlay
                                playsInline
                                className="max-h-[72vh] max-w-full rounded-2xl bg-black shadow-2xl"
                            />
                        </div>
                    ) : (
                        <div
                            className="relative transition-transform duration-300 ease-out cursor-zoom-in"
                            style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                            }}
                            onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
                        >
                            <Image
                                src={currentItem.url}
                                alt={currentItem.title || 'Xem ảnh'}
                                className="max-h-[72vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-2xl shadow-2xl border border-white/10 select-none transition-shadow"
                                draggable={false}
                                width={1200}
                                height={800}
                                sizes="100vw"
                                unoptimized
                            />
                        </div>
                    )}
                </div>

                {/* Next Button */}
                {hasMultiple && (
                    <Button
                        type="button"
                        onClick={handleNext}
                        className="absolute right-2 sm:right-6 z-30 flex size-11 sm:size-13 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-xl border border-white/15 shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                        aria-label="Xem ảnh tiếp theo"
                        title="Ảnh tiếp theo (→)"
                        variant="ghost"
                    >
                        <ChevronRight className="size-6 sm:size-7" />
                    </Button>
                )}
            </div>

            {/* Bottom Strip: Thumbnail Carousel (Only when multiple files) */}
            {hasMultiple && (
                <footer
                    className="relative z-20 flex items-center justify-center gap-2.5 max-w-7xl mx-auto overflow-x-auto py-2 px-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {normalizedItems.map((mediaItem, idx) => {
                        const isActive = idx === currentIndex
                        const isVideo = mediaItem.type === 'VIDEO'

                        return (
                            <Button
                                key={`${mediaItem.url}-${idx}`}
                                type="button"
                                onClick={() => {
                                    setCurrentIndex(idx)
                                    setZoom(1)
                                    setRotation(0)
                                }}
                                className={`relative size-12 sm:size-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                                    isActive
                                        ? 'border-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-black scale-110 shadow-lg opacity-100'
                                        : 'border-white/20 opacity-50 hover:opacity-90 hover:border-white/50'
                                }`}
                                variant="ghost"
                            >
                                {isVideo ? (
                                    <div className="size-full bg-neutral-900 flex items-center justify-center text-white">
                                        <Play className="size-4 fill-white" />
                                    </div>
                                ) : (
                                    <Image src={mediaItem.url} alt="" fill sizes="56px" className="object-cover" />
                                )}
                            </Button>
                        )
                    })}
                </footer>
            )}
        </div>
    )
}
