import type { PrismaClient } from '../../src/generated/prisma/client'

import type { SeedProduct } from './product'
import type { SeedSellers } from './seller'
import type { SeedUsers } from './user'

type PostSeed = {
    id: string
    sellerId: string
    title: string
    content: string
    images: string[]
    hashtags: string[]
    productSlugs: string[]
}

export async function seedPosts(
    prisma: PrismaClient,
    users: SeedUsers,
    sellers: SeedSellers,
    productBySlug: Record<string, SeedProduct>,
) {
    console.log('  - Seeding posts, product tags, likes, comments...')

    const POSTS: PostSeed[] = [
        {
            id: 'seed-post-ao-thun-basic',
            sellerId: sellers.sellerProfileIds[0]!,
            title: 'Áo thun basic mới về, giá cực tốt!',
            content: 'Form áo regular, vải cotton mềm mát, mặc cả ngày không nhăn. Sẵn 2 màu, 2 size.',
            images: ['https://cdn.timmyhub.dev/seed/posts/ao-thun-basic-1.jpg'],
            hashtags: ['aothun', 'thoitrangnam'],
            productSlugs: ['ao-thun-nam-basic-cotton'],
        },
        {
            id: 'seed-post-review-xphone-12',
            sellerId: sellers.sellerProfileIds[1]!,
            title: 'Review nhanh Xphone 12 sau 1 tuần dùng',
            content: 'Pin trâu, camera chụp đêm ổn trong tầm giá. Đang có ưu đãi trả góp 0%.',
            images: [
                'https://cdn.timmyhub.dev/seed/posts/xphone-12-review-1.jpg',
                'https://cdn.timmyhub.dev/seed/posts/xphone-12-review-2.jpg',
            ],
            hashtags: ['xphone', 'reviewdienthoai'],
            productSlugs: ['dien-thoai-xphone-12'],
        },
        {
            id: 'seed-post-bo-noi-sale',
            sellerId: sellers.sellerProfileIds[2]!,
            title: 'Bộ nồi chống dính giảm giá cuối tuần',
            content: 'Đáy từ dùng được cả bếp gas và bếp từ, bảo hành 12 tháng.',
            images: ['https://cdn.timmyhub.dev/seed/posts/bo-noi-sale-1.jpg'],
            hashtags: ['giadung', 'sale'],
            productSlugs: ['bo-noi-chong-dinh-3-mon'],
        },
        {
            id: 'seed-post-hoodie-lookbook',
            sellerId: sellers.brandSellerProfileId,
            title: 'Lookbook Hoodie TimmyWear thu đông',
            content: 'Chất vải cào lông giữ ấm tốt, đủ size từ S đến XL, hàng chính hãng có tag.',
            images: [
                'https://cdn.timmyhub.dev/seed/posts/hoodie-lookbook-1.jpg',
                'https://cdn.timmyhub.dev/seed/posts/hoodie-lookbook-2.jpg',
            ],
            hashtags: ['timmywear', 'hoodie', 'lookbook'],
            productSlugs: ['ao-hoodie-timmywear-unisex'],
        },
    ]

    for (const seed of POSTS) {
        const post = await prisma.post.upsert({
            where: { id: seed.id },
            update: {},
            create: {
                id: seed.id,
                sellerId: seed.sellerId,
                title: seed.title,
                content: seed.content,
                images: seed.images,
                hashtags: seed.hashtags,
                status: 'PUBLISHED',
                viewCount: 120,
                likeCount: 0,
                commentCount: 0,
            },
        })

        for (const slug of seed.productSlugs) {
            const product = productBySlug[slug]
            if (!product) continue

            await prisma.postProduct.upsert({
                where: { postId_productId: { postId: post.id, productId: product.productId } },
                update: {},
                create: { postId: post.id, productId: product.productId, variantId: product.defaultVariantId },
            })
        }

        let likeCount = 0
        for (const customerUserId of users.customerUserIds) {
            const like = await prisma.postLike.upsert({
                where: { postId_userId: { postId: post.id, userId: customerUserId } },
                update: {},
                create: { postId: post.id, userId: customerUserId },
            })
            if (like) likeCount++
        }

        const comment = await prisma.postComment.upsert({
            where: { id: `${seed.id}-comment-1` },
            update: {},
            create: {
                id: `${seed.id}-comment-1`,
                postId: post.id,
                userId: users.customerUserIds[0]!,
                content: 'Sản phẩm dùng ổn, giao hàng nhanh!',
            },
        })

        await prisma.postComment.upsert({
            where: { id: `${seed.id}-comment-1-reply` },
            update: {},
            create: {
                id: `${seed.id}-comment-1-reply`,
                postId: post.id,
                userId: users.customerUserIds[1]!,
                parentId: comment.id,
                content: 'Đồng ý, mình cũng mới mua tuần trước.',
            },
        })

        await prisma.post.update({
            where: { id: post.id },
            data: { likeCount, commentCount: 2 },
        })
    }
}
