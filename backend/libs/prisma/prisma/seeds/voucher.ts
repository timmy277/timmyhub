import type { PrismaClient } from '../../src/generated/prisma/client'

import type { SeedSellers } from './seller'
import type { SeedUsers } from './user'

const DAY_MS = 24 * 60 * 60 * 1000

export async function seedVouchers(prisma: PrismaClient, users: SeedUsers, sellers: SeedSellers) {
    console.log('  - Seeding campaign, vouchers, user vouchers...')

    const now = new Date()

    const flashSale = await prisma.promotionCampaign.upsert({
        where: { id: 'seed-campaign-flash-sale-9-9' },
        update: {},
        create: {
            id: 'seed-campaign-flash-sale-9-9',
            name: 'Flash Sale 9.9',
            description: 'Chiến dịch flash sale toàn sàn, giảm sâu trong 3 ngày.',
            type: 'FLASH_SALE',
            ownerType: 'PLATFORM',
            startDate: now,
            endDate: new Date(now.getTime() + 3 * DAY_MS),
            isActive: true,
            requiresApproval: false,
            badgeText: 'FLASH SALE',
        },
    })

    const platformPercentage = await prisma.voucher.upsert({
        where: { code: 'TIMMY9SALE' },
        update: {},
        create: {
            code: 'TIMMY9SALE',
            type: 'PERCENTAGE',
            value: 10,
            minOrderValue: 200000,
            maxDiscount: 50000,
            usageLimit: 1000,
            perUserLimit: 1,
            isActive: true,
            startDate: now,
            endDate: new Date(now.getTime() + 3 * DAY_MS),
            description: 'Giảm 10%, tối đa 50.000đ cho đơn từ 200.000đ.',
            campaignId: flashSale.id,
        },
    })

    const platformFixed = await prisma.voucher.upsert({
        where: { code: 'TIMMYFIXED30K' },
        update: {},
        create: {
            code: 'TIMMYFIXED30K',
            type: 'FIXED_AMOUNT',
            value: 30000,
            minOrderValue: 300000,
            usageLimit: 500,
            perUserLimit: 1,
            isActive: true,
            startDate: now,
            endDate: new Date(now.getTime() + 30 * DAY_MS),
            description: 'Giảm ngay 30.000đ cho đơn từ 300.000đ.',
        },
    })

    const platformFreeShipping = await prisma.voucher.upsert({
        where: { code: 'TIMMYFREESHIP' },
        update: {},
        create: {
            code: 'TIMMYFREESHIP',
            type: 'FREE_SHIPPING',
            value: 30000,
            minOrderValue: 100000,
            maxDiscount: 30000,
            usageLimit: 2000,
            perUserLimit: 2,
            isActive: true,
            startDate: now,
            endDate: new Date(now.getTime() + 30 * DAY_MS),
            description: 'Miễn phí vận chuyển tối đa 30.000đ cho đơn từ 100.000đ.',
        },
    })

    const sellerVoucher = await prisma.voucher.upsert({
        where: { code: 'HUNGSTORE15' },
        update: {},
        create: {
            code: 'HUNGSTORE15',
            type: 'PERCENTAGE',
            value: 15,
            minOrderValue: 150000,
            maxDiscount: 40000,
            usageLimit: 200,
            perUserLimit: 1,
            isActive: true,
            startDate: now,
            endDate: new Date(now.getTime() + 14 * DAY_MS),
            description: 'Voucher riêng của Thời Trang Hùng Store, giảm 15%.',
            sellerId: sellers.sellerProfileIds[0]!,
        },
    })

    const brandVoucher = await prisma.voucher.upsert({
        where: { code: 'TIMMYWEARVIP' },
        update: {},
        create: {
            code: 'TIMMYWEARVIP',
            type: 'FIXED_AMOUNT',
            value: 50000,
            minOrderValue: 400000,
            usageLimit: 100,
            perUserLimit: 1,
            isActive: true,
            startDate: now,
            endDate: new Date(now.getTime() + 14 * DAY_MS),
            description: 'Voucher dành cho khách hàng thân thiết của TimmyWear.',
            sellerId: sellers.brandSellerProfileId,
        },
    })

    const vouchersToSave = [platformPercentage, platformFixed, platformFreeShipping, sellerVoucher, brandVoucher]
    for (const buyerUserId of users.buyerUserIds) {
        for (const voucher of vouchersToSave) {
            await prisma.userVoucher.upsert({
                where: { userId_voucherId: { userId: buyerUserId, voucherId: voucher.id } },
                update: {},
                create: { userId: buyerUserId, voucherId: voucher.id, status: 'SAVED' },
            })
        }
    }
}
