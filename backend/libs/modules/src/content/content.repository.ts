import { Injectable } from '@nestjs/common'

import { PrismaService } from '@timmyhub/prisma'
import type { Prisma } from '@timmyhub/prisma'

const POST_BASE_SELECT = {
    id: true,
    sellerId: true,
    title: true,
    content: true,
    videoUrl: true,
    videoMediaId: true,
    thumbnailUrl: true,
    images: true,
    hashtags: true,
    status: true,
    viewCount: true,
    likeCount: true,
    commentCount: true,
    isPinned: true,
    createdAt: true,
    updatedAt: true,
    productTags: {
        select: {
            id: true,
            productId: true,
            variantId: true,
            position: true,
        },
        orderBy: { position: 'asc' as const },
    },
} as const

const PRODUCT_SUMMARY_SELECT = {
    id: true,
    name: true,
    slug: true,
    images: true,
    minPrice: true,
    maxPrice: true,
    status: true,
} as const

const SELLER_SUMMARY_SELECT = {
    id: true,
    userId: true,
    shopName: true,
    shopSlug: true,
    shopLogo: true,
    isVerified: true,
} as const

@Injectable()
export class ContentRepository {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Lấy danh sách video đang hiển thị (PUBLISHED và có videoUrl)
     * REQ-PST-001, Rule 3.1: Explicit select
     */
    async findPublishedVideos(limit: number, excludeId?: string) {
        return this.prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
                videoUrl: { not: null },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: POST_BASE_SELECT,
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
            take: limit,
        })
    }

    /**
     * Tìm bài viết theo ID
     */
    async findPostById(id: string) {
        return this.prisma.post.findUnique({
            where: { id },
            select: POST_BASE_SELECT,
        })
    }

    /**
     * Lấy bài viết / video của một người bán
     */
    async findSellerPosts(sellerId: string, status?: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit
        const where: Prisma.PostWhereInput = { sellerId }
        if (status) {
            where.status = status as never
        }

        const [items, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
                select: POST_BASE_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.post.count({ where }),
        ])

        return { items, total }
    }

    /**
     * Tạo mới một bài viết video
     */
    async createPost(
        data: {
            sellerId: string
            title: string
            content?: string | null | undefined
            videoUrl?: string | null | undefined
            videoMediaId?: string | null | undefined
            thumbnailUrl?: string | null | undefined
            images?: string[] | undefined
            hashtags?: string[] | undefined
            status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'PENDING_REVIEW' | 'REJECTED' | undefined
        },
        productTags: { productId: string; variantId?: string | null; position: number }[] = [],
    ) {
        return this.prisma.$transaction(async (tx) => {
            const statusValue = (data.status ?? 'PUBLISHED') as Prisma.EnumPostStatusFieldUpdateOperationsInput['set']
            const post = await tx.post.create({
                data: {
                    sellerId: data.sellerId,
                    title: data.title,
                    content: data.content ?? null,
                    videoUrl: data.videoUrl ?? null,
                    videoMediaId: data.videoMediaId ?? null,
                    thumbnailUrl: data.thumbnailUrl ?? null,
                    images: data.images ?? [],
                    hashtags: data.hashtags ?? [],
                    status: statusValue!,
                },
                select: POST_BASE_SELECT,
            })

            if (productTags.length > 0) {
                await tx.postProduct.createMany({
                    data: productTags.map((p) => ({
                        postId: post.id,
                        productId: p.productId,
                        variantId: p.variantId ?? null,
                        position: p.position,
                    })),
                })
            }

            return tx.post.findUnique({
                where: { id: post.id },
                select: POST_BASE_SELECT,
            })
        })
    }

    /**
     * Cập nhật bài viết
     */
    async updatePost(
        id: string,
        data: {
            title?: string | undefined
            content?: string | null | undefined
            thumbnailUrl?: string | null | undefined
            hashtags?: string[] | undefined
            status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | undefined
        },
        newProductTags?: { productId: string; variantId?: string | null; position: number }[],
    ) {
        return this.prisma.$transaction(async (tx) => {
            const updateData: Prisma.PostUpdateInput = {}
            if (data.title !== undefined) updateData.title = data.title
            if (data.content !== undefined) updateData.content = data.content
            if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl
            if (data.hashtags !== undefined) updateData.hashtags = data.hashtags
            if (data.status !== undefined) {
                updateData.status = data.status as Prisma.EnumPostStatusFieldUpdateOperationsInput['set'] as never
            }

            await tx.post.update({
                where: { id },
                data: updateData,
            })

            if (newProductTags !== undefined) {
                await tx.postProduct.deleteMany({ where: { postId: id } })
                if (newProductTags.length > 0) {
                    await tx.postProduct.createMany({
                        data: newProductTags.map((p) => ({
                            postId: id,
                            productId: p.productId,
                            variantId: p.variantId ?? null,
                            position: p.position,
                        })),
                    })
                }
            }

            return tx.post.findUnique({
                where: { id },
                select: POST_BASE_SELECT,
            })
        })
    }

    /**
     * Xóa bài viết
     */
    async deletePost(id: string) {
        return this.prisma.post.delete({ where: { id } })
    }

    /**
     * Tăng lượt xem bài viết
     */
    async incrementViewCount(id: string) {
        return this.prisma.post.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
            select: { id: true, viewCount: true },
        })
    }

    /**
     * Kiểm tra trạng thái thích của người dùng
     */
    async hasUserLiked(postId: string, userId: string): Promise<boolean> {
        const like = await this.prisma.postLike.findUnique({
            where: { postId_userId: { postId, userId } },
            select: { id: true },
        })
        return Boolean(like)
    }

    /**
     * Toggle like: Thích hoặc bỏ thích
     */
    async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
        return this.prisma.$transaction(async (tx) => {
            const existingLike = await tx.postLike.findUnique({
                where: { postId_userId: { postId, userId } },
                select: { id: true },
            })

            if (existingLike) {
                await tx.postLike.delete({
                    where: { postId_userId: { postId, userId } },
                })
                const updated = await tx.post.update({
                    where: { id: postId },
                    data: { likeCount: { decrement: 1 } },
                    select: { likeCount: true },
                })
                return { liked: false, likeCount: Math.max(0, updated.likeCount) }
            }

            await tx.postLike.create({
                data: { postId, userId },
            })
            const updated = await tx.post.update({
                where: { id: postId },
                data: { likeCount: { increment: 1 } },
                select: { likeCount: true },
            })
            return { liked: true, likeCount: updated.likeCount }
        })
    }

    /**
     * Lấy thông tin các sản phẩm gắn kèm
     */
    async findProductsByIds(productIds: string[]) {
        if (productIds.length === 0) return []
        return this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: PRODUCT_SUMMARY_SELECT,
        })
    }

    /**
     * Lấy thông tin hồ sơ người bán theo danh sách sellerId hoặc userId
     */
    async findSellerProfiles(sellerIds: string[]) {
        if (sellerIds.length === 0) return []
        return this.prisma.sellerProfile.findMany({
            where: {
                OR: [{ id: { in: sellerIds } }, { userId: { in: sellerIds } }],
            },
            select: SELLER_SUMMARY_SELECT,
        })
    }

    /**
     * Tìm hồ sơ người bán theo userId
     */
    async findSellerProfileByUserId(userId: string) {
        return this.prisma.sellerProfile.findUnique({
            where: { userId },
            select: SELLER_SUMMARY_SELECT,
        })
    }
}
