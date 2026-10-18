import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ApiError } from '@timmyhub/contracts'
import type {
    CreateReviewCommentInput,
    CreateReviewInput,
    ProductRatingSummary,
    ReviewCommentItem,
    ReviewItem,
    ReviewListResult,
    ReviewQuery,
    ToggleWishlistResponseDto,
    WishlistItemDto,
    WishlistListResponseDto,
} from '@timmyhub/contracts'

import { ENGAGEMENT_EVENT } from './engagement.constants'
import { EngagementRepository } from './engagement.repository'

@Injectable()
export class EngagementService {
    // ===== Dependencies =====
    private readonly logger = new Logger(EngagementService.name)

    constructor(
        private readonly repository: EngagementRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    // ===== Queries =====

    async getProductReviews(query: ReviewQuery, currentUserId?: string): Promise<ReviewListResult> {
        const page = query.page ?? 1
        const limit = query.limit ?? 10
        const skip = (page - 1) * limit

        const [reviews, total, summary] = await Promise.all([
            this.repository.findReviewsByProduct(query.productId, {
                rating: query.rating,
                hasMedia: query.hasMedia,
                sort: query.sort,
                skip,
                take: limit,
            }),
            this.repository.countReviewsByProduct(query.productId, {
                rating: query.rating,
                hasMedia: query.hasMedia,
            }),
            this.repository.getProductRatingSummary(query.productId),
        ])

        // Thu thập user IDs để map tên & avatar
        const userIds = new Set<string>()
        for (const r of reviews) {
            userIds.add(r.userId)
            for (const c of r.comments) {
                userIds.add(c.userId)
            }
        }

        const userMap = await this.repository.getUsersSummary(Array.from(userIds))

        const items: ReviewItem[] = reviews.map((r) => {
            const author = userMap.get(r.userId)
            const isHelpfulVotedByMe = currentUserId ? r.helpfulVotes.some((v) => v.userId === currentUserId) : false

            // Xây dựng cây bình luận (parent / replies)
            const commentMap = new Map<string, ReviewCommentItem>()
            const topLevelComments: ReviewCommentItem[] = []

            for (const c of r.comments) {
                const commentUser = userMap.get(c.userId)
                const item: ReviewCommentItem = {
                    id: c.id,
                    reviewId: c.reviewId,
                    userId: c.userId,
                    userName: commentUser?.name ?? 'Người dùng',
                    userAvatar: commentUser?.avatar ?? null,
                    isSellerReply: c.isSellerReply,
                    content: c.content,
                    parentId: c.parentId,
                    createdAt: c.createdAt.toISOString(),
                    updatedAt: c.updatedAt.toISOString(),
                    replies: [],
                }
                commentMap.set(c.id, item)
            }

            for (const c of r.comments) {
                const item = commentMap.get(c.id)!
                if (c.parentId && commentMap.has(c.parentId)) {
                    commentMap.get(c.parentId)!.replies!.push(item)
                } else {
                    topLevelComments.push(item)
                }
            }

            return {
                id: r.id,
                userId: r.userId,
                userName: author?.name ?? 'Người dùng',
                userAvatar: author?.avatar ?? null,
                productId: r.productId,
                variantId: r.variantId,
                orderItemId: r.orderItemId,
                rating: r.rating,
                comment: r.comment,
                images: r.images,
                videos: r.videos,
                isVerified: r.isVerified,
                helpfulCount: r.helpfulCount,
                isHelpfulVotedByMe,
                editedAt: r.editedAt ? r.editedAt.toISOString() : null,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
                comments: topLevelComments,
            }
        })

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            summary,
        }
    }

    async getProductRatingSummary(productId: string): Promise<ProductRatingSummary> {
        return this.repository.getProductRatingSummary(productId)
    }

    async getPendingReviews(userId: string) {
        return this.repository.findPendingReviews(userId)
    }

    async getWishlist(userId: string): Promise<WishlistListResponseDto> {
        const wishlistItems = await this.repository.findWishlistByUserId(userId)
        if (!wishlistItems.length) {
            return { items: [], total: 0 }
        }

        const productIds = wishlistItems.map((item) => item.productId)
        const products = await this.repository.findProductsByIds(productIds)
        const productMap = new Map(products.map((p) => [p.id, p]))

        const items: WishlistItemDto[] = []
        for (const item of wishlistItems) {
            const product = productMap.get(item.productId)
            if (!product) continue

            const minPrice = product.minPrice ? Number(product.minPrice) : 0
            const maxPrice = product.maxPrice ? Number(product.maxPrice) : minPrice

            items.push({
                id: item.id,
                productId: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                images: product.images ?? [],
                minPrice,
                maxPrice,
                ratingAvg: product.ratingAvg ?? 0,
                ratingCount: product.ratingCount ?? 0,
                inStock: (product.totalStock ?? 0) > 0,
                createdAt: item.createdAt.toISOString(),
            })
        }

        return {
            items,
            total: items.length,
        }
    }

    async getWishlistProductIds(userId: string): Promise<string[]> {
        return this.repository.findWishlistProductIds(userId)
    }

    // ===== Commands =====

    async createReview(userId: string, input: CreateReviewInput): Promise<ReviewItem> {
        // 1. Kiểm tra đơn hàng có đủ điều kiện (đã mua, đã giao/hoàn tất)
        const orderItem = await this.repository.findOrderItemForReview(userId, input.orderItemId)
        if (!orderItem) {
            throw new ApiError('BAD_REQUEST', {
                details: 'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao thành công',
            })
        }

        if (orderItem.isReviewed) {
            throw new ApiError('CONFLICT', {
                details: 'Sản phẩm này trong đơn hàng đã được đánh giá',
            })
        }

        // 2. Kiểm tra xem đã có review nào gắn với orderItemId chưa
        const existingReview = await this.repository.findExistingReviewByOrderItem(input.orderItemId)
        if (existingReview) {
            throw new ApiError('CONFLICT', {
                details: 'Đơn hàng này đã được đánh giá',
            })
        }

        // 3. Tạo review trong transaction
        const review = await this.repository.createReview(userId, input, orderItem.variantLabel)

        // 4. Tính toán và cập nhật lại rating trung bình cho sản phẩm
        const summary = await this.repository.getProductRatingSummary(input.productId)
        await this.repository.updateProductRating(input.productId, summary.ratingAvg, summary.ratingCount)

        const userMap = await this.repository.getUsersSummary([userId])
        const author = userMap.get(userId)

        const result: ReviewItem = {
            id: review.id,
            userId: review.userId,
            userName: author?.name ?? 'Người dùng',
            userAvatar: author?.avatar ?? null,
            productId: review.productId,
            variantId: review.variantId,
            variantLabel: orderItem.variantLabel,
            orderItemId: review.orderItemId,
            rating: review.rating,
            comment: review.comment,
            images: review.images,
            videos: review.videos,
            isVerified: review.isVerified,
            helpfulCount: review.helpfulCount,
            isHelpfulVotedByMe: false,
            editedAt: null,
            createdAt: review.createdAt.toISOString(),
            updatedAt: review.updatedAt.toISOString(),
            comments: [],
        }

        // 5. Phát domain events (In-process qua EventEmitter2)
        this.eventEmitter.emit(ENGAGEMENT_EVENT.REVIEW_CREATED, {
            productId: input.productId,
            review: result,
        })

        this.eventEmitter.emit(ENGAGEMENT_EVENT.RATING_UPDATED, {
            productId: input.productId,
            averageRating: summary.ratingAvg,
            reviewCount: summary.ratingCount,
        })

        this.logger.log(`Review created for product ${input.productId} by user ${userId}`)

        return result
    }

    async createComment(userId: string, input: CreateReviewCommentInput): Promise<ReviewCommentItem> {
        const review = await this.repository.findReviewById(input.reviewId)
        if (!review) {
            throw new ApiError('NOT_FOUND')
        }

        // Kiểm tra xem người trả lời có phải là chính shop của sản phẩm không
        const productShopId = await this.repository.findProductShopId(review.productId)
        const userShop = await this.repository.findShopByUserId(userId)
        const isSellerReply = Boolean(productShopId && userShop && productShopId === userShop.id)

        const comment = await this.repository.createComment({
            reviewId: input.reviewId,
            userId,
            content: input.content,
            parentId: input.parentId,
            isSellerReply,
        })

        const userMap = await this.repository.getUsersSummary([userId])
        const commentUser = userMap.get(userId)

        const result: ReviewCommentItem = {
            id: comment.id,
            reviewId: comment.reviewId,
            userId: comment.userId,
            userName: commentUser?.name ?? 'Người dùng',
            userAvatar: commentUser?.avatar ?? null,
            isSellerReply: comment.isSellerReply,
            content: comment.content,
            parentId: comment.parentId,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
            replies: [],
        }

        // Phát sự kiện realtime
        this.eventEmitter.emit(ENGAGEMENT_EVENT.REVIEW_REPLIED, {
            reviewId: input.reviewId,
            productId: review.productId,
            comment: result,
        })

        return result
    }

    async toggleHelpful(userId: string, reviewId: string) {
        const review = await this.repository.findReviewById(reviewId)
        if (!review) {
            throw new ApiError('NOT_FOUND')
        }

        return this.repository.toggleHelpfulVote(reviewId, userId)
    }

    async toggleWishlist(userId: string, productId: string): Promise<ToggleWishlistResponseDto> {
        // Kiểm tra sản phẩm có tồn tại theo id hoặc slug
        const products = await this.repository.findProductsByIds([productId])
        const product = products[0]
        const realProductId = product ? product.id : productId

        const existing = await this.repository.findWishlistItem(userId, realProductId)
        if (existing) {
            await this.repository.removeWishlistItem(userId, realProductId)
            return { inWishlist: false, productId: realProductId }
        }

        if (!product) {
            throw new ApiError('NOT_FOUND', { details: 'Không tìm thấy sản phẩm' })
        }

        await this.repository.addWishlistItem(userId, realProductId)
        return { inWishlist: true, productId: realProductId }
    }

    async removeFromWishlist(userId: string, productId: string): Promise<{ success: boolean }> {
        const products = await this.repository.findProductsByIds([productId])
        const realProductId = products[0]?.id || productId
        await this.repository.removeWishlistItem(userId, realProductId)
        return { success: true }
    }
}
