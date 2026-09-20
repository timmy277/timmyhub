import type { PrismaClient } from '../../src/generated/prisma/client'

import type { SeedUsers } from './user'

export type SeedSellers = {
    sellerProfileIds: string[]
    brandSellerProfileId: string
}

const SHOPS: Array<{
    shopName: string
    shopSlug: string
    description: string
    provinceCode: string
    districtCode: string
}> = [
    {
        shopName: 'Thời Trang Hùng Store',
        shopSlug: 'thoi-trang-hung-store',
        description: 'Chuyên quần áo nam nữ giá tốt, giao nhanh toàn quốc.',
        provinceCode: 'HN',
        districtCode: 'HN-CG',
    },
    {
        shopName: 'Quân Điện Tử',
        shopSlug: 'quan-dien-tu',
        description: 'Linh kiện điện tử, phụ kiện điện thoại chính hãng.',
        provinceCode: 'HCM',
        districtCode: 'HCM-Q1',
    },
    {
        shopName: 'Gia Dụng Thảo',
        shopSlug: 'gia-dung-thao',
        description: 'Đồ gia dụng nhà bếp, dụng cụ vệ sinh, giá sỉ.',
        provinceCode: 'DN',
        districtCode: 'DN-HC',
    },
]

export async function seedSellers(prisma: PrismaClient, users: SeedUsers): Promise<SeedSellers> {
    console.log('  - Seeding seller profiles, brand profile, seller application...')

    const sellerProfileIds: string[] = []
    for (let i = 0; i < users.sellerUserIds.length; i++) {
        // sellerUserIds (user.ts) và SHOPS (khai báo ở trên) luôn có cùng độ dài 3, khớp theo vị trí.
        const userId = users.sellerUserIds[i]!
        const shop = SHOPS[i]!

        const sellerProfile = await prisma.sellerProfile.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                shopName: shop.shopName,
                shopSlug: shop.shopSlug,
                description: shop.description,
                provinceCode: shop.provinceCode,
                districtCode: shop.districtCode,
                status: 'APPROVED',
                isVerified: true,
                verifiedAt: new Date(),
                rating: 4.5,
                avgResponseHours: 2,
            },
        })
        sellerProfileIds.push(sellerProfile.id)
    }

    const brandSellerProfile = await prisma.sellerProfile.upsert({
        where: { userId: users.brandUserId },
        update: {},
        create: {
            userId: users.brandUserId,
            shopName: 'TimmyWear Official Store',
            shopSlug: 'timmywear-official-store',
            description: 'Cửa hàng chính hãng của thương hiệu TimmyWear.',
            provinceCode: 'HN',
            districtCode: 'HN-CG',
            status: 'APPROVED',
            isVerified: true,
            verifiedAt: new Date(),
            rating: 4.9,
            avgResponseHours: 1,
        },
    })

    await prisma.brandProfile.upsert({
        where: { sellerProfileId: brandSellerProfile.id },
        update: {},
        create: {
            sellerProfileId: brandSellerProfile.id,
            userId: users.brandUserId,
            brandName: 'TimmyWear',
            brandSlug: 'timmywear',
            description: 'Thương hiệu thời trang nội địa, hàng chính hãng 100%.',
            isVerified: true,
        },
    })

    // Đơn đăng ký bán hàng đang chờ duyệt — dữ liệu mẫu cho màn hình admin duyệt seller
    await prisma.sellerApplication.upsert({
        where: { id: 'seed-seller-application-pending' },
        update: {},
        create: {
            id: 'seed-seller-application-pending',
            userId: users.customerUserIds[0]!,
            shopName: 'Homemade An Nhiên',
            shopDescription: 'Đồ ăn vặt handmade, mới đăng ký bán hàng.',
            idDocumentUrl: 'https://cdn.timmyhub.dev/seed/id-documents/sample-cccd.jpg',
            taxCode: null,
            status: 'PENDING',
        },
    })

    // Theo dõi shop mẫu — vài customer follow shop TimmyWear
    for (const customerUserId of users.customerUserIds.slice(0, 2)) {
        await prisma.shopFollow.upsert({
            where: { userId_sellerProfileId: { userId: customerUserId, sellerProfileId: brandSellerProfile.id } },
            update: {},
            create: { userId: customerUserId, sellerProfileId: brandSellerProfile.id },
        })
    }

    return { sellerProfileIds, brandSellerProfileId: brandSellerProfile.id }
}
