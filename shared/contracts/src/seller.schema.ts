import { z } from 'zod'

// ===== Enums =====
export const ResourceStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DELETED: 'DELETED',
} as const

export type ResourceStatusType = (typeof ResourceStatus)[keyof typeof ResourceStatus]

export const ResourceStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'DELETED'])

// ===== Schemas =====

// FEAT-SEL-001: Nộp đơn đăng ký bán hàng
export const CreateSellerApplicationSchema = z.object({
    shopName: z.string().min(3, 'Tên shop phải có ít nhất 3 ký tự').max(50, 'Tên shop không được quá 50 ký tự').trim(),
    shopDescription: z.string().max(500, 'Mô tả không được quá 500 ký tự').trim().optional(),
    idDocumentUrl: z.string().url('Đường dẫn ảnh giấy tờ không hợp lệ'),
    taxCode: z
        .string()
        .regex(/^([0-9]{10}|[0-9]{13})$/, 'Mã số thuế phải gồm 10 hoặc 13 chữ số')
        .optional()
        .or(z.literal('')),
    warehouseAddressLine: z.string().max(255, 'Địa chỉ kho không quá 255 ký tự').trim().optional(),
    provinceCode: z.string().max(20).optional(),
    districtCode: z.string().max(20).optional(),
    wardCode: z.string().max(20).optional(),
})

export type CreateSellerApplicationInput = z.infer<typeof CreateSellerApplicationSchema>

// FEAT-SEL-002: Admin duyệt / từ chối đơn đăng ký
export const ReviewSellerApplicationSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    reviewNote: z.string().max(500, 'Ghi chú không quá 500 ký tự').trim().optional(),
})

export type ReviewSellerApplicationInput = z.infer<typeof ReviewSellerApplicationSchema>

// Query danh sách đơn đăng ký cho Admin
export const SellerApplicationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    q: z.string().trim().optional(),
})

export type SellerApplicationQuery = z.infer<typeof SellerApplicationQuerySchema>

// FEAT-SEL-003: Cập nhật thông tin hồ sơ shop
export const UpdateSellerProfileSchema = z.object({
    shopName: z.string().min(3).max(50).trim().optional(),
    description: z.string().max(1000).trim().optional(),
    shopLogo: z.string().url().optional().or(z.literal('')),
    shopBanner: z.string().url().optional().or(z.literal('')),
    warehouseAddressLine: z.string().max(255).trim().optional(),
    provinceCode: z.string().max(20).optional(),
    districtCode: z.string().max(20).optional(),
    wardCode: z.string().max(20).optional(),
    returnPolicyDays: z.number().int().min(1).max(30).optional(),
    prepTimeHours: z.number().int().min(1).max(72).optional(),
})

export type UpdateSellerProfileInput = z.infer<typeof UpdateSellerProfileSchema>

// FEAT-SEL-007: Tạm ngưng shop vi phạm
export const SuspendShopSchema = z.object({
    reason: z.string().min(5, 'Lý do tạm ngưng phải từ 5 ký tự').max(500, 'Lý do không quá 500 ký tự').trim(),
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
    shopName: string
    shopSlug: string
    shopLogo?: string | null
    shopBanner?: string | null
    description?: string | null
    rating: number
    isVerified: boolean
    createdAt: string
}
