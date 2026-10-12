import { z } from 'zod'

// ===== Enums & Constants =====
export const REVIEW_SORT = {
    NEWEST: 'newest',
    HELPFUL: 'helpful',
    RATING_DESC: 'rating_desc',
    RATING_ASC: 'rating_asc',
} as const
export type ReviewSortType = (typeof REVIEW_SORT)[keyof typeof REVIEW_SORT]

// ===== Schemas =====

export const CreateReviewInputSchema = z.object({
    productId: z.string().trim().min(1, 'validation.productIdRequired'),
    variantId: z.string().trim().nullable().optional(),
    orderItemId: z.string().trim().min(1, 'validation.orderItemIdRequired'),
    rating: z.number().int().min(1, 'validation.ratingMin').max(5, 'validation.ratingMax'),
    comment: z.string().trim().max(2000, 'validation.commentMax').optional().nullable(),
    images: z.array(z.string().url()).max(10, 'validation.imagesMax').optional().default([]),
    videos: z.array(z.string().url()).max(2, 'validation.videosMax').optional().default([]),
})
export interface CreateReviewInput {
    productId: string
    variantId?: string | null
    orderItemId: string
    rating: number
    comment?: string | null
    images?: string[]
    videos?: string[]
}

export const CreateReviewCommentInputSchema = z.object({
    reviewId: z.string().trim().min(1, 'validation.reviewIdRequired'),
    content: z.string().trim().min(1, 'validation.commentContentRequired').max(1000, 'validation.commentContentMax'),
    parentId: z.string().trim().nullable().optional(),
})
export interface CreateReviewCommentInput {
    reviewId: string
    content: string
    parentId?: string | null
}

export const VoteReviewHelpfulInputSchema = z.object({
    reviewId: z.string().trim().min(1),
})
export type VoteReviewHelpfulInput = z.infer<typeof VoteReviewHelpfulInputSchema>

export const ReviewQuerySchema = z.object({
    productId: z.string().trim().min(1),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    hasMedia: z.coerce
        .string()
        .optional()
        .transform((val) => val === 'true'),
    sort: z.enum(['newest', 'helpful', 'rating_desc', 'rating_asc']).optional().default('newest'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})
export type ReviewQuery = z.infer<typeof ReviewQuerySchema>

// ===== Types & DTOs =====

export interface ReviewCommentItem {
    id: string
    reviewId: string
    userId: string
    userName: string
    userAvatar?: string | null
    isSellerReply: boolean
    content: string
    parentId?: string | null
    createdAt: string
    updatedAt: string
    replies?: ReviewCommentItem[]
}

export interface ReviewItem {
    id: string
    userId: string
    userName: string
    userAvatar?: string | null
    productId: string
    variantId?: string | null
    variantLabel?: string | null
    orderItemId?: string | null
    rating: number
    comment?: string | null
    images: string[]
    videos: string[]
    isVerified: boolean
    helpfulCount: number
    isHelpfulVotedByMe?: boolean
    editedAt?: string | null
    createdAt: string
    updatedAt: string
    comments: ReviewCommentItem[]
}

export interface ProductRatingSummary {
    ratingAvg: number
    ratingCount: number
    countsByStar: {
        1: number
        2: number
        3: number
        4: number
        5: number
    }
    mediaCount: number
}

export interface ReviewListResult {
    items: ReviewItem[]
    total: number
    page: number
    limit: number
    totalPages: number
    summary: ProductRatingSummary
}

export interface PendingReviewItem {
    orderId: string
    orderItemId: string
    productId: string
    productName: string
    variantId: string
    variantLabel: string
    imageUrl: string
    orderCompletedAt: string
}
