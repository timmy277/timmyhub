import { existsSync } from 'node:fs'
import path from 'node:path'

import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

import { PrismaClient } from '../src/generated/prisma/client'
import { seedCategories } from './seeds/category'
import { seedLocations } from './seeds/location'
import { seedPermissions } from './seeds/permission'
import { seedPosts } from './seeds/post'
import { seedProducts } from './seeds/product'
import { seedRoles } from './seeds/role'
import { seedSellers } from './seeds/seller'
import { seedUsers } from './seeds/user'
import { seedVouchers } from './seeds/voucher'

const apiEnvPath = path.resolve(__dirname, '../../../apps/api/.env')
if (existsSync(apiEnvPath)) {
    dotenv.config({ path: apiEnvPath })
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function seed() {
    console.log('🌱 Bắt đầu seed dữ liệu...')

    console.log('[1/9] Permissions')
    await seedPermissions(prisma)

    console.log('[2/9] Roles')
    await seedRoles(prisma)

    console.log('[3/9] Users')
    const users = await seedUsers(prisma)

    console.log('[4/9] Sellers')
    const sellers = await seedSellers(prisma, users)

    console.log('[5/9] Locations')
    await seedLocations(prisma)

    console.log('[6/9] Categories')
    const categoryIdBySlug = await seedCategories(prisma)

    console.log('[7/9] Products')
    const productBySlug = await seedProducts(prisma, categoryIdBySlug, sellers)

    console.log('[8/9] Vouchers')
    await seedVouchers(prisma, users, sellers)

    console.log('[9/9] Posts')
    await seedPosts(prisma, users, sellers, productBySlug)

    console.log('✅ Seed hoàn tất.')
}

seed()
    .catch((error) => {
        console.error('❌ Seed thất bại:', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
