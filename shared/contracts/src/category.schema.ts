import { z } from 'zod'

import { BooleanQuerySchema } from './product.schema'

// ===== Schemas =====

// Schema tạo danh mục sản phẩm (Admin)
export const CreateCategoryInputSchema = z.object({
    name: z.string().trim().min(2, 'validation.categoryNameMin').max(100, 'validation.categoryNameMax'),
    slug: z
        .string()
        .trim()
        .min(2, 'validation.slugMin')
        .max(100, 'validation.slugMax')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'validation.slugPattern')
        .optional(),
    parentId: z.string().trim().optional().nullable(),
    image: z.string().trim().url('validation.imageUrlInvalid').optional().nullable().or(z.literal('')),
    description: z.string().trim().max(500, 'validation.descriptionMax').optional().nullable(),
    position: z.coerce.number().int().nonnegative('validation.positionNonNegative').default(0),
    isActive: z.boolean().default(true),
})
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>

// Schema cập nhật danh mục sản phẩm (Admin)
export const UpdateCategoryInputSchema = z.object({
    name: z.string().trim().min(2, 'validation.categoryNameMin').max(100, 'validation.categoryNameMax').optional(),
    slug: z
        .string()
        .trim()
        .min(2, 'validation.slugMin')
        .max(100, 'validation.slugMax')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'validation.slugPattern')
        .optional(),
    parentId: z.string().trim().optional().nullable(),
    image: z.string().trim().url('validation.imageUrlInvalid').optional().nullable().or(z.literal('')),
    description: z.string().trim().max(500, 'validation.descriptionMax').optional().nullable(),
    position: z.coerce.number().int().nonnegative('validation.positionNonNegative').optional(),
    isActive: z.boolean().optional(),
})
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>

// Schema truy vấn danh sách danh mục (Admin)
export const CategoryQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50),
    q: z.string().trim().optional(),
    parentId: z.string().trim().optional().nullable(),
    isActive: BooleanQuerySchema,
})
export type CategoryQuery = z.infer<typeof CategoryQuerySchema>
export type CategoryQueryInput = z.input<typeof CategoryQuerySchema>

// ===== DTO Interfaces =====

// Chi tiết danh mục quản trị
export interface CategoryItem {
    id: string
    name: string
    slug: string
    parentId: string | null
    parentName?: string | null | undefined
    image: string | null
    description: string | null
    position: number
    isActive: boolean
    productCount?: number | undefined
    childrenCount?: number | undefined
    createdAt: string
    updatedAt: string
    children?: CategoryItem[] | undefined
}

// Kết quả phân trang danh mục
export interface CategoryListResult {
    items: CategoryItem[]
    totalItems: number
    page: number
    pageSize: number
    totalPages: number
}
