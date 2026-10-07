import { z } from 'zod'

// Schema tạo danh mục sản phẩm (Admin)
export const CreateCategoryInputSchema = z.object({
    name: z.string().trim().min(2, 'Tên danh mục phải có ít nhất 2 ký tự').max(100, 'Tên danh mục tối đa 100 ký tự'),
    slug: z
        .string()
        .trim()
        .min(2, 'Đường dẫn (slug) tối thiểu 2 ký tự')
        .max(100, 'Đường dẫn (slug) tối đa 100 ký tự')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch nối (kebab-case)')
        .optional(),
    parentId: z.string().trim().optional().nullable(),
    image: z.string().trim().url('Đường dẫn ảnh không hợp lệ').optional().nullable().or(z.literal('')),
    description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional().nullable(),
    position: z.coerce.number().int().nonnegative('Vị trí hiển thị không được âm').default(0),
    isActive: z.boolean().default(true),
})
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>

// Schema cập nhật danh mục sản phẩm (Admin)
export const UpdateCategoryInputSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Tên danh mục phải có ít nhất 2 ký tự')
        .max(100, 'Tên danh mục tối đa 100 ký tự')
        .optional(),
    slug: z
        .string()
        .trim()
        .min(2, 'Đường dẫn (slug) tối thiểu 2 ký tự')
        .max(100, 'Đường dẫn (slug) tối đa 100 ký tự')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch nối (kebab-case)')
        .optional(),
    parentId: z.string().trim().optional().nullable(),
    image: z.string().trim().url('Đường dẫn ảnh không hợp lệ').optional().nullable().or(z.literal('')),
    description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional().nullable(),
    position: z.coerce.number().int().nonnegative('Vị trí hiển thị không được âm').optional(),
    isActive: z.boolean().optional(),
})
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>

// Schema truy vấn danh sách danh mục (Admin)
export const CategoryQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50),
    q: z.string().trim().optional(),
    parentId: z.string().trim().optional().nullable(),
    isActive: z.preprocess((val) => {
        if (val === 'true') return true
        if (val === 'false') return false
        return val
    }, z.boolean().optional()),
})
export type CategoryQuery = z.infer<typeof CategoryQuerySchema>
export type CategoryQueryInput = z.input<typeof CategoryQuerySchema>

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
