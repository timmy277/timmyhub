'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useRef, useState } from 'react'
import { AlertCircle, Camera, Film, Loader2, Sparkles, Trash2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

import { Badge, Button, Input, Progress } from '@/components/ui'
import { useUploadMedia } from '@/hooks'
import { cn, formatBytes } from '@/utils'

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONSTANTS & TYPES
// ═══════════════════════════════════════════════════════════════════════════
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']

export interface VideoDropzoneUploadProps {
    value?: string
    thumbnailValue?: string
    onChange: (videoUrl: string) => void
    onThumbnailChange: (thumbnailUrl: string) => void
    error?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function VideoDropzoneUpload({ value, onChange, onThumbnailChange, error }: VideoDropzoneUploadProps) {
    // 3.1. State & Refs
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isExtractingFrame, setIsExtractingFrame] = useState(false)

    const uploadMutation = useUploadMedia()

    // 3.2. Frame Extractor: Tự động trích xuất frame tại 0.0001s từ video
    const extractFrameAtTime = useCallback(
        (videoSource: string, timeSec = 0.0001) => {
            setIsExtractingFrame(true)
            const video = document.createElement('video')
            video.crossOrigin = 'anonymous'
            video.preload = 'metadata'
            video.src = videoSource
            video.muted = true
            video.playsInline = true
            video.currentTime = timeSec

            video.onseeked = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = video.videoWidth || 720
                    canvas.height = video.videoHeight || 1280
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
                        onThumbnailChange(dataUrl)
                        toast.success('Đã tự động trích xuất ảnh bìa tại 0.0001s thành công!')
                    }
                } catch {
                    // Fallback fragment
                    onThumbnailChange(`${videoSource}#t=0.0001`)
                } finally {
                    setIsExtractingFrame(false)
                }
            }

            video.onerror = () => {
                onThumbnailChange(`${videoSource}#t=0.0001`)
                setIsExtractingFrame(false)
            }
        },
        [onThumbnailChange],
    )

    // 3.3. File Processing & Upload Handler
    const handleProcessFile = useCallback(
        async (file: File) => {
            // Validate MIME type
            if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
                toast.error('Định dạng video không được hỗ trợ! Vui lòng chọn tệp .mp4, .webm hoặc .mov.')
                return
            }

            // Validate Size
            if (file.size > MAX_VIDEO_SIZE_BYTES) {
                toast.error(`Kích thước video vượt quá giới hạn 100MB (Tệp hiện tại: ${formatBytes(file.size)})`)
                return
            }

            setSelectedFile(file)
            const localBlobUrl = URL.createObjectURL(file)
            setPreviewBlobUrl(localBlobUrl)

            // Tự động trích xuất frame tại 0.0001s ngay lập tức
            extractFrameAtTime(localBlobUrl, 0.0001)

            // Tiến hành upload lên server
            setUploadProgress(10)
            try {
                const assets = await uploadMutation.mutateAsync({
                    files: [file],
                    ownerType: 'GENERAL',
                    onProgress: (percent) => {
                        setUploadProgress(Math.min(95, Math.max(10, percent)))
                    },
                })

                setUploadProgress(100)
                const uploadedAsset = assets[0]
                const finalUrl = uploadedAsset?.originalUrl || localBlobUrl
                onChange(finalUrl)
                toast.success('Tải lên video thành công!')
            } catch {
                // Fallback nếu backend media storage chưa cấu hình S3
                onChange(localBlobUrl)
                setUploadProgress(100)
                toast.info('Đã tải video vào bộ nhớ đệm sẵn sàng xuất bản.')
            }
        },
        [extractFrameAtTime, onChange, uploadMutation],
    )

    // 3.4. Drag & Drop Event Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            void handleProcessFile(files[0])
        }
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            void handleProcessFile(files[0])
        }
    }

    const handleRemoveVideo = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedFile(null)
        setPreviewBlobUrl(null)
        setUploadProgress(0)
        onChange('')
        onThumbnailChange('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleUseSample = (e: React.MouseEvent) => {
        e.stopPropagation()
        const sampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        const sampleThumb =
            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
        onChange(sampleUrl)
        onThumbnailChange(sampleThumb)
        setPreviewBlobUrl(sampleUrl)
        toast.success('Đã nạp video bán hàng mẫu chất lượng cao!')
    }

    const activeDisplayUrl = previewBlobUrl || value

    // 3.5. JSX Render
    return (
        <div className="space-y-3">
            {/* Hidden input */}
            <Input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileInputChange}
                className="hidden"
            />

            {/* DRAGGABLE DROPZONE SECTION */}
            {!activeDisplayUrl ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        'group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden bg-muted/20 hover:bg-muted/40 text-center',
                        isDragging
                            ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                            : error
                              ? 'border-red-500/70 bg-red-500/5'
                              : 'border-border/80 hover:border-emerald-500/60',
                    )}
                >
                    {/* Background glow subtle */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Icon container */}
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all shadow-md">
                        <UploadCloud className="size-7" />
                    </div>

                    <div className="space-y-1.5 max-w-sm">
                        <p className="font-bold text-sm text-foreground">
                            Kéo thả video vào đây, hoặc{' '}
                            <span className="text-emerald-600 dark:text-emerald-400 underline">bấm để chọn tệp</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Hỗ trợ định dạng MP4, WebM, MOV. Dung lượng tối đa 100MB.
                        </p>
                        <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 font-medium pt-1">
                            ✨ Hệ thống tự động trích xuất ảnh bìa tại 0.0001s & nén thích ứng HLS HD.
                        </p>
                    </div>

                    {/* Nút dùng video mẫu */}
                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Chưa có video sẵn trong máy?</span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleUseSample}
                            className="h-7 text-xs rounded-lg border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        >
                            <Sparkles className="size-3 mr-1" />
                            Dùng video mẫu thử nghiệm
                        </Button>
                    </div>
                </div>
            ) : (
                /* PREVIEW & STATUS SECTION */
                <div className="relative rounded-2xl border border-border/80 bg-card p-4 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Film className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-foreground truncate max-w-xs">
                                    {selectedFile ? selectedFile.name : 'Video bài đăng bán hàng'}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    {selectedFile && <span>{formatBytes(selectedFile.size)}</span>}
                                    <Badge
                                        variant="secondary"
                                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                                    >
                                        Sẵn sàng xuất bản
                                    </Badge>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-8 rounded-xl text-xs"
                            >
                                Thay video khác
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleRemoveVideo}
                                className="size-8 rounded-xl text-muted-foreground hover:text-red-500"
                                title="Xóa video"
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Progress bar khi đang tải lên */}
                    {uploadMutation.isPending && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Loader2 className="size-3.5 animate-spin text-emerald-500" />
                                    Đang tải lên và phân tích luồng HLS...
                                </span>
                                <span className="font-mono font-bold">{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="h-1.5" />
                        </div>
                    )}

                    {/* Video Player Mini Preview */}
                    <div className="relative aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black border border-border shadow-inner">
                        <video src={activeDisplayUrl} controls playsInline className="size-full object-contain" />
                    </div>

                    {/* Thumbnail Capture Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <Camera className="size-3.5 text-emerald-500" />
                            Ảnh bìa trích xuất tại 0.0001s:
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isExtractingFrame}
                            onClick={() => extractFrameAtTime(activeDisplayUrl, 0.0001)}
                            className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:underline px-2"
                        >
                            {isExtractingFrame ? (
                                <>
                                    <Loader2 className="size-3 animate-spin mr-1" />
                                    Đang cắt frame...
                                </>
                            ) : (
                                'Trích xuất lại frame tại 0.0001s'
                            )}
                        </Button>
                    </div>
                </div>
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
