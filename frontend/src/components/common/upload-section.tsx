'use client'
import Image from 'next/image'
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import {
    AlertCircle,
    CameraIcon,
    CheckCircle2,
    Film,
    Image as ImageIcon,
    Loader2,
    Trash2,
    UploadCloud,
    X,
    ZoomIn,
    Play,
} from 'lucide-react'
import { toast } from 'sonner'

import {
    ALLOWED_IMAGE_MIME_TYPES,
    ALLOWED_VIDEO_MIME_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    type MediaAsset,
    type MediaOwnerType,
} from '@timmyhub/contracts'

import { Button } from '@/components/ui'
import { MediaLightbox, type MediaLightboxItem } from '@/features/media'
import { usePresignedUpload, useUploadMedia } from '@/hooks'
import { cn, formatBytes, generateUploadId, getFileExtension } from '@/utils'
import { UserAvatar } from './user-avatar'

// ===== Types & Interfaces =====

export type UploadAcceptType = 'all' | 'image' | 'video' | 'custom'
export type UploadVariant = 'dropzone' | 'avatar' | 'compact' | 'button'

export interface UploadQueueProgressItem {
    id: string
    file: File
    previewUrl: string
    type: 'IMAGE' | 'VIDEO'
    sizeBytes: number
    status: 'uploading' | 'success' | 'error'
    progress: number
    errorMessage?: string
    publicUrl?: string
}

export interface UploadSectionProps<TValue = string | string[] | MediaAsset | MediaAsset[] | null> {
    /** Kiểu hiển thị giao diện: 'dropzone' (kéo thả chuẩn), 'avatar' (ảnh đại diện tròn), 'compact' (hàng ngang gọn gàng), 'button' (chỉ nút bấm) */
    variant?: UploadVariant

    /** Cho phép tải nhiều file cùng lúc hay chỉ 1 file. Mặc định tự động false nếu variant='avatar' hoặc maxFiles=1 */
    multiple?: boolean

    /** Số lượng file tối đa cho phép */
    maxFiles?: number

    /** Nhóm loại file cho phép: 'all' (ảnh & video), 'image' (chỉ ảnh), 'video' (chỉ video), 'custom' (tùy biến) */
    acceptType?: UploadAcceptType

    /** Chuỗi mime types / extensions tùy biến cho input[accept] (VD: '.pdf,image/png,image/jpeg') */
    accept?: string

    /** Danh sách đuôi mở rộng cho phép kiểm tra (VD: ['.jpg', '.png', '.mp4']) */
    allowedExtensions?: string[]

    /** Danh sách MIME types cho phép kiểm tra */
    allowedMimeTypes?: string[]

    /** Giới hạn dung lượng tối đa cho mỗi file tính theo MB (Mặc định: 5MB cho ảnh, 100MB cho video) */
    maxSizeInMb?: number

    /** Giá trị hiện tại: URL ảnh/video (chuỗi), MediaAsset, hoặc mảng các URL/MediaAsset */
    value?: TValue

    /** Callback khi giá trị thay đổi (thêm mới hoặc xoá) */
    onChange?: (value: TValue) => void

    /** Callback khi các file tải lên hoàn tất */
    onUploadSuccess?: (assets: MediaAsset[]) => void

    /** Callback khi xảy ra lỗi tải lên */
    onUploadError?: (error: Error) => void

    /** Callback khi một file bị xoá */
    onRemove?: (removedItem: string | MediaAsset, index: number) => void

    /** Loại tài nguyên sở hữu trong S3 / backend: 'AVATAR', 'PRODUCT', 'GENERAL', ... */
    ownerType?: MediaOwnerType | string

    /** ID của đối tượng sở hữu (userId, productId, ...) */
    ownerId?: string

    /** Chế độ upload: 'presigned' (trực tiếp S3) hoặc 'direct' (multipart qua backend) */
    uploadMode?: 'presigned' | 'direct'

    /** Tiêu đề / Nhãn phía trên */
    label?: ReactNode

    /** Mô tả chi tiết */
    description?: ReactNode

    /** Dòng chữ hướng dẫn định dạng/dung lượng */
    helperText?: ReactNode

    /** Thông báo lỗi validation nếu có */
    error?: string

    /** Vô hiệu hóa tương tác */
    disabled?: boolean

    /** Bắt buộc */
    required?: boolean

    /** Tên người dùng hiển thị (tạo chữ cái tắt khi variant='avatar') */
    name?: string

    /** Hiển thị danh sách card preview các file đã tải (Mặc định: true) */
    showPreview?: boolean

    /** CSS class tùy biến bao ngoài */
    className?: string

    /** Căn chỉnh layout: 'left' (mặc định) hoặc 'center' (căn giữa) */
    align?: 'left' | 'center'

    /** CSS class tùy biến cho khung dropzone */
    dropzoneClassName?: string
}

// ===== Helper Functions =====

function isVideoUrl(url: string): boolean {
    const ext = url.split('?')[0]?.split('.').pop()?.toLowerCase()
    return ext ? ['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(ext) : false
}

function normalizeToUrl(item: string | MediaAsset): string {
    if (typeof item === 'string') return item
    return item.originalUrl || item.thumbnailUrl || ''
}

// ===== UploadSection Component =====

export function UploadSection<TValue = string | string[] | MediaAsset | MediaAsset[] | null>(
    props: UploadSectionProps<TValue>,
) {
    const {
        variant = 'dropzone',
        multiple,
        maxFiles = 10,
        acceptType = 'all',
        accept,
        allowedExtensions,
        allowedMimeTypes,
        maxSizeInMb,
        value,
        onChange,
        onUploadSuccess,
        onUploadError,
        onRemove,
        ownerType = 'GENERAL',
        ownerId,
        uploadMode = 'presigned',
        label,
        description,
        helperText,
        error,
        disabled = false,
        required = false,
        name = 'User',
        showPreview = true,
        className,
        align = 'left',
        dropzoneClassName,
    } = props
    // ===== Derived Multiple & MaxFiles =====
    const isMultiple = multiple !== undefined ? multiple : variant !== 'avatar' && maxFiles > 1
    const effectiveMaxFiles = isMultiple ? maxFiles : 1

    // ===== Input File Ref & State =====
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [queue, setQueue] = useState<UploadQueueProgressItem[]>([])
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

    // ===== Upload Mutations =====
    const presignedUpload = usePresignedUpload()
    const directUpload = useUploadMedia()
    const isUploading =
        queue.some((item) => item.status === 'uploading') || presignedUpload.isPending || directUpload.isPending

    // ===== Computed Accept MIME String =====
    const computedAccept = useMemo(() => {
        if (accept) return accept
        if (acceptType === 'image') return ALLOWED_IMAGE_MIME_TYPES.join(',')
        if (acceptType === 'video') return ALLOWED_VIDEO_MIME_TYPES.join(',')
        if (acceptType === 'all') return [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES].join(',')
        return undefined
    }, [accept, acceptType])

    // ===== Existing Values List =====
    const existingItems = useMemo<Array<string | MediaAsset>>(() => {
        if (!value) return []
        if (Array.isArray(value)) return value as unknown as Array<string | MediaAsset>
        return [value as unknown as string | MediaAsset]
    }, [value])

    // ===== Lightbox Items List =====
    const allLightboxItems = useMemo<MediaLightboxItem[]>(() => {
        return existingItems.map((it, i) => {
            const url = normalizeToUrl(it)
            return {
                url,
                type: isVideoUrl(url) ? 'VIDEO' : 'IMAGE',
                title: `Tệp ${i + 1}`,
            }
        })
    }, [existingItems])

    // ===== Default Helper Text =====
    const defaultHelperText = useMemo(() => {
        if (helperText) return helperText
        if (variant === 'avatar') return 'Hỗ trợ ảnh PNG, JPG, WEBP hoặc GIF (tối đa 5MB).'
        if (acceptType === 'image') return `Hỗ trợ ảnh PNG, JPG, WEBP, GIF (tối đa ${maxSizeInMb ?? 5}MB).`
        if (acceptType === 'video') return `Hỗ trợ video MP4, WEBM, MOV (tối đa ${maxSizeInMb ?? 100}MB).`
        return `Hỗ trợ ảnh (tối đa ${maxSizeInMb ?? 5}MB) và video (tối đa ${maxSizeInMb ?? 100}MB).`
    }, [acceptType, helperText, maxSizeInMb, variant])

    // ===== File Validation =====
    const validateFile = useCallback(
        (file: File): string | null => {
            const ext = `.${getFileExtension(file.name)}`
            const mime = file.type

            // Check custom extensions
            if (allowedExtensions && allowedExtensions.length > 0) {
                const matchExt = allowedExtensions.some((e) => e.toLowerCase() === ext.toLowerCase())
                if (!matchExt) return `Đuôi file "${ext}" không nằm trong danh sách cho phép.`
            }

            // Check custom mime types
            if (allowedMimeTypes && allowedMimeTypes.length > 0) {
                if (!allowedMimeTypes.includes(mime)) {
                    return `Định dạng "${mime}" không được hỗ trợ.`
                }
            }

            // Check predefined accept types
            const isImage = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
            const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime)

            if (acceptType === 'image' && !isImage) {
                return `"${file.name}" không phải là định dạng hình ảnh hợp lệ.`
            }
            if (acceptType === 'video' && !isVideo) {
                return `"${file.name}" không phải là định dạng video hợp lệ.`
            }
            if (acceptType === 'all' && !isImage && !isVideo) {
                return `"${file.name}" không phải là ảnh hoặc video hợp lệ.`
            }

            // Check file size
            let limitBytes = maxSizeInMb ? maxSizeInMb * 1024 * 1024 : undefined
            if (!limitBytes) {
                limitBytes = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES
            }

            if (file.size > limitBytes) {
                return `Dung lượng file "${file.name}" (${formatBytes(file.size)}) vượt quá giới hạn ${formatBytes(limitBytes)}.`
            }

            return null
        },
        [acceptType, allowedExtensions, allowedMimeTypes, maxSizeInMb],
    )

    // ===== Upload Worker =====
    const processUpload = useCallback(
        async (files: File[]) => {
            if (files.length === 0) return

            // Single file mode (avatar, 1 file): tự động thay thế file cũ, lấy file đầu tiên
            const filesToProcess = isMultiple ? files : files.slice(0, 1)

            // Check limit chỉ áp dụng khi ở chế độ nhiều file (multiple mode)
            if (isMultiple) {
                const currentTotal = existingItems.length + queue.length
                if (currentTotal + filesToProcess.length > effectiveMaxFiles) {
                    toast.warning(`Chỉ được phép tải lên tối đa ${effectiveMaxFiles} file.`)
                    return
                }
            }

            // Create progress queue items
            const newQueueItems: UploadQueueProgressItem[] = []
            const validFiles: File[] = []

            for (const file of filesToProcess) {
                const validationError = validateFile(file)
                if (validationError) {
                    toast.error(validationError)
                    continue
                }

                validFiles.push(file)
                const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.type)
                newQueueItems.push({
                    id: generateUploadId(),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    type: isVideo ? 'VIDEO' : 'IMAGE',
                    sizeBytes: file.size,
                    status: 'uploading',
                    progress: 1,
                })
            }

            if (newQueueItems.length === 0) return

            setQueue((prev) => (isMultiple ? [...prev, ...newQueueItems] : newQueueItems))

            const uploadedAssets: MediaAsset[] = []

            // Upload each valid file
            for (let i = 0; i < newQueueItems.length; i++) {
                const queueItem = newQueueItems[i]
                if (!queueItem) continue

                try {
                    let asset: MediaAsset

                    if (uploadMode === 'direct') {
                        const directRes = await directUpload.mutateAsync({
                            files: [queueItem.file],
                            ownerType: ownerType as string,
                            ownerId,
                            onProgress: (percent) => {
                                setQueue((prev) =>
                                    prev.map((item) =>
                                        item.id === queueItem.id ? { ...item, progress: percent } : item,
                                    ),
                                )
                            },
                        })
                        const firstAsset = directRes[0]
                        if (!firstAsset) throw new Error('Không nhận được asset sau khi tải lên')
                        asset = firstAsset
                    } else {
                        // Presigned Upload
                        asset = await presignedUpload.mutateAsync({
                            file: queueItem.file,
                            ownerType: ownerType as MediaOwnerType,
                            ownerId,
                            onProgress: (percent) => {
                                setQueue((prev) =>
                                    prev.map((item) =>
                                        item.id === queueItem.id ? { ...item, progress: percent } : item,
                                    ),
                                )
                            },
                        })
                    }

                    uploadedAssets.push(asset)
                    const publicUrl = asset.originalUrl || asset.thumbnailUrl || ''

                    setQueue((prev) =>
                        prev.map((item) =>
                            item.id === queueItem.id ? { ...item, status: 'success', progress: 100, publicUrl } : item,
                        ),
                    )
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Tải lên thất bại'
                    setQueue((prev) =>
                        prev.map((item) =>
                            item.id === queueItem.id ? { ...item, status: 'error', errorMessage: message } : item,
                        ),
                    )
                    onUploadError?.(err instanceof Error ? err : new Error(message))
                    toast.error(`Lỗi khi tải "${queueItem.file.name}": ${message}`)
                }
            }

            // Sync with onChange & onUploadSuccess
            if (uploadedAssets.length > 0) {
                onUploadSuccess?.(uploadedAssets)

                const newUrls = uploadedAssets.map((a) => a.originalUrl || a.thumbnailUrl || '')
                if (isMultiple) {
                    const updated = [...existingItems.map(normalizeToUrl), ...newUrls]
                    ;(onChange as ((val: unknown) => void) | undefined)?.(updated)
                } else {
                    ;(onChange as ((val: unknown) => void) | undefined)?.(newUrls[0] ?? null)
                }
                toast.success(`Đã tải lên thành công ${uploadedAssets.length} file.`)

                // Xoá các file đã tải lên thành công khỏi queue để tránh hiển thị duplicate với existingItems
                setQueue((prev) => prev.filter((item) => item.status !== 'success'))
            }
        },
        [
            directUpload,
            effectiveMaxFiles,
            existingItems,
            isMultiple,
            onChange,
            onUploadError,
            onUploadSuccess,
            ownerId,
            ownerType,
            presignedUpload,
            queue.length,
            uploadMode,
            validateFile,
        ],
    )

    // ===== Handlers =====
    const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : []
        if (files.length > 0) {
            void processUpload(files)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!disabled && !isUploading) {
            setIsDragging(true)
        }
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)
        if (disabled || isUploading) return

        const files = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : []
        if (files.length > 0) {
            void processUpload(files)
        }
    }

    const handleTriggerClick = () => {
        if (!disabled && !isUploading) {
            fileInputRef.current?.click()
        }
    }

    const handleRemoveExisting = (indexToRemove: number) => {
        const itemToRemove = existingItems[indexToRemove]
        if (!itemToRemove) return

        onRemove?.(itemToRemove, indexToRemove)

        if (isMultiple) {
            const next = existingItems.filter((_, idx) => idx !== indexToRemove).map(normalizeToUrl)
            ;(onChange as ((val: unknown) => void) | undefined)?.(next)
        } else {
            ;(onChange as ((val: unknown) => void) | undefined)?.(null)
        }
    }

    const handleRemoveQueueItem = (id: string) => {
        setQueue((prev) => prev.filter((item) => item.id !== id))
    }

    // ==========================================
    // RENDER: VARIANT 'avatar'
    // ==========================================
    if (variant === 'avatar') {
        const avatarUrl = existingItems[0] ? normalizeToUrl(existingItems[0]) : null
        const activeQueueItem = queue[0]

        return (
            <div className={cn('flex flex-col gap-2', align === 'center' ? 'items-center text-center' : '', className)}>
                {label && (
                    <label className="text-sm font-medium leading-none text-foreground">
                        {label} {required && <span className="text-destructive">*</span>}
                    </label>
                )}

                <div
                    className={cn(
                        'flex gap-3',
                        align === 'center'
                            ? 'flex-col items-center justify-center text-center'
                            : 'flex-col sm:flex-row sm:items-center sm:gap-5',
                    )}
                >
                    {/* Avatar Circle Container */}
                    <div
                        className={cn(
                            'group relative size-24 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 transition-all duration-200 select-none',
                            isDragging
                                ? 'border-primary ring-4 ring-primary/20 scale-105'
                                : 'border-border hover:border-primary/60 hover:shadow-md',
                            disabled || isUploading ? 'pointer-events-none opacity-80' : '',
                            error ? 'border-destructive ring-2 ring-destructive/20' : '',
                        )}
                        onClick={handleTriggerClick}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        title="Bấm để chọn ảnh hoặc kéo thả ảnh vào đây"
                    >
                        <UserAvatar
                            name={name}
                            imageUrl={avatarUrl}
                            className="size-full rounded-full"
                            fallbackClassName="text-2xl font-bold rounded-full"
                        />

                        {/* Hover Overlay */}
                        {!isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
                                <CameraIcon className="size-6 text-white" />
                                <span className="mt-1 text-[10px] font-medium tracking-tight text-white/90">
                                    Thay ảnh
                                </span>
                            </div>
                        )}

                        {/* Uploading Spinner Overlay */}
                        {isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                                <Loader2 className="size-6 animate-spin text-white" />
                                {activeQueueItem && (
                                    <span className="mt-1 text-[11px] font-semibold text-white">
                                        {activeQueueItem.progress}%
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons & Guidance */}
                    <div className={cn('flex flex-col gap-1.5', align === 'center' ? 'items-center text-center' : '')}>
                        <div
                            className={cn(
                                'flex flex-wrap items-center gap-2',
                                align === 'center' ? 'justify-center' : '',
                            )}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleTriggerClick}
                                disabled={disabled || isUploading}
                            >
                                <UploadCloud data-icon="inline-start" className="size-4" />
                                {isUploading ? 'Đang tải lên...' : avatarUrl ? 'Đổi ảnh đại diện' : 'Tải ảnh lên'}
                            </Button>

                            {avatarUrl && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleRemoveExisting(0)}
                                    disabled={disabled || isUploading}
                                >
                                    <Trash2 data-icon="inline-start" className="size-4" />
                                    Gỡ ảnh
                                </Button>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">{defaultHelperText}</p>
                        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={computedAccept}
                    multiple={false}
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={disabled || isUploading}
                />
            </div>
        )
    }

    // ==========================================
    // RENDER: VARIANT 'compact' OR 'button'
    // ==========================================
    if (variant === 'button' || variant === 'compact') {
        return (
            <div className={cn('flex flex-col gap-2', className)}>
                {label && (
                    <label className="text-sm font-medium leading-none text-foreground">
                        {label} {required && <span className="text-destructive">*</span>}
                    </label>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTriggerClick}
                        disabled={disabled || isUploading}
                    >
                        {isUploading ? (
                            <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
                        ) : (
                            <UploadCloud data-icon="inline-start" className="size-4" />
                        )}
                        {isUploading ? 'Đang tải lên...' : 'Chọn tệp'}
                    </Button>

                    <span className="text-xs text-muted-foreground">{defaultHelperText}</span>
                </div>

                {/* Compact Previews */}
                {showPreview && existingItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {existingItems.map((item, idx) => {
                            const url = normalizeToUrl(item)
                            const isVid = isVideoUrl(url)
                            return (
                                <div
                                    key={idx}
                                    className="group relative flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground"
                                >
                                    {isVid ? (
                                        <Film className="size-3.5 text-muted-foreground" />
                                    ) : (
                                        <ImageIcon className="size-3.5 text-muted-foreground" />
                                    )}
                                    <span className="max-w-[140px] truncate">{url.split('/').pop()}</span>
                                    <Button
                                        type="button"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRemoveExisting(idx)}
                                        disabled={disabled}
                                        variant="ghost"
                                    >
                                        <X className="size-3.5" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {error && <p className="text-xs font-medium text-destructive">{error}</p>}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={computedAccept}
                    multiple={isMultiple}
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={disabled || isUploading}
                />
            </div>
        )
    }

    // ==========================================
    // RENDER: VARIANT 'dropzone' (DEFAULT)
    // ==========================================
    return (
        <div className={cn('flex flex-col gap-3', className)}>
            {/* Header info */}
            {(label || description) && (
                <div className="flex flex-col gap-1">
                    {label && (
                        <label className="text-sm font-medium leading-none text-foreground">
                            {label} {required && <span className="text-destructive">*</span>}
                        </label>
                    )}
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
            )}

            {/* Dropzone Box */}
            <div
                className={cn(
                    'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer select-none',
                    isDragging
                        ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-[1.01]'
                        : 'border-border/80 hover:border-primary/60 hover:bg-muted/30',
                    disabled || isUploading ? 'pointer-events-none opacity-60' : '',
                    error ? 'border-destructive ring-2 ring-destructive/20' : '',
                    dropzoneClassName,
                )}
                onClick={handleTriggerClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                    <UploadCloud className="size-6" />
                </div>

                <div className="mt-3 flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">
                        Kéo thả file vào đây, hoặc{' '}
                        <span className="font-semibold text-primary underline underline-offset-2">
                            chọn từ máy tính
                        </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{defaultHelperText}</p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={computedAccept}
                    multiple={isMultiple}
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={disabled || isUploading}
                />
            </div>

            {error && <p className="text-xs font-medium text-destructive">{error}</p>}

            {/* Preview Section */}
            {showPreview &&
                (queue.some((i) => i.status === 'uploading' || i.status === 'error') || existingItems.length > 0) && (
                    <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                Đã tải lên: {existingItems.length}
                                {isMultiple && ` / tối đa ${effectiveMaxFiles}`}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {/* 1. Existing Saved Files */}
                            {existingItems.map((item, idx) => {
                                const url = normalizeToUrl(item)
                                const isVid = isVideoUrl(url)

                                return (
                                    <div
                                        key={`existing-${idx}`}
                                        className="group relative flex aspect-square flex-col overflow-hidden rounded-2xl border-2 border-border/80 bg-muted/20 shadow-2xs transition-all duration-200 hover:border-primary/70 hover:shadow-md cursor-pointer select-none"
                                        onClick={() => setLightboxIndex(idx)}
                                    >
                                        {isVid ? (
                                            <div className="relative size-full flex items-center justify-center bg-black/90">
                                                <video src={url} className="size-full object-cover" muted playsInline />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                                                    <div className="size-9 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                                                        <Play className="size-4 fill-white text-white ml-0.5" />
                                                    </div>
                                                </div>
                                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm">
                                                    <Film className="size-2.5 text-amber-400" /> Video
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="relative size-full">
                                                <Image
                                                    src={url}
                                                    alt=""
                                                    fill
                                                    sizes="(max-width: 640px) 140px, 180px"
                                                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                        )}

                                        {/* Top left badge: Index */}
                                        <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-black/60 text-white font-mono text-[10px] font-bold backdrop-blur-md pointer-events-none">
                                            #{idx + 1}
                                        </span>

                                        {/* Top right: Always accessible delete button */}
                                        <Button
                                            type="button"
                                            className="absolute top-1.5 right-1.5 z-20 size-6 sm:size-7 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveExisting(idx)
                                            }}
                                            disabled={disabled}
                                            title="Xoá file này"
                                            aria-label="Xoá file"
                                            variant="ghost"
                                        >
                                            <X className="size-3.5" />
                                        </Button>

                                        {/* Center Hover Action Hint */}
                                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px] pointer-events-none">
                                            <div className="size-8 rounded-full bg-white/25 text-white backdrop-blur-md flex items-center justify-center shadow-sm">
                                                <ZoomIn className="size-4" />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* 2. In-Progress Uploading Items */}
                            {queue
                                .filter((item) => item.status === 'uploading' || item.status === 'error')
                                .map((item) => (
                                    <div
                                        key={item.id}
                                        className="relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl border-2 border-border/80 bg-muted/40 p-2 shadow-2xs"
                                    >
                                        {item.type === 'VIDEO' ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                                                <Film className="size-8 text-white/50" />
                                            </div>
                                        ) : (
                                            <Image
                                                src={item.previewUrl}
                                                alt=""
                                                fill
                                                unoptimized
                                                sizes="120px"
                                                className="size-full object-cover opacity-60"
                                            />
                                        )}

                                        <div className="relative z-10 flex flex-col gap-1 rounded-xl bg-black/80 p-1.5 sm:p-2 text-white backdrop-blur-md">
                                            <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                                                <span className="truncate max-w-[65px] font-medium">
                                                    {item.file.name}
                                                </span>
                                                {item.status === 'uploading' && (
                                                    <span className="font-semibold font-mono">{item.progress}%</span>
                                                )}
                                                {item.status === 'success' && (
                                                    <CheckCircle2 className="size-3 text-emerald-400" />
                                                )}
                                                {item.status === 'error' && (
                                                    <AlertCircle className="size-3 text-rose-400" />
                                                )}
                                            </div>

                                            {item.status === 'uploading' && (
                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-200"
                                                        style={{ width: `${item.progress}%` }}
                                                    />
                                                </div>
                                            )}

                                            {item.status === 'error' && (
                                                <div className="flex items-center justify-between pt-0.5 text-[10px] text-rose-300">
                                                    <span>Lỗi tải lên</span>
                                                    <Button
                                                        type="button"
                                                        className="text-white hover:underline font-medium"
                                                        onClick={() => handleRemoveQueueItem(item.id)}
                                                        variant="ghost"
                                                    >
                                                        Bỏ qua
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

            {/* Lightbox Viewer */}
            {lightboxIndex !== null && (
                <MediaLightbox
                    items={allLightboxItems}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </div>
    )
}
