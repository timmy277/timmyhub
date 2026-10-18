import { z } from 'zod'

// Trạng thái bài đăng / video
export const PostStatusEnum = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    HIDDEN: 'HIDDEN',
    PENDING_REVIEW: 'PENDING_REVIEW',
    REJECTED: 'REJECTED',
} as const
export type PostStatus = (typeof PostStatusEnum)[keyof typeof PostStatusEnum]

// Sản phẩm gắn kèm vào video bán hàng (Shoppable Product Tag)
export const PostProductSchema = z.object({
    id: z.string(),
    productId: z.string(),
    variantId: z.string().nullable().optional(),
    position: z.number().default(0),
    product: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        price: z.number(),
        originalPrice: z.number().nullable().optional(),
        thumbnailUrl: z.string().nullable().optional(),
        inStock: z.boolean().default(true),
    }),
})
export type PostProductDto = z.infer<typeof PostProductSchema>

// DTO chi tiết bài đăng / video bán hàng
export const VideoPostSchema = z.object({
    id: z.string(),
    sellerId: z.string(),
    shopName: z.string(),
    shopLogo: z.string().nullable().optional(),
    shopSlug: z.string().optional(),
    title: z.string(),
    content: z.string().nullable().optional(),
    videoUrl: z.string(),
    thumbnailUrl: z.string().nullable().optional(),
    videoDuration: z.string().optional(),
    hashtags: z.array(z.string()).default([]),
    status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN', 'PENDING_REVIEW', 'REJECTED']),
    viewCount: z.number().default(0),
    likeCount: z.number().default(0),
    commentCount: z.number().default(0),
    isLiked: z.boolean().default(false),
    productTags: z.array(PostProductSchema).default([]),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
})
export type VideoPostDto = z.infer<typeof VideoPostSchema>

// Schema tạo mới video bán hàng (Form validation cho Seller với react-hook-form + zod)
export const CreateVideoPostSchema = z.object({
    title: z
        .string()
        .min(3, { message: 'Tiêu đề video phải có ít nhất 3 ký tự' })
        .max(150, { message: 'Tiêu đề không được vượt quá 150 ký tự' }),
    content: z.string().max(2000, { message: 'Mô tả không được vượt quá 2000 ký tự' }).optional().default(''),
    videoUrl: z
        .string()
        .url({ message: 'Đường dẫn video không hợp lệ' })
        .min(1, { message: 'Vui lòng tải lên video bán hàng' }),
    thumbnailUrl: z.string().url().optional().or(z.literal('')),
    hashtags: z.array(z.string()).default([]),
    productIds: z
        .array(z.string())
        .min(1, { message: 'Vui lòng chọn ít nhất 1 sản phẩm gắn kèm' })
        .max(5, { message: 'Tối đa gắn kèm 5 sản phẩm trên một video' }),
    status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']).default('PUBLISHED'),
})
export type CreateVideoPostInput = z.input<typeof CreateVideoPostSchema>
export type CreateVideoPostDto = z.output<typeof CreateVideoPostSchema>

// Schema cập nhật video bán hàng
export const UpdateVideoPostSchema = CreateVideoPostSchema.partial().extend({
    id: z.string().optional(),
})
export type UpdateVideoPostInput = z.input<typeof UpdateVideoPostSchema>
export type UpdateVideoPostDto = z.output<typeof UpdateVideoPostSchema>

// Phản hồi danh sách video
export const VideoFeedResponseSchema = z.object({
    items: z.array(VideoPostSchema),
    total: z.number().default(0),
    hasMore: z.boolean().default(false),
})
export type VideoFeedResponseDto = z.infer<typeof VideoFeedResponseSchema>
