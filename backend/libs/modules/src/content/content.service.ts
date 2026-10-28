import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import type {
    CreateVideoPostInput,
    PostProductDto,
    UpdateVideoPostInput,
    VideoFeedResponseDto,
    VideoPostDto,
} from '@timmyhub/contracts'
import { PrismaService } from '@timmyhub/prisma'

import { CONTENT_PAGINATION, STATIC_FALLBACK_VIDEO_POSTS } from './content.constants'
import { ContentRepository } from './content.repository'
import { MediaQueueService } from './media-queue.service'
import { VideoTranscodeService } from './video-transcode.service'

@Injectable()
export class ContentService {
    private readonly logger = new Logger(ContentService.name)

    // In-memory feed cache for instant response & high resilience
    private cachedFeedItems: VideoPostDto[] = []
    private lastFeedFetchTime = 0
    private readonly FEED_CACHE_TTL_MS = 60_000

    constructor(
        private readonly prisma: PrismaService,
        private readonly contentRepo: ContentRepository,
        private readonly transcodeService: VideoTranscodeService,
        private readonly mediaQueueService: MediaQueueService,
    ) {}

    public invalidateFeedCache(): void {
        this.cachedFeedItems = []
        this.lastFeedFetchTime = 0
    }

    /**
     * Tải hoặc làm mới danh sách bài đăng từ cơ sở dữ liệu với cache trong bộ nhớ
     */
    private async getOrRefreshPublishedVideos(): Promise<VideoPostDto[]> {
        const isCacheValid =
            this.cachedFeedItems.length > 0 && Date.now() - this.lastFeedFetchTime < this.FEED_CACHE_TTL_MS
        if (isCacheValid) {
            return this.cachedFeedItems
        }

        try {
            let posts = await this.contentRepo.findPublishedVideos(CONTENT_PAGINATION.MAX_LIMIT)
            if (posts.length === 0) {
                await this.seedInitialVideoPosts()
                posts = await this.contentRepo.findPublishedVideos(CONTENT_PAGINATION.MAX_LIMIT)
            }

            if (posts.length === 0) {
                this.cachedFeedItems = [...STATIC_FALLBACK_VIDEO_POSTS]
                this.lastFeedFetchTime = Date.now()
                return this.cachedFeedItems
            }

            const productIds = Array.from(
                new Set(posts.flatMap((p) => p.productTags.map((t) => t.productId)).filter(Boolean)),
            )
            const sellerIds = Array.from(new Set(posts.map((p) => p.sellerId).filter(Boolean)))

            const [products, sellers] = await Promise.all([
                this.contentRepo.findProductsByIds(productIds),
                this.contentRepo.findSellerProfiles(sellerIds),
            ])

            const productMap = new Map(products.map((prod) => [prod.id, prod]))
            const sellerMap = new Map<
                string,
                { id: string; shopName: string; shopSlug: string; shopLogo: string | null; isVerified: boolean }
            >()
            for (const s of sellers) {
                sellerMap.set(s.id, s)
                sellerMap.set(s.userId, s)
            }

            this.cachedFeedItems = posts.map((post) => {
                const seller = sellerMap.get(post.sellerId)
                const taggedProducts: PostProductDto[] = []

                for (const pt of post.productTags) {
                    const prod = productMap.get(pt.productId)
                    if (prod) {
                        taggedProducts.push({
                            id: pt.id,
                            productId: prod.id,
                            variantId: pt.variantId,
                            position: pt.position,
                            product: {
                                id: prod.id,
                                name: prod.name,
                                slug: prod.slug,
                                price: prod.minPrice ? Number(prod.minPrice) : 0,
                                originalPrice: prod.maxPrice ? Number(prod.maxPrice) : null,
                                thumbnailUrl: prod.images?.[0] ?? null,
                                inStock: prod.status === 'APPROVED',
                            },
                        })
                    }
                }

                // Không bao giờ gán file video vào thumbnailUrl để tránh lỗi next/image
                const hasValidImageThumbnail =
                    post.thumbnailUrl &&
                    !post.thumbnailUrl.endsWith('.mp4') &&
                    !post.thumbnailUrl.includes('.mp4#') &&
                    !post.thumbnailUrl.endsWith('.m3u8')

                const resolvedThumbnail = hasValidImageThumbnail
                    ? post.thumbnailUrl
                    : (taggedProducts[0]?.product.thumbnailUrl ?? null)

                return {
                    id: post.id,
                    sellerId: post.sellerId,
                    shopName: seller?.shopName || 'Cửa hàng TimmyHub',
                    shopLogo: seller?.shopLogo ?? null,
                    shopSlug: seller?.shopSlug,
                    title: post.title,
                    content: post.content,
                    videoUrl: post.videoUrl ?? '',
                    thumbnailUrl: resolvedThumbnail,
                    hashtags: post.hashtags,
                    status: post.status,
                    viewCount: post.viewCount,
                    likeCount: post.likeCount,
                    commentCount: post.commentCount,
                    isLiked: false,
                    productTags: taggedProducts,
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString(),
                }
            })

            this.lastFeedFetchTime = Date.now()
            return this.cachedFeedItems
        } catch (error) {
            this.logger.error(`Lỗi tải video feed từ database: ${(error as Error).message}. Sử dụng fallback tĩnh.`)
            if (this.cachedFeedItems.length > 0) {
                return this.cachedFeedItems
            }
            return STATIC_FALLBACK_VIDEO_POSTS
        }
    }

    /**
     * Lấy feed video cộng đồng ngẫu nhiên cho trang chủ hoặc màn hình xem video
     * REQ-PST-001, FEAT-PST-001
     */
    async getVideoFeed(
        limit: number = CONTENT_PAGINATION.DEFAULT_LIMIT,
        excludeId?: string,
        currentUserId?: string,
        isRandom = false,
    ): Promise<VideoFeedResponseDto> {
        const safeLimit = Math.min(Math.max(1, limit), CONTENT_PAGINATION.MAX_LIMIT)

        const allPosts = await this.getOrRefreshPublishedVideos()
        const candidates = excludeId ? allPosts.filter((p) => p.id !== excludeId) : [...allPosts]

        if (isRandom) {
            // Fisher-Yates shuffle để phân phối ngẫu nhiên đều
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                const itemI = candidates[i]
                const itemJ = candidates[j]
                if (itemI !== undefined && itemJ !== undefined) {
                    candidates[i] = itemJ
                    candidates[j] = itemI
                }
            }
        }

        const selected = candidates.slice(0, safeLimit)

        // Kiểm tra like hiệu quả theo lô nếu có user đang đăng nhập
        let likedPostIds = new Set<string>()
        if (currentUserId && selected.length > 0) {
            try {
                const likes = await this.prisma.postLike.findMany({
                    where: {
                        userId: currentUserId,
                        postId: { in: selected.map((p) => p.id) },
                    },
                    select: { postId: true },
                })
                likedPostIds = new Set(likes.map((l) => l.postId))
            } catch (err) {
                this.logger.warn(`Không thể lấy danh sách like: ${(err as Error).message}`)
            }
        }

        const items = selected.map((p) => ({
            ...p,
            isLiked: likedPostIds.has(p.id),
        }))

        return {
            items,
            total: allPosts.length,
            hasMore: allPosts.length > safeLimit,
        }
    }

    /**
     * Tăng số lượt xem video
     */
    async recordView(postId: string): Promise<{ id: string; viewCount: number }> {
        const post = await this.contentRepo.findPostById(postId)
        if (!post) {
            throw new NotFoundException('Không tìm thấy video bài đăng')
        }
        return this.contentRepo.incrementViewCount(postId)
    }

    /**
     * Thích hoặc bỏ thích video
     */
    async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
        const post = await this.contentRepo.findPostById(postId)
        if (!post) {
            throw new NotFoundException('Không tìm thấy video bài đăng')
        }
        return this.contentRepo.toggleLike(postId, userId)
    }

    /**
     * Lấy danh sách video của người bán (Seller Portal)
     */
    async getSellerVideos(
        sellerUserId: string,
        status?: string,
        page = CONTENT_PAGINATION.DEFAULT_PAGE,
        limit = CONTENT_PAGINATION.DEFAULT_LIMIT,
    ) {
        const seller = await this.contentRepo.findSellerProfileByUserId(sellerUserId)
        const sellerId = seller ? seller.id : sellerUserId

        const { items, total } = await this.contentRepo.findSellerPosts(sellerId, status, page, limit)

        const productIds = Array.from(
            new Set(items.flatMap((p) => p.productTags.map((t) => t.productId)).filter(Boolean)),
        )
        const products = await this.contentRepo.findProductsByIds(productIds)
        const productMap = new Map(products.map((p) => [p.id, p]))

        const mappedItems: VideoPostDto[] = items.map((post) => {
            const taggedProducts: PostProductDto[] = []
            for (const pt of post.productTags) {
                const prod = productMap.get(pt.productId)
                if (prod) {
                    taggedProducts.push({
                        id: pt.id,
                        productId: prod.id,
                        variantId: pt.variantId,
                        position: pt.position,
                        product: {
                            id: prod.id,
                            name: prod.name,
                            slug: prod.slug,
                            price: prod.minPrice ? Number(prod.minPrice) : 0,
                            originalPrice: prod.maxPrice ? Number(prod.maxPrice) : null,
                            thumbnailUrl: prod.images?.[0] ?? null,
                            inStock: prod.status === 'APPROVED',
                        },
                    })
                }
            }

            return {
                id: post.id,
                sellerId: post.sellerId,
                shopName: seller?.shopName || 'Cửa hàng của tôi',
                shopLogo: seller?.shopLogo ?? null,
                shopSlug: seller?.shopSlug,
                title: post.title,
                content: post.content,
                videoUrl: post.videoUrl ?? '',
                thumbnailUrl: post.thumbnailUrl || (post.videoUrl ? `${post.videoUrl}#t=0.0001` : null),
                hashtags: post.hashtags,
                status: post.status,
                viewCount: post.viewCount,
                likeCount: post.likeCount,
                commentCount: post.commentCount,
                isLiked: false,
                productTags: taggedProducts,
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString(),
            }
        })

        return {
            items: mappedItems,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    }

    /**
     * Tạo video bài đăng bán hàng mới cho người bán
     */
    async createSellerVideo(sellerUserId: string, input: CreateVideoPostInput): Promise<VideoPostDto> {
        let seller = await this.contentRepo.findSellerProfileByUserId(sellerUserId)
        if (!seller) {
            const directSeller = await this.prisma.sellerProfile.findUnique({
                where: { id: sellerUserId },
                select: { id: true, userId: true, shopName: true, shopSlug: true, shopLogo: true, isVerified: true },
            })
            if (directSeller) {
                seller = directSeller
            } else {
                throw new BadRequestException('Tài khoản chưa có hồ sơ người bán đã được duyệt.')
            }
        }

        // Tự động phân tích hashtags nếu chưa nhập
        let hashtags = input.hashtags ?? []
        if (hashtags.length === 0 && input.content) {
            const matches = input.content.match(/#[\p{L}\p{N}_]+/gu)
            if (matches) {
                hashtags = matches.map((m) => m.slice(1))
            }
        }

        // Thumbnail fallback: Nếu không có thumbnail, đặt fallback 0.0001s
        const resolvedThumbnail = input.thumbnailUrl || `${input.videoUrl}#t=0.0001`

        const productTags = input.productIds.map((pid, idx) => ({
            productId: pid,
            position: idx,
        }))

        const created = await this.contentRepo.createPost(
            {
                sellerId: seller.id,
                title: input.title,
                content: input.content,
                videoUrl: input.videoUrl,
                thumbnailUrl: resolvedThumbnail,
                hashtags,
                status: input.status,
            },
            productTags,
        )

        if (!created) {
            throw new BadRequestException('Không thể tạo bài đăng video')
        }

        this.invalidateFeedCache()

        // Kích hoạt pipeline nén & chuyển đổi HLS ngầm qua BullMQ background job (non-blocking, luật #16)
        const enqueued = await this.mediaQueueService.addTranscodeJob(created.id, input.videoUrl)
        if (!enqueued) {
            // Fallback an toàn: nếu Redis/Queue tạm thời không khả dụng, chạy async in-process
            void this.triggerAsyncVideoTranscode(created.id, input.videoUrl)
        }

        const feedResult = await this.getVideoFeed(10, undefined, sellerUserId)
        const matched = feedResult.items.find((item) => item.id === created.id)
        if (matched) return matched

        return {
            id: created.id,
            sellerId: created.sellerId,
            shopName: seller.shopName,
            shopLogo: seller.shopLogo,
            shopSlug: seller.shopSlug,
            title: created.title,
            content: created.content,
            videoUrl: created.videoUrl ?? '',
            thumbnailUrl: resolvedThumbnail,
            hashtags: created.hashtags,
            status: created.status,
            viewCount: created.viewCount,
            likeCount: created.likeCount,
            commentCount: created.commentCount,
            isLiked: false,
            productTags: [],
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        }
    }

    /**
     * Cập nhật video bài đăng
     */
    async updateSellerVideo(sellerUserId: string, postId: string, input: UpdateVideoPostInput): Promise<VideoPostDto> {
        const post = await this.contentRepo.findPostById(postId)
        if (!post) {
            throw new NotFoundException('Không tìm thấy bài đăng')
        }

        const seller = await this.contentRepo.findSellerProfileByUserId(sellerUserId)
        if (seller && post.sellerId !== seller.id && post.sellerId !== sellerUserId) {
            throw new BadRequestException('Bạn không có quyền sửa bài đăng này')
        }

        const productTags = input.productIds?.map((pid, idx) => ({
            productId: pid,
            position: idx,
        }))

        await this.contentRepo.updatePost(
            postId,
            {
                title: input.title,
                content: input.content,
                thumbnailUrl: input.thumbnailUrl,
                hashtags: input.hashtags,
                status: input.status,
            },
            productTags,
        )

        this.invalidateFeedCache()

        const feedResult = await this.getVideoFeed(20, undefined, sellerUserId)
        const updated = feedResult.items.find((item) => item.id === postId)
        if (!updated) {
            throw new NotFoundException('Không tìm thấy bài đăng sau khi cập nhật')
        }
        return updated
    }

    /**
     * Xóa video bài đăng
     */
    async deleteSellerVideo(sellerUserId: string, postId: string): Promise<{ success: boolean }> {
        const post = await this.contentRepo.findPostById(postId)
        if (!post) {
            throw new NotFoundException('Không tìm thấy bài đăng')
        }

        const seller = await this.contentRepo.findSellerProfileByUserId(sellerUserId)
        if (seller && post.sellerId !== seller.id && post.sellerId !== sellerUserId) {
            throw new BadRequestException('Bạn không có quyền xóa bài đăng này')
        }

        await this.contentRepo.deletePost(postId)
        this.invalidateFeedCache()
        return { success: true }
    }

    /**
     * Lấy chi tiết một bài đăng video theo ID
     */
    async getVideoById(postId: string, currentUserId?: string): Promise<VideoPostDto> {
        const post = await this.contentRepo.findPostById(postId)
        if (!post) {
            throw new NotFoundException('Không tìm thấy bài đăng video')
        }

        const productIds = post.productTags.map((t) => t.productId).filter(Boolean)
        const [products, seller] = await Promise.all([
            this.contentRepo.findProductsByIds(productIds),
            this.contentRepo.findSellerProfileByUserId(post.sellerId).then(async (s) => {
                if (s) return s
                return this.prisma.sellerProfile.findUnique({
                    where: { id: post.sellerId },
                    select: {
                        id: true,
                        userId: true,
                        shopName: true,
                        shopSlug: true,
                        shopLogo: true,
                        isVerified: true,
                    },
                })
            }),
        ])

        const productMap = new Map(products.map((p) => [p.id, p]))
        const taggedProducts: PostProductDto[] = []
        for (const pt of post.productTags) {
            const prod = productMap.get(pt.productId)
            if (prod) {
                taggedProducts.push({
                    id: pt.id,
                    productId: prod.id,
                    variantId: pt.variantId,
                    position: pt.position,
                    product: {
                        id: prod.id,
                        name: prod.name,
                        slug: prod.slug,
                        price: prod.minPrice ? Number(prod.minPrice) : 0,
                        originalPrice: prod.maxPrice ? Number(prod.maxPrice) : null,
                        thumbnailUrl: prod.images?.[0] ?? null,
                        inStock: prod.status === 'APPROVED',
                    },
                })
            }
        }

        let isLiked = false
        if (currentUserId) {
            isLiked = await this.contentRepo.hasUserLiked(post.id, currentUserId)
        }

        return {
            id: post.id,
            sellerId: post.sellerId,
            shopName: seller?.shopName || 'Cửa hàng',
            shopLogo: seller?.shopLogo ?? null,
            shopSlug: seller?.shopSlug,
            title: post.title,
            content: post.content,
            videoUrl: post.videoUrl ?? '',
            thumbnailUrl: post.thumbnailUrl || (post.videoUrl ? `${post.videoUrl}#t=0.001` : null),
            hashtags: post.hashtags,
            status: post.status,
            viewCount: post.viewCount,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            isLiked,
            productTags: taggedProducts,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
        }
    }

    /**
     * Lấy danh sách bình luận của video (kèm thông tin user)
     */
    async getComments(postId: string) {
        const comments = await this.prisma.postComment.findMany({
            where: { postId, parentId: null },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                replies: {
                    orderBy: { createdAt: 'asc' },
                    take: 10,
                },
            },
        })

        const userIds = Array.from(new Set(comments.flatMap((c) => [c.userId, ...c.replies.map((r) => r.userId)])))
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true, displayName: true, avatar: true } },
            },
        })
        const userMap = new Map(users.map((u) => [u.id, u]))

        return comments.map((c) => {
            const u = userMap.get(c.userId)
            const fullName =
                u?.profile?.displayName ||
                `${u?.profile?.firstName || ''} ${u?.profile?.lastName || ''}`.trim() ||
                u?.email?.split('@')[0] ||
                'Người dùng'

            return {
                id: c.id,
                postId: c.postId,
                userId: c.userId,
                content: c.content,
                createdAt: c.createdAt.toISOString(),
                user: {
                    id: c.userId,
                    name: fullName,
                    avatar: u?.profile?.avatar || null,
                },
                replies: c.replies.map((r) => {
                    const ru = userMap.get(r.userId)
                    const rFullName =
                        ru?.profile?.displayName ||
                        `${ru?.profile?.firstName || ''} ${ru?.profile?.lastName || ''}`.trim() ||
                        ru?.email?.split('@')[0] ||
                        'Người dùng'

                    return {
                        id: r.id,
                        postId: r.postId,
                        userId: r.userId,
                        content: r.content,
                        createdAt: r.createdAt.toISOString(),
                        user: {
                            id: r.userId,
                            name: rFullName,
                            avatar: ru?.profile?.avatar || null,
                        },
                    }
                }),
            }
        })
    }

    /**
     * Thêm bình luận mới vào video
     */
    async addComment(postId: string, userId: string, content: string, parentId?: string) {
        if (!content || !content.trim()) {
            throw new BadRequestException('Nội dung bình luận không được để trống')
        }

        const post = await this.prisma.post.findUnique({ where: { id: postId } })
        if (!post) {
            throw new NotFoundException('Không tìm thấy bài đăng video')
        }

        const comment = await this.prisma.$transaction(async (tx) => {
            const created = await tx.postComment.create({
                data: {
                    postId,
                    userId,
                    content: content.trim(),
                    parentId: parentId || null,
                },
            })

            await tx.post.update({
                where: { id: postId },
                data: { commentCount: { increment: 1 } },
            })

            return created
        })

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true, displayName: true, avatar: true } },
            },
        })
        const fullName =
            user?.profile?.displayName ||
            `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() ||
            user?.email?.split('@')[0] ||
            'Người dùng'

        return {
            id: comment.id,
            postId: comment.postId,
            userId: comment.userId,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            user: {
                id: userId,
                name: fullName,
                avatar: user?.profile?.avatar || null,
            },
        }
    }

    /**
     * Tự động khởi tạo 4 video mẫu shoppable với HLS + MP4 adaptive chất lượng cao
     */
    private async seedInitialVideoPosts(): Promise<void> {
        try {
            this.logger.log('Đang khởi tạo các video mẫu shoppable cho bảng posts...')

            // Lấy danh sách sản phẩm và người bán có sẵn
            const [products, sellers] = await Promise.all([
                this.prisma.product.findMany({
                    take: 6,
                    select: { id: true, name: true, slug: true, shopId: true },
                }),
                this.prisma.sellerProfile.findMany({
                    take: 3,
                    select: { id: true, shopName: true },
                }),
            ])

            const defaultSellerId = sellers[0]?.id || 'seed-seller-default'

            const sampleVideos = [
                {
                    title: 'Trải nghiệm phong cách Minimalism với Áo thun nam Basic Cotton 100%',
                    content:
                        'Chất vải cotton co giãn 4 chiều mềm mịn, không xù lông khi giặt máy. Phù hợp cả đi làm lẫn dạo phố cuối tuần! #aothun #thoitrangnam #minimalism',
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                    thumbnailUrl:
                        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
                    hashtags: ['aothun', 'thoitrangnam', 'minimalism'],
                    sellerId: sellers[0]?.id || defaultSellerId,
                    productIndex: 0,
                    views: 3420,
                    likes: 215,
                },
                {
                    title: 'Đập hộp & Test camera Xphone 12 Pro: Siêu phẩm quay đêm cực đỉnh!',
                    content:
                        'Camera AI cảm biến lớn bắt nét siêu nhanh, chống rung quang học OIS cực êm. Xem ngay ưu đãi trả góp 0% tại TimmyHub! #xphone #techreview #smartphone',
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                    thumbnailUrl:
                        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
                    hashtags: ['xphone', 'techreview', 'dienthoai'],
                    sellerId: sellers[1]?.id || defaultSellerId,
                    productIndex: 1,
                    views: 5890,
                    likes: 478,
                },
                {
                    title: 'Bí quyết nấu ăn không dính với Bộ nồi chảo vân đá Ceramic cao cấp',
                    content:
                        'Đáy từ 5 lớp bắt nhiệt siêu nhanh, tiết kiệm 30% điện năng khi dùng bếp từ. Thử ngay món trứng cuộn lướt nhẹ êm ru! #giadung #bepnha #sale',
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                    thumbnailUrl:
                        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
                    hashtags: ['giadung', 'nhabep', 'sale'],
                    sellerId: sellers[2]?.id || defaultSellerId,
                    productIndex: 2,
                    views: 1980,
                    likes: 142,
                },
                {
                    title: 'Lookbook Hoodie TimmyWear Streetwear Collection Thu Đông',
                    content:
                        'Form oversize cá tính, chất nỉ bông dày dặn ấm áp. Phối với quần jogger hoặc jean rách đều chất! #timmywear #hoodie #streetwear',
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    thumbnailUrl:
                        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
                    hashtags: ['timmywear', 'hoodie', 'streetwear'],
                    sellerId: sellers[0]?.id || defaultSellerId,
                    productIndex: 3,
                    views: 4120,
                    likes: 310,
                },
            ]

            for (const item of sampleVideos) {
                const targetProduct = products[item.productIndex] || products[0]
                const productTags = targetProduct ? [{ productId: targetProduct.id, position: 0 }] : []

                await this.prisma.$transaction(async (tx) => {
                    const post = await tx.post.create({
                        data: {
                            sellerId: item.sellerId,
                            title: item.title,
                            content: item.content,
                            videoUrl: item.videoUrl,
                            thumbnailUrl: item.thumbnailUrl,
                            hashtags: item.hashtags,
                            status: 'PUBLISHED',
                            viewCount: item.views,
                            likeCount: item.likes,
                            commentCount: Math.floor(item.likes / 6),
                        },
                    })

                    if (productTags.length > 0) {
                        await tx.postProduct.createMany({
                            data: productTags.map((p) => ({
                                postId: post.id,
                                productId: p.productId,
                                position: p.position,
                            })),
                        })
                    }
                })
            }

            this.logger.log('Đã khởi tạo thành công 4 video bán hàng mẫu.')
            this.invalidateFeedCache()
        } catch (error) {
            this.logger.error(`Lỗi khi seed video mẫu: ${(error as Error).message}`)
        }
    }

    /**
     * Kích hoạt pipeline xử lý video (nén, HLS, poster) ở background không chặn request
     */
    private async triggerAsyncVideoTranscode(postId: string, videoUrl: string): Promise<void> {
        try {
            const res = await this.transcodeService.processVideoForPost(videoUrl, postId)
            if (res.success && res.hlsUrl) {
                await this.prisma.post.update({
                    where: { id: postId },
                    data: {
                        videoUrl: res.hlsUrl,
                        ...(res.thumbnailUrl ? { thumbnailUrl: res.thumbnailUrl } : {}),
                    },
                })
                this.logger.log(`Cập nhật thành công luồng HLS cho bài đăng ${postId}: ${res.hlsUrl}`)
            }
        } catch (error) {
            this.logger.error(`Lỗi khi xử lý background transcode cho ${postId}: ${(error as Error).message}`)
        }
    }
}
