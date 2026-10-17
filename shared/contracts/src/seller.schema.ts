import { z } from 'zod'

import { REVIEW_ACTION } from './product.schema'

// ===== Enums =====
export const ResourceStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DELETED: 'DELETED',
} as const

export type ResourceStatusType = (typeof ResourceStatus)[keyof typeof ResourceStatus]

export const ResourceStatusSchema = z.enum(ResourceStatus)

// Tập con trạng thái dùng cho query danh sách đơn (không bao gồm DELETED)
export const SELLER_APPLICATION_QUERY_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const

export const SellerApplicationQueryStatusSchema = z.enum(SELLER_APPLICATION_QUERY_STATUS)

// ===== Schemas =====

// FEAT-SEL-001: Nộp đơn đăng ký bán hàng
export const CreateSellerApplicationSchema = z.object({
    shopName: z.string().min(3, 'validation.shopNameMin').max(50, 'validation.shopNameMax').trim(),
    shopDescription: z.string().max(500, 'validation.shopDescriptionMax').trim().optional(),
    idDocumentUrl: z.string().url('validation.idDocumentUrlInvalid'),
    taxCode: z
        .string()
        .regex(/^([0-9]{10}|[0-9]{13})$/, 'validation.taxCodeInvalid')
        .optional()
        .or(z.literal('')),
    warehouseAddressLine: z.string().max(255, 'validation.warehouseAddressMax').trim().optional(),
    provinceCode: z.string().max(20).optional(),
    districtCode: z.string().max(20).optional(),
    wardCode: z.string().max(20).optional(),
})

export type CreateSellerApplicationInput = z.infer<typeof CreateSellerApplicationSchema>

// FEAT-SEL-002: Admin duyệt / từ chối đơn đăng ký
export const ReviewSellerApplicationSchema = z.object({
    status: z.enum(REVIEW_ACTION),
    reviewNote: z.string().max(500, 'validation.reviewNoteMax').trim().optional(),
})

export type ReviewSellerApplicationInput = z.infer<typeof ReviewSellerApplicationSchema>

// Query danh sách đơn đăng ký cho Admin
export const SellerApplicationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: SellerApplicationQueryStatusSchema.optional(),
    q: z.string().trim().optional(),
})

export type SellerApplicationQuery = z.infer<typeof SellerApplicationQuerySchema>

// FEAT-SEL-003: Cập nhật thông tin hồ sơ shop
export const UpdateSellerProfileSchema = z.object({
    shopName: z.string().min(3, 'validation.shopNameMin').max(50, 'validation.shopNameMax').trim().optional(),
    description: z.string().max(1000, 'validation.shopDescriptionLongMax').trim().optional(),
    shopLogo: z
        .string()
        .refine((val) => !val || val.startsWith('/') || /^https?:\/\//i.test(val), 'validation.imageUrlInvalid')
        .optional()
        .or(z.literal('')),
    shopBanner: z
        .string()
        .refine((val) => !val || val.startsWith('/') || /^https?:\/\//i.test(val), 'validation.imageUrlInvalid')
        .optional()
        .or(z.literal('')),
    warehouseAddressLine: z.string().max(255, 'validation.warehouseAddressMax').trim().optional(),
    provinceCode: z.string().max(20).optional(),
    districtCode: z.string().max(20).optional(),
    wardCode: z.string().max(20).optional(),
    returnPolicyDays: z.number().int().min(1).max(30).optional(),
    prepTimeHours: z.number().int().min(1).max(72).optional(),
})

export type UpdateSellerProfileInput = z.infer<typeof UpdateSellerProfileSchema>

// FEAT-SEL-007: Tạm ngưng shop vi phạm
export const SuspendShopSchema = z.object({
    reason: z.string().min(5, 'validation.suspendShopReasonMin').max(500, 'validation.suspendReasonMax').trim(),
})

export type SuspendShopInput = z.infer<typeof SuspendShopSchema>

// ===== DTO Return Types =====

export type SellerApplicationDetail = {
    id: string
    userId: string
    sellerProfileId?: string | null
    shopName: string
    shopDescription?: string | null
    idDocumentUrl: string
    taxCode?: string | null
    status: ResourceStatusType
    reviewNote?: string | null
    reviewedById?: string | null
    reviewedAt?: string | null
    createdAt: string
    updatedAt: string
    user?: {
        id: string
        email: string
        name: string
        phone?: string | null
    }
}

export type SellerApplicationListResult = {
    items: SellerApplicationDetail[]
    totalItems: number
    page: number
    pageSize: number
    totalPages: number
}

export type SellerProfileDetail = {
    id: string
    userId: string
    shopName: string
    shopSlug: string
    shopLogo?: string | null
    shopBanner?: string | null
    description?: string | null
    warehouseAddressLine?: string | null
    provinceCode?: string | null
    districtCode?: string | null
    wardCode?: string | null
    status: ResourceStatusType
    isVerified: boolean
    verifiedAt?: string | null
    isSuspended: boolean
    suspendedReason?: string | null
    rating: number
    cancelRate: number
    avgResponseHours: number
    returnPolicyDays: number
    prepTimeHours: number
    createdAt: string
    updatedAt: string
}

export type PublicShopDetail = {
    id: string
    sellerId?: string
    shopName: string
    shopSlug: string
    shopLogo?: string | null
    shopBanner?: string | null
    description?: string | null
    rating: number
    isVerified: boolean
    createdAt: string
}
