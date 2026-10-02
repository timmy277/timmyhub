'use client'

import { useCallback, useRef, useState } from 'react'
import {
    UploadCloud,
    Film,
    Image as ImageIcon,
    Sparkles,
    Trash2,
    CheckCircle2,
    Loader2,
    Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import {
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_VIDEO_EXTENSIONS,
    ALLOWED_IMAGE_MIME_TYPES,
    ALLOWED_VIDEO_MIME_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    DEFAULT_MAX_FILES,
    MediaAsset,
    MediaOwnerType,
} from '@timmyhub/contracts'

import { usePresignedUpload, useUploadMedia } from '@/hooks'
import { generateUploadId } from '@/utils'
import { MediaLightbox, type MediaLightboxItem } from './media-lightbox'
import { MediaPreviewCard, type UploadQueueItem } from './media-preview-card'

export interface MediaUploaderProps {
    acceptType?: 'all' | 'image' | 'video'
    maxFiles?: number
    ownerType?: MediaOwnerType
    ownerId?: string
    onUploadSuccess?: (uploadedAssets: MediaAsset[]) => void
    className?: string
    uploadMode?: 'direct' | 'presigned'
}

export function MediaUploader({
    acceptType = 'all',
    maxFiles = DEFAULT_MAX_FILES,
    ownerType = 'GENERAL',
    ownerId,
    onUploadSuccess,
    className = '',
    uploadMode = 'presigned',
}: MediaUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [queue, setQueue] = useState<UploadQueueItem[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [lightboxItem, setLightboxItem] = useState<MediaLightboxItem | null>(null)

    const uploadMediaMutation = useUploadMedia()
    const presignedUploadMutation = usePresignedUpload()

    // Determine accepted MIME types string
    const acceptMimeString =
        acceptType === 'image'
            ? ALLOWED_IMAGE_MIME_TYPES.join(',')
            : acceptType === 'video'
              ? ALLOWED_VIDEO_MIME_TYPES.join(',')
              : [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES].join(',')

    // Handle files validation and adding to queue
    const handleAddFiles = useCallback(
        (files: FileList | File[]) => {
            const fileArray = Array.from(files)
            if (fileArray.length === 0) return

            if (queue.length + fileArray.length > maxFiles) {
                toast.warning(`Chỉ được tải lên tối đa ${maxFiles} tập tin cùng lúc`)
                return
            }

            const newItems: UploadQueueItem[] = []

            for (const file of fileArray) {
                const isImage = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
                const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.type)

                if (acceptType === 'image' && !isImage) {
                    toast.error(`"${file.name}" không phải định dạng ảnh được hỗ trợ`)
                    continue
                }
                if (acceptType === 'video' && !isVideo) {
                    toast.error(`"${file.name}" không phải định dạng video được hỗ trợ`)
                    continue
                }
                if (!isImage && !isVideo) {
                    toast.error(`"${file.name}" định dạng không hợp lệ`)
                    continue
                }

                // Check size limits
                if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
                    toast.error(
                        `"${file.name}" vượt quá giới hạn ảnh ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`,
                    )
                    continue
                }
                if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
                    toast.error(
                        `"${file.name}" vượt quá giới hạn video ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024}MB`,
                    )
                    continue
                }

                const previewUrl = URL.createObjectURL(file)
                newItems.push({
                    id: generateUploadId(),
                    file,
                    previewUrl,
                    type: isVideo ? 'VIDEO' : 'IMAGE',
                    sizeBytes: file.size,
                    status: 'idle',
                    progress: 0,
                })
            }

            if (newItems.length > 0) {
                setQueue((prev) => [...prev, ...newItems])
            }
        },
        [acceptType, maxFiles, queue.length],
    )

    // Drag and drop event handlers
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        if (e.dataTransfer.files) {
            handleAddFiles(e.dataTransfer.files)
        }
    }

    // Remove item from queue
    const handleRemove = (id: string) => {
        setQueue((prev) => {
            const target = prev.find((item) => item.id === id)
            if (target) {
                URL.revokeObjectURL(target.previewUrl)
            }
            return prev.filter((item) => item.id !== id)
        })
    }

    // Clear completed items
    const handleClearCompleted = () => {
        setQueue((prev) => {
            prev.filter((i) => i.status === 'success').forEach((i) => URL.revokeObjectURL(i.previewUrl))
            return prev.filter((i) => i.status !== 'success')
        })
    }

    // Upload single item via S3 presigned URL
    const uploadSinglePresigned = async (item: UploadQueueItem): Promise<MediaAsset | null> => {
        setQueue((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: 5 } : i)),
        )

        try {
            const asset = await presignedUploadMutation.mutateAsync({
                file: item.file,
                ownerType,
                ownerId,
                onProgress: (percent) => {
                    setQueue((prev) =>
                        prev.map((i) => (i.id === item.id ? { ...i, progress: percent } : i)),
                    )
                },
            })

            setQueue((prev) =>
                prev.map((i) =>
                    i.id === item.id
                        ? {
                              ...i,
                              status: 'success',
                              progress: 100,
                              publicUrl: asset.originalUrl ?? undefined,
                          }
                        : i,
                ),
            )
            return asset
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Tải lên thất bại'
            setQueue((prev) =>
                prev.map((i) =>
                    i.id === item.id
                        ? { ...i, status: 'error', progress: 0, errorMessage: message }
                        : i,
                ),
            )
            return null
        }
    }

    // Upload all pending items
    const handleUploadAll = async () => {
        const pendingItems = queue.filter((item) => item.status === 'idle' || item.status === 'error')
        if (pendingItems.length === 0) return

        if (uploadMode === 'presigned') {
            const results: MediaAsset[] = []
            for (const item of pendingItems) {
                const asset = await uploadSinglePresigned(item)
                if (asset) results.push(asset)
            }
            if (results.length > 0) {
                toast.success(`Đã tải lên thành công ${results.length} tập tin!`)
                onUploadSuccess?.(results)
            }
        } else {
            // Direct multipart batch upload
            try {
                const files = pendingItems.map((i) => i.file)
                setQueue((prev) =>
                    prev.map((i) => (pendingItems.some((p) => p.id === i.id) ? { ...i, status: 'uploading', progress: 20 } : i)),
                )

                const assets = await uploadMediaMutation.mutateAsync({
                    files,
                    ownerType,
                    ownerId,
                    onProgress: (percent) => {
                        setQueue((prev) =>
                            prev.map((i) => (pendingItems.some((p) => p.id === i.id) ? { ...i, progress: percent } : i)),
                        )
                    },
                })

                setQueue((prev) =>
                    prev.map((i) => {
                        const matched = assets.find((a) => a.originalUrl?.includes(i.file.name))
                        return {
                            ...i,
                            status: 'success',
                            progress: 100,
                            publicUrl: matched?.originalUrl ?? undefined,
                        }
                    }),
                )
                toast.success(`Đã tải lên thành công ${assets.length} tập tin!`)
                onUploadSuccess?.(assets)
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Tải lên thất bại'
                setQueue((prev) =>
                    prev.map((i) =>
                        pendingItems.some((p) => p.id === i.id)
                            ? { ...i, status: 'error', errorMessage: message }
                            : i,
                    ),
                )
                toast.error(message)
            }
        }
    }

    const isUploading = queue.some((i) => i.status === 'uploading')
    const pendingCount = queue.filter((i) => i.status === 'idle' || i.status === 'error').length
    const successCount = queue.filter((i) => i.status === 'success').length

    return (
        <div className={`w-full flex flex-col gap-4 ${className}`}>
            {/* Drop Zone Area */}
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                    isDragging
                        ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-950/30 scale-[1.01] shadow-lg shadow-sky-500/10'
                        : 'border-neutral-300 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/40 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-neutral-100/60 dark:hover:bg-neutral-900/80'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={acceptMimeString}
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) handleAddFiles(e.target.files)
                        e.target.value = ''
                    }}
                />

                <div className="flex flex-col items-center text-center gap-3">
                    <div
                        className={`p-4 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 dark:from-sky-500/30 dark:to-indigo-500/30 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform duration-300 shadow-inner`}
                    >
                        <UploadCloud className="w-8 h-8" />
                    </div>

                    <div>
                        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100 flex items-center justify-center gap-1.5">
                            Kéo thả media vào đây hoặc <span className="text-sky-500 underline underline-offset-4">chọn tập tin</span>
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Hỗ trợ tải lên nhiều tập tin: Ảnh ({ALLOWED_IMAGE_EXTENSIONS.join(', ')} tối đa {MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB) • Video ({ALLOWED_VIDEO_EXTENSIONS.join(', ')} tối đa {MAX_VIDEO_SIZE_BYTES / 1024 / 1024}MB)
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span className="inline-flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Ảnh
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                            <Film className="w-3.5 h-3.5 text-amber-400" /> Video
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Chuẩn S3 / Supabase
                        </span>
                    </div>
                </div>
            </div>

            {/* Queue Action Bar */}
            {queue.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold">
                            {queue.length} tập tin
                        </span>
                        {successCount > 0 && (
                            <span className="text-emerald-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {successCount} đã xong
                            </span>
                        )}
                        {pendingCount > 0 && (
                            <span className="text-amber-500">
                                ({pendingCount} chờ tải lên)
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {successCount > 0 && (
                            <button
                                type="button"
                                onClick={handleClearCompleted}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Xoá đã xong
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" /> Thêm tập tin
                        </button>
                        {pendingCount > 0 && (
                            <button
                                type="button"
                                onClick={handleUploadAll}
                                disabled={isUploading}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải lên...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-3.5 h-3.5" /> Tải lên tất cả ({pendingCount})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Queue Cards Grid */}
            {queue.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {queue.map((item) => (
                        <MediaPreviewCard
                            key={item.id}
                            item={item}
                            onRemove={handleRemove}
                            onRetry={(id) => {
                                const target = queue.find((i) => i.id === id)
                                if (target) void uploadSinglePresigned(target)
                            }}
                            onOpenLightbox={(url, type, title) =>
                                setLightboxItem({ url, type, title })
                            }
                        />
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            <MediaLightbox
                item={lightboxItem}
                onClose={() => setLightboxItem(null)}
            />
        </div>
    )
}
