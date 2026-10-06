import { z } from 'zod'

// Enum trạng thái vòng đời sản phẩm (khớp catalog.prisma)
export const ProductStatus = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DELETED: 'DELETED',
} as const

export type ProductStatusType = (typeof ProductStatus)[keyof typeof ProductStatus]
export const ProductStatusSchema = z.nativeEnum(ProductStatus)

// Schema tạo tuỳ chọn sản phẩm (ví dụ: Màu sắc, Kích cỡ)
export const CreateProductOptionInputSchema = z.object({
    name: z.string().trim().min(1, 'Tên phân loại không được để trống').max(50, 'Tên phân loại tối đa 50 ký tự'),
    values: z
        .array(z.string().trim().min(1, 'Giá trị phân loại không được để trống').max(50, 'Giá trị tối đa 50 ký tự'))
        .min(1, 'Cần ít nhất một giá trị cho phân loại')
        .max(30, 'Mỗi phân loại tối đa 30 giá trị'),
})
export type CreateProductOptionInput = z.infer<typeof CreateProductOptionInputSchema>

// Schema tạo biến thể sản phẩm (Variant)
export const CreateProductVariantInputSchema = z.object({
    sku: z.string().trim().max(100).optional(),
    // Map tên option -> value (ví dụ { "Màu sắc": "Đen", "Kích cỡ": "L" })
    optionValues: z.record(z.string(), z.string()).optional(),
    price: z.number().int().positive('Giá bán phải lớn hơn 0'),
    compareAtPrice: z.number().int().positive('Giá gốc phải lớn hơn 0').optional().nullable(),
    stock: z.number().int().nonnegative('Số lượng tồn kho không được âm'),
    weightGram: z.number().int().positive('Khối lượng phải lớn hơn 0').optional().default(200),
    imageId: z.string().optional().nullable(),
    isDefault: z.boolean().optional().default(false),
})
export type CreateProductVariantInput = z.infer<typeof CreateProductVariantInputSchema>

// Schema nộp tạo sản phẩm (Seller)
export const CreateProductInputSchema = z.object({
    name: z.string().trim().min(3, 'Tên sản phẩm tối thiểu 3 ký tự').max(200, 'Tên sản phẩm tối đa 200 ký tự'),
    description: z.string().trim().min(10, 'Mô tả sản phẩm tối thiểu 10 ký tự'),
    categoryId: z.string().min(1, 'Vui lòng chọn danh mục ngành hàng'),
    images: z
        .array(z.string().trim().url('Đường dẫn ảnh không hợp lệ'))
        .min(1, 'Cần ít nhất 1 ảnh đại diện sản phẩm')
        .max(10, 'Tối đa 10 ảnh cho một sản phẩm'),
    videos: z
        .array(z.string().trim().url('Đường dẫn video không hợp lệ'))
        .max(3, 'Tối đa 3 video cho một sản phẩm')
        .optional()
        .default([]),
    options: z.array(CreateProductOptionInputSchema).max(3, 'Tối đa 3 phân loại sản phẩm').optional().default([]),
    variants: z
        .array(CreateProductVariantInputSchema)
        .min(1, 'Cần ít nhất một biến thể sản phẩm')
        .max(200, 'Tối đa 200 biến thể sản phẩm'),
    isDraft: z.boolean().optional().default(false),
})
export type CreateProductInput = z.infer<typeof CreateProductInputSchema>

// Schema cập nhật thông tin sản phẩm
export const UpdateProductInputSchema = z.object({
    name: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(10).optional(),
    categoryId: z.string().min(1).optional(),
    images: z.array(z.string().trim().url()).min(1).max(10).optional(),
    videos: z.array(z.string().trim().url()).max(3).optional(),
    isFeatured: z.boolean().optional(),
})
export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>

// Schema Admin duyệt / từ chối sản phẩm
export const ReviewProductSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT']),
    reviewNote: z.string().trim().max(500).optional(),
})
export type ReviewProductInput = z.infer<typeof ReviewProductSchema>

// Schema Tạm ngưng sản phẩm (cả Seller và Admin đều dùng kèm lý do)
export const SuspendProductSchema = z.object({
    reason: z.string().trim().min(3, 'Lý do tạm ngưng tối thiểu 3 ký tự').max(500, 'Lý do tạm ngưng tối đa 500 ký tự'),
})
export type SuspendProductInput = z.infer<typeof SuspendProductSchema>

// Schema truy vấn danh sách sản phẩm
export const ProductQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    status: z.string().optional(),
    isSuspended: z.preprocess((val) => {
        if (val === 'true') return true
        if (val === 'false') return false
        return val
    }, z.boolean().optional()),
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
    price: number
    compareAtPrice: number | null
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
    minPrice: number | null
    maxPrice: number | null
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
    minPrice: number | null
    maxPrice: number | null
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
