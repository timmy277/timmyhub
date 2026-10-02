'use client'

import { useEffect, useState } from 'react'
import {
    X,
    Download,
    Copy,
    Check,
    Film,
    Image as ImageIcon,
    ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

export interface MediaLightboxItem {
    url: string
    title?: string
    type: 'IMAGE' | 'VIDEO'
    sizeBytes?: number | null
}

interface MediaLightboxProps {
    item: MediaLightboxItem | null
    onClose: () => void
}

export function MediaLightbox({ item, onClose }: MediaLightboxProps) {
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    if (!item) return null

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(item.url)
            setCopied(true)
            toast.success('Đã sao chép liên kết media!')
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error('Không thể sao chép liên kết')
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Xem chi tiết Media"
            onClick={onClose}
        >
            <div
                className="relative max-h-[92vh] max-w-[94vw] flex flex-col items-center rounded-2xl bg-neutral-950/90 border border-neutral-800 shadow-2xl overflow-hidden p-2"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Action Bar */}
                <div className="w-full flex items-center justify-between px-4 py-3 border-b border-neutral-800/80 bg-neutral-900/50">
                    <div className="flex items-center gap-2 text-sm text-neutral-300 font-medium truncate max-w-[60%]">
                        {item.type === 'VIDEO' ? (
                            <Film className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                            <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                        <span className="truncate">{item.title || 'Xem tập tin'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                            title="Sao chép URL"
                            aria-label="Sao chép URL"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                            title="Mở tab mới"
                            aria-label="Mở tab mới"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                            href={item.url}
                            download
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                            title="Tải về"
                            aria-label="Tải về"
                        >
                            <Download className="w-4 h-4" />
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-colors ml-1"
                            title="Đóng (Esc)"
                            aria-label="Đóng"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Media Content Body */}
                <div className="relative flex items-center justify-center min-w-[320px] max-h-[calc(90vh-80px)] overflow-auto p-2">
                    {item.type === 'VIDEO' ? (
                        <video
                            src={item.url}
                            controls
                            autoPlay
                            playsInline
                            className="max-h-[75vh] max-w-full rounded-lg shadow-inner bg-black"
                        />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.url}
                            alt={item.title || 'Xem ảnh'}
                            className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-inner select-none"
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
