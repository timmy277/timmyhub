import { Injectable } from '@nestjs/common'
import { PrismaService } from '@timmyhub/prisma'
import type { Prisma } from '@timmyhub/prisma'
import type { CreateReviewInput, ProductRatingSummary } from '@timmyhub/contracts'

@Injectable()
export class EngagementRepository {
    // ===== Dependencies =====
    constructor(private readonly prisma: PrismaService) {}

    // ===== Queries =====

    async findOrderItemForReview(userId: string, orderItemId: string) {
        return this.prisma.orderItem.findFirst({
            where: {
                id: orderItemId,
                order: {
                    buyerId: userId,
                    status: {
                        in: ['DELIVERED', 'COMPLETED'],
                    },
                },
            },
            include: {
                order: {
                    select: {
                        id: true,
                        buyerId: true,
                        sellerId: true,
                        status: true,
                    },
                },
            },
        })
    }

    async findExistingReviewByOrderItem(orderItemId: string) {
        return this.prisma.review.findUnique({
            where: { orderItemId },
        })
    }

    async findReviewById(id: string) {
        return this.prisma.review.findUnique({
            where: { id },
            include: {
                comments: {
                    orderBy: { createdAt: 'asc' },
                },
                helpfulVotes: true,
            },
        })
    }

    async findReviewsByProduct(
        productId: string,
        options: {
            rating?: number | undefined
            hasMedia?: boolean | undefined
            sort?: string | undefined
            skip: number
            take: number
        },
    ) {
        const where: Prisma.ReviewWhereInput = {
            productId,
            isHidden: false,
        }

        if (options.rating) {
            where.rating = options.rating
        }

        if (options.hasMedia) {
            where.OR = [{ images: { isEmpty: false } }, { videos: { isEmpty: false } }]
        }

        let orderBy: Prisma.ReviewOrderByWithRelationInput = { createdAt: 'desc' }
        if (options.sort === 'helpful') {
            orderBy = { helpfulCount: 'desc' }
        } else if (options.sort === 'rating_desc') {
            orderBy = { rating: 'desc' }
        } else if (options.sort === 'rating_asc') {
            orderBy = { rating: 'asc' }
        }

        return this.prisma.review.findMany({
            where,
            orderBy,
            skip: options.skip,
            take: options.take,
            include: {
                comments: {
                    orderBy: { createdAt: 'asc' },
                },
                helpfulVotes: true,
            },
        })
    }

    async countReviewsByProduct(
        productId: string,
        options: {
            rating?: number | undefined
            hasMedia?: boolean | undefined
        },
    ) {
        const where: Prisma.ReviewWhereInput = {
            productId,
            isHidden: false,
        }

        if (options.rating) {
            where.rating = options.rating
        }

        if (options.hasMedia) {
            where.OR = [{ images: { isEmpty: false } }, { videos: { isEmpty: false } }]
        }

        return this.prisma.review.count({ where })
    }

    async getProductRatingSummary(productId: string): Promise<ProductRatingSummary> {
        const reviews = await this.prisma.review.findMany({
            where: {
                productId,
                isHidden: false,
            },
            select: {
                rating: true,
                images: true,
                videos: true,
            },
        })

        const total = reviews.length
        const countsByStar = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        let totalScore = 0
        let mediaCount = 0

        for (const r of reviews) {
            if (r.rating >= 1 && r.rating <= 5) {
                countsByStar[r.rating as 1 | 2 | 3 | 4 | 5]++
                totalScore += r.rating
            }
            if ((r.images && r.images.length > 0) || (r.videos && r.videos.length > 0)) {
                mediaCount++
            }
        }

        const ratingAvg = total > 0 ? Math.round((totalScore / total) * 10) / 10 : 0

        return {
            ratingAvg,
            ratingCount: total,
            countsByStar,
            mediaCount,
        }
    }

    async findProductShopId(productId: string): Promise<string | null> {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { shopId: true },
        })
        return product?.shopId ?? null
    }

    async findShopByUserId(userId: string) {
        return this.prisma.sellerProfile.findUnique({
            where: { userId },
            select: { id: true },
        })
    }

    async getUsersSummary(userIds: string[]) {
        if (userIds.length === 0) return new Map<string, { name: string; avatar: string | null }>()
        const profiles = await this.prisma.profile.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, firstName: true, lastName: true, displayName: true, avatar: true },
        })
        const map = new Map<string, { name: string; avatar: string | null }>()
        for (const p of profiles) {
            const name = p.displayName || `${p.firstName} ${p.lastName}`.trim() || 'Người dùng'
            map.set(p.userId, { name, avatar: p.avatar })
        }
        return map
    }

    async findPendingReviews(userId: string) {
        const unreviewedItems = await this.prisma.orderItem.findMany({
            where: {
                isReviewed: false,
                order: {
                    buyerId: userId,
                    status: { in: ['DELIVERED', 'COMPLETED'] },
                },
            },
            include: {
                order: {
                    select: {
                        id: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                order: {
                    createdAt: 'desc',
                },
            },
            take: 20,
        })

        return unreviewedItems.map((item) => ({
            orderId: item.order.id,
            orderItemId: item.id,
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
            imageUrl: item.imageUrl,
            orderCompletedAt: item.order.createdAt.toISOString(),
        }))
    }

    // ===== Commands =====

    async createReview(userId: string, input: CreateReviewInput, _variantLabel?: string) {
        return this.prisma.$transaction(async (tx) => {
            const review = await tx.review.create({
                data: {
                    userId,
                    productId: input.productId,
                    variantId: input.variantId ?? null,
                    orderItemId: input.orderItemId,
                    rating: input.rating,
                    comment: input.comment ?? null,
                    images: input.images ?? [],
                    videos: input.videos ?? [],
                    isVerified: true,
                },
            })

            await tx.orderItem.update({
                where: { id: input.orderItemId },
                data: { isReviewed: true },
            })

            // Đánh dấu PurchasedItem nếu tồn tại
            await tx.purchasedItem.updateMany({
                where: { orderItemId: input.orderItemId },
                data: { canReview: false },
            })

            return review
        })
    }

    async updateProductRating(productId: string, ratingAvg: number, ratingCount: number) {
        return this.prisma.product.update({
            where: { id: productId },
            data: { ratingAvg, ratingCount },
        })
    }

    async createComment(data: {
        reviewId: string
        userId: string
        content: string
        parentId?: string | null | undefined
        isSellerReply: boolean
    }) {
        return this.prisma.reviewComment.create({
            data: {
                reviewId: data.reviewId,
                userId: data.userId,
                content: data.content,
                parentId: data.parentId ?? null,
                isSellerReply: data.isSellerReply,
            },
        })
    }

    async toggleHelpfulVote(reviewId: string, userId: string) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.reviewHelpfulVote.findUnique({
                where: {
                    reviewId_userId: {
                        reviewId,
                        userId,
                    },
                },
            })

            if (existing) {
                await tx.reviewHelpfulVote.delete({
                    where: { id: existing.id },
                })
                const updated = await tx.review.update({
                    where: { id: reviewId },
                    data: { helpfulCount: { decrement: 1 } },
                    select: { helpfulCount: true },
                })
                return { voted: false, count: Math.max(0, updated.helpfulCount) }
            } else {
                await tx.reviewHelpfulVote.create({
                    data: { reviewId, userId },
                })
                const updated = await tx.review.update({
                    where: { id: reviewId },
                    data: { helpfulCount: { increment: 1 } },
                    select: { helpfulCount: true },
                })
                return { voted: true, count: updated.helpfulCount }
            }
        })
    }

    // ===== Wishlist =====

    async findWishlistByUserId(userId: string) {
        return this.prisma.wishlistItem.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findWishlistProductIds(userId: string): Promise<string[]> {
        const items = await this.prisma.wishlistItem.findMany({
            where: { userId },
            select: { productId: true },
        })
        return items.map((i) => i.productId)
    }

    async findWishlistItem(userId: string, productId: string) {
        return this.prisma.wishlistItem.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId,
                },
            },
        })
    }

    async addWishlistItem(userId: string, productId: string) {
        return this.prisma.wishlistItem.create({
            data: {
                userId,
                productId,
            },
        })
    }

    async removeWishlistItem(userId: string, productId: string) {
        return this.prisma.wishlistItem.deleteMany({
            where: {
                userId,
                productId,
            },
        })
    }

    async findProductsByIds(productIds: string[]) {
        if (!productIds.length) return []
        return this.prisma.product.findMany({
            where: {
                OR: [
                    { id: { in: productIds } },
                    { slug: { in: productIds } },
                ],
            },
        })
    }
}
