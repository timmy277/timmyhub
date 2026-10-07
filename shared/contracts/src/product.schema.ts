import { z } from 'zod'

import { MoneySchema } from './money.schema'

// ===== Enums =====

// Enum trạng thái vòng đời sản phẩm (khớp catalog.prisma)
export const ProductStatus = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DELETED: 'DELETED',
} as const

export type ProductStatusType = (typeof ProductStatus)[keyof typeof ProductStatus]
export const ProductStatusSchema = z.enum(ProductStatus)

// Tập hành động duyệt/từ chối dùng chung cho product & seller review
export const REVIEW_ACTION = {
    APPROVE: 'APPROVE',
    REJECT: 'REJECT',
} as const

export type ReviewAction = (typeof REVIEW_ACTION)[keyof typeof REVIEW_ACTION]
export const ReviewActionSchema = z.enum(REVIEW_ACTION)

// ===== Schemas =====

// Schema tạo tuỳ chọn sản phẩm (ví dụ: Màu sắc, Kích cỡ)
export const CreateProductOptionInputSchema = z.object({
    name: z.string().trim().min(1, 'validation.optionNameRequired').max(50, 'validation.optionNameMax'),
    values: z
        .array(z.string().trim().min(1, 'validation.optionValueRequired').max(50, 'validation.optionValueMax'))
        .min(1, 'validation.optionValuesMin')
        .max(30, 'validation.optionValuesMax'),
})
export type CreateProductOptionInput = z.infer<typeof CreateProductOptionInputSchema>

// Schema tạo biến thể sản phẩm (Variant)
export const CreateProductVariantInputSchema = z.object({
    sku: z.string().trim().max(100).optional(),
    // Map tên option -> value (ví dụ { "Màu sắc": "Đen", "Kích cỡ": "L" })
    optionValues: z.record(z.string(), z.string()).optional(),
    // Luật #1: tiền truyền qua API dạng chuỗi decimal + currency, tính bằng Prisma.Decimal
    price: MoneySchema.shape.amount,
    compareAtPrice: MoneySchema.shape.amount.optional().nullable(),
    stock: z.number().int().nonnegative('validation.stockNonNegative'),
    weightGram: z.number().int().positive('validation.weightPositive').optional().default(200),
    imageId: z.string().optional().nullable(),
    isDefault: z.boolean().optional().default(false),
})
export type CreateProductVariantInput = z.infer<typeof CreateProductVariantInputSchema>

// Schema nộp tạo sản phẩm (Seller)
export const CreateProductInputSchema = z.object({
    name: z.string().trim().min(3, 'validation.productNameMin').max(200, 'validation.productNameMax'),
    description: z.string().trim().min(10, 'validation.productDescriptionMin'),
    categoryId: z.string().min(1, 'validation.categoryRequired'),
    images: z
        .array(z.string().trim().url('validation.imageUrlInvalid'))
        .min(1, 'validation.productImagesMin')
        .max(10, 'validation.productImagesMax'),
    videos: z
        .array(z.string().trim().url('validation.videoUrlInvalid'))
        .max(3, 'validation.productVideosMax')
        .optional()
        .default([]),
    options: z.array(CreateProductOptionInputSchema).max(3, 'validation.productOptionsMax').optional().default([]),
    variants: z
        .array(CreateProductVariantInputSchema)
        .min(1, 'validation.productVariantsMin')
        .max(200, 'validation.productVariantsMax'),
    isDraft: z.boolean().optional().default(false),
})
export type CreateProductInput = z.infer<typeof CreateProductInputSchema>

// Schema cập nhật thông tin sản phẩm
export const UpdateProductInputSchema = z.object({
    name: z.string().trim().min(3, 'validation.productNameMin').max(200, 'validation.productNameMax').optional(),
    description: z.string().trim().min(10, 'validation.productDescriptionMin').optional(),
    categoryId: z.string().min(1, 'validation.categoryRequired').optional(),
    images: z.array(z.string().trim().url('validation.imageUrlInvalid')).min(1).max(10).optional(),
    videos: z.array(z.string().trim().url('validation.videoUrlInvalid')).max(3).optional(),
    isFeatured: z.boolean().optional(),
})
export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>

// Schema Admin duyệt / từ chối sản phẩm
export const ReviewProductSchema = z.object({
    action: ReviewActionSchema,
    reviewNote: z.string().trim().max(500).optional(),
})
export type ReviewProductInput = z.infer<typeof ReviewProductSchema>

// Schema Tạm ngưng sản phẩm (cả Seller và Admin đều dùng kèm lý do)
export const SuspendProductSchema = z.object({
    reason: z.string().trim().min(3, 'validation.suspendReasonMin').max(500, 'validation.suspendReasonMax'),
})
export type SuspendProductInput = z.infer<typeof SuspendProductSchema>

// Boolean query schema dùng chung (chuyển 'true'/'false' string thành boolean)
export const BooleanQuerySchema = z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => v === true || v === 'true')
    .optional()

// Schema truy vấn danh sách sản phẩm
export const ProductQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    status: ProductStatusSchema.optional(),
    isSuspended: BooleanQuerySchema,
    q: z.string().trim().optional(),
    categoryId: z.string().optional(),
    shopId: z.string().optional(),
})
export type ProductQuery = z.infer<typeof ProductQuerySchema>
export type ProductQueryInput = z.input<typeof ProductQuerySchema>

// ===== DTO Interfaces =====

export interface ProductOptionValueDetail {
    id: string
    optionId: string
    value: string
    position: number
    imageId: string | null
}

export interface ProductOptionDetail {
    id: string
    productId: string
    name: string
    position: number
    values: ProductOptionValueDetail[]
}

export interface ProductVariantDetail {
    id: string
    productId: string
    sku: string
    optionKey: string
    price: string
    compareAtPrice: string | null
    weightGram: number
    imageId: string | null
    isDefault: boolean
    isActive: boolean
    stock: number
}

export interface CategorySummary {
    id: string
    name: string
    slug: string
    parentId: string | null
    image: string | null
    children?: CategorySummary[] | undefined
}

export interface ProductDetail {
    id: string
    shopId: string
    shopName?: string | null | undefined
    shopSlug?: string | null | undefined
    categoryId: string
    categoryName?: string | null | undefined
    name: string
    slug: string
    description: string
    images: string[]
    videos: string[]
    status: ProductStatusType
    isSuspended: boolean
    suspendedReason: string | null
    suspendedById: string | null
    suspendedAt: string | null
    minPrice: string | null
    maxPrice: string | null
    totalStock: number
    soldCount: number
    viewCount: number
    ratingAvg: number
    ratingCount: number
    isFeatured: boolean
    reviewNote: string | null
    reviewedById: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
    options: ProductOptionDetail[]
    variants: ProductVariantDetail[]
}

export interface ProductSummary {
    id: string
    shopId: string
    shopName?: string | null | undefined
    shopSlug?: string | null | undefined
    categoryId: string
    categoryName?: string | null | undefined
    name: string
    slug: string
    images: string[]
    videos: string[]
    status: ProductStatusType
    isSuspended: boolean
    suspendedReason: string | null
    minPrice: string | null
    maxPrice: string | null
    totalStock: number
    soldCount: number
    ratingAvg: number
    ratingCount: number
    variantCount?: number | undefined
    createdAt: string
    updatedAt: string
}

export interface ProductListResult {
    items: ProductSummary[]
    totalItems: number
    page: number
    pageSize: number
    totalPages: number
}
