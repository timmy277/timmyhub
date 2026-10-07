/**
 * Media Constants & Configurations
 * Central source of truth for file types, extensions, size limits, and presets.
 */

// ===== Media Types =====

export const MEDIA_TYPE = {
    IMAGE: 'IMAGE',
    VIDEO: 'VIDEO',
} as const

export type MediaType = (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE]

export const MEDIA_STATUS = {
    UPLOADING: 'UPLOADING',
    PROCESSING: 'PROCESSING',
    READY: 'READY',
    FAILED: 'FAILED',
} as const

export type MediaStatus = (typeof MEDIA_STATUS)[keyof typeof MEDIA_STATUS]

export const MEDIA_OWNER_TYPE = {
    AVATAR: 'AVATAR',
    PRODUCT: 'PRODUCT',
    PRODUCT_VARIANT: 'PRODUCT_VARIANT',
    POST: 'POST',
    REVIEW: 'REVIEW',
    AD_CREATIVE: 'AD_CREATIVE',
    SELLER_VERIFICATION: 'SELLER_VERIFICATION',
    GENERAL: 'GENERAL',
} as const

export type MediaOwnerType = (typeof MEDIA_OWNER_TYPE)[keyof typeof MEDIA_OWNER_TYPE]

// ===== Allowed Extensions =====

export const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] as const
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv', 'avi'] as const
export const ALLOWED_ALL_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS] as const

// ===== Allowed MIME Types =====

export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] as const

export const ALLOWED_VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/x-msvideo',
] as const

export const ALLOWED_ALL_MIME_TYPES = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES] as const

// ===== File Size Limits =====

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const DEFAULT_MAX_FILES = 10

// ===== Upload Presets =====

/** Chunk size for resumable multipart/S3/Supabase tus uploads (6 MB strict) */
export const S3_UPLOAD_CHUNK_SIZE_BYTES = 6 * 1024 * 1024 // 6 MB

/** Presigned URL Expiration in seconds */
export const PRESIGNED_URL_EXPIRES_SECONDS = 30 * 60 // 30 minutes
