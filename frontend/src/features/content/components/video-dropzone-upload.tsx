'use client'

import React, { useCallback, useRef, useState } from 'react'
import { AlertCircle, Sparkles, UploadCloud } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button, Input } from '@/components/ui'
import { useUploadMedia } from '@/hooks'
import { cn, formatBytes } from '@/utils'

import { VideoPreviewCard } from './video-preview-card'
import { extractVideoFrame } from '../utils/video-frame-extractor'

// ===== 1. Constants & Types =====
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']

export interface VideoDropzoneUploadProps {
    value?: string
    thumbnailValue?: string
    onChange: (videoUrl: string) => void
    onThumbnailChange: (thumbnailUrl: string) => void
    error?: string
}

// ===== 2. Component =====
export function VideoDropzoneUpload({ value, onChange, onThumbnailChange, error }: VideoDropzoneUploadProps) {
    const t = useTranslations('content.uploader')

    // ===== 3. State & Refs =====
    const [isDragging, setIsDragging] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isExtractingFrame, setIsExtractingFrame] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadMutation = useUploadMedia()

    // ===== 4. Handlers =====
    const handleExtractThumbnail = useCallback(
        async (videoSource: string) => {
            if (!videoSource) return
            setIsExtractingFrame(true)
            try {
                const thumbDataUrl = await extractVideoFrame(videoSource)
                onThumbnailChange(thumbDataUrl)
                toast.success(t('extractFrameSuccess'))
            } catch {
                if (!videoSource.endsWith('.m3u8')) onThumbnailChange(`${videoSource}#t=0.0001`)
            } finally {
                setIsExtractingFrame(false)
            }
        },
        [onThumbnailChange, t],
    )

    const handleProcessFile = useCallback(
        async (file: File) => {
            if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
                toast.error(t('invalidFormat'))
                return
            }
            if (file.size > MAX_VIDEO_SIZE_BYTES) {
                toast.error(`${t('sizeExceeded')} (${formatBytes(file.size)})`)
                return
            }

            setSelectedFile(file)
            const localBlobUrl = URL.createObjectURL(file)
            setPreviewBlobUrl(localBlobUrl)
            void handleExtractThumbnail(localBlobUrl)

            setUploadProgress(10)
            try {
                const assets = await uploadMutation.mutateAsync({
                    files: [file],
                    ownerType: 'GENERAL',
                    onProgress: (percent) => setUploadProgress(Math.min(95, Math.max(10, percent))),
                })
                setUploadProgress(100)
                const uploadedAsset = assets[0]
                const finalUrl = uploadedAsset?.originalUrl || localBlobUrl
                onChange(finalUrl)
                toast.success(t('uploadSuccess'))
            } catch {
                onChange(localBlobUrl)
                setUploadProgress(100)
                toast.info(t('cachedFallback'))
            }
        },
        [handleExtractThumbnail, onChange, t, uploadMutation],
    )

    const handleRemoveVideo = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedFile(null)
        setPreviewBlobUrl(null)
        setUploadProgress(0)
        onChange('')
        onThumbnailChange('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleUseSample = (e: React.MouseEvent) => {
        e.stopPropagation()
        const sampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        const sampleThumb =
            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
        onChange(sampleUrl)
        onThumbnailChange(sampleThumb)
        setPreviewBlobUrl(sampleUrl)
        toast.success(t('uploadSuccess'))
    }

    const activeDisplayUrl = previewBlobUrl || value

    // ===== 5. Render =====
    return (
        <div className="space-y-3">
            <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleProcessFile(file)
                }}
            />

            {!activeDisplayUrl ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                    }}
                    onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        const file = e.dataTransfer.files[0]
                        if (file) void handleProcessFile(file)
                    }}
                    className={cn(
                        'group relative flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl cursor-pointer border-2 border-dashed transition-all duration-300',
                        isDragging
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : error
                              ? 'border-red-500/70 bg-red-500/5'
                              : 'border-border/80 hover:border-emerald-500/60',
                    )}
                >
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-all shadow-md">
                        <UploadCloud className="size-7" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                        <p className="font-bold text-sm text-foreground">
                            {t('dropzoneTitle')}{' '}
                            <span className="text-emerald-600 dark:text-emerald-400 underline">{t('browse')}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{t('hint')}</p>
                        <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 font-medium pt-1">
                            ✨ {t('featureHint')}
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t('samplePrompt')}</span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleUseSample}
                            className="h-7 text-xs rounded-lg border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        >
                            <Sparkles className="size-3 mr-1" />
                            {t('useSample')}
                        </Button>
                    </div>
                </div>
            ) : (
                <VideoPreviewCard
                    file={selectedFile}
                    displayUrl={activeDisplayUrl}
                    isUploading={uploadMutation.isPending}
                    uploadProgress={uploadProgress}
                    isExtractingFrame={isExtractingFrame}
                    onOpenPicker={() => fileInputRef.current?.click()}
                    onRemove={handleRemoveVideo}
                    onExtractFrame={() => handleExtractThumbnail(activeDisplayUrl)}
                />
            )}

            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {error}
                </p>
            )}
        </div>
    )
}
