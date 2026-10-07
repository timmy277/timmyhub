import { z } from 'zod'

import {
    ALLOWED_ALL_MIME_TYPES,
    MEDIA_OWNER_TYPE,
    MEDIA_STATUS,
    MEDIA_TYPE,
    MAX_VIDEO_SIZE_BYTES,
} from './media.constants'

// ===== Enums =====

export const MediaTypeEnum = z.enum([MEDIA_TYPE.IMAGE, MEDIA_TYPE.VIDEO])
export const MediaStatusEnum = z.enum([
    MEDIA_STATUS.UPLOADING,
    MEDIA_STATUS.PROCESSING,
    MEDIA_STATUS.READY,
    MEDIA_STATUS.FAILED,
])
export const MediaOwnerTypeEnum = z.enum([
    MEDIA_OWNER_TYPE.AVATAR,
    MEDIA_OWNER_TYPE.PRODUCT,
    MEDIA_OWNER_TYPE.PRODUCT_VARIANT,
    MEDIA_OWNER_TYPE.POST,
    MEDIA_OWNER_TYPE.REVIEW,
    MEDIA_OWNER_TYPE.AD_CREATIVE,
    MEDIA_OWNER_TYPE.SELLER_VERIFICATION,
    MEDIA_OWNER_TYPE.GENERAL,
])

// ===== Schemas =====

export const MediaVariantSchema = z.object({
    id: z.string(),
    assetId: z.string(),
    resolution: z.string(),
    bitrateKbps: z.number(),
    url: z.string().url(),
})

export type MediaVariant = z.infer<typeof MediaVariantSchema>

export const MediaAssetSchema = z.object({
    id: z.string(),
    ownerId: z.string(),
    ownerType: MediaOwnerTypeEnum,
    type: MediaTypeEnum,
    status: MediaStatusEnum,
    originalUrl: z.string().nullable(),
    hlsMasterUrl: z.string().nullable().optional(),
    thumbnailUrl: z.string().nullable().optional(),
    durationMs: z.number().nullable().optional(),
    sizeBytes: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    failReason: z.string().nullable().optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    variants: z.array(MediaVariantSchema).optional(),
})

export type MediaAsset = z.infer<typeof MediaAssetSchema>

export const AllowedMimeTypeSchema = z.enum(ALLOWED_ALL_MIME_TYPES)

export const CreatePresignedUrlSchema = z.object({
    filename: z.string().min(1, 'validation.filenameRequired').max(255, 'validation.filenameMax'),
    mimeType: AllowedMimeTypeSchema,
    sizeBytes: z.number().positive().max(MAX_VIDEO_SIZE_BYTES, 'validation.fileSizeExceeded'),
    ownerType: MediaOwnerTypeEnum.default(MEDIA_OWNER_TYPE.GENERAL),
    ownerId: z.string().optional(),
})

export type CreatePresignedUrlDto = z.infer<typeof CreatePresignedUrlSchema>

export const PresignedUrlResponseSchema = z.object({
    assetId: z.string(),
    uploadUrl: z.string(),
    publicUrl: z.string(),
    key: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    expiresInSeconds: z.number(),
})

export type PresignedUrlResponse = z.infer<typeof PresignedUrlResponseSchema>

export const ConfirmMediaUploadSchema = z.object({
    assetId: z.string(),
    publicUrl: z.string().url('validation.imageUrlInvalid'),
    sizeBytes: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    durationMs: z.number().optional(),
})

export type ConfirmMediaUploadDto = z.infer<typeof ConfirmMediaUploadSchema>

export const MediaFilterSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    type: MediaTypeEnum.optional(),
    status: MediaStatusEnum.optional(),
    ownerType: MediaOwnerTypeEnum.optional(),
    ownerId: z.string().optional(),
    search: z.string().optional(),
})

export type MediaFilterDto = z.infer<typeof MediaFilterSchema>

export const MediaListResponseSchema = z.object({
    data: z.array(MediaAssetSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
})

export type MediaListResponse = z.infer<typeof MediaListResponseSchema>
