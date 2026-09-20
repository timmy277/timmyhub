import { randomBytes, scryptSync } from 'node:crypto'

import type { PrismaClient } from '../../src/generated/prisma/client'

// Chỉ dùng cho dữ liệu seed/dev — không phải thuật toán hash chính thức của module identity.
// Mật khẩu seed chung cho mọi tài khoản mẫu: Seed@12345
function hashSeedPassword(plain: string): string {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(plain, salt, 64).toString('hex')
    return `scrypt$${salt}$${hash}`
}

const SEED_PASSWORD_HASH = hashSeedPassword('Seed@12345')

export type SeedUsers = {
    superAdminId: string
    adminId: string
    moderatorId: string
    sellerUserIds: string[]
    brandUserId: string
    customerUserIds: string[]
    shipperUserId: string
}

const STAFF: Array<{
    email: string
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR'
    firstName: string
    lastName: string
}> = [
    { email: 'superadmin@timmyhub.dev', role: 'SUPER_ADMIN', firstName: 'Super', lastName: 'Admin' },
    { email: 'admin@timmyhub.dev', role: 'ADMIN', firstName: 'Minh', lastName: 'Trần' },
    { email: 'moderator@timmyhub.dev', role: 'MODERATOR', firstName: 'Lan', lastName: 'Phạm' },
]

// User.roles (layer 1 — UserRole enum) không có MODERATOR, chỉ SystemRole (layer 2) mới có — moderator
// dùng nhãn layer 1 ADMIN, phân quyền chi tiết đến từ assignSystemRole('MODERATOR') bên dưới.
function toUserRole(staffRole: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR'): 'SUPER_ADMIN' | 'ADMIN' {
    return staffRole === 'MODERATOR' ? 'ADMIN' : staffRole
}

const SELLERS: Array<{ email: string; firstName: string; lastName: string }> = [
    { email: 'seller.thoitrang@timmyhub.dev', firstName: 'Hùng', lastName: 'Nguyễn' },
    { email: 'seller.dientu@timmyhub.dev', firstName: 'Quân', lastName: 'Lê' },
    { email: 'seller.giadung@timmyhub.dev', firstName: 'Thảo', lastName: 'Vũ' },
]

const CUSTOMERS: Array<{ email: string; phone: string; firstName: string; lastName: string }> = [
    { email: 'customer1@timmyhub.dev', phone: '0900000001', firstName: 'An', lastName: 'Đỗ' },
    { email: 'customer2@timmyhub.dev', phone: '0900000002', firstName: 'Bình', lastName: 'Hoàng' },
    { email: 'customer3@timmyhub.dev', phone: '0900000003', firstName: 'Chi', lastName: 'Ngô' },
    { email: 'customer4@timmyhub.dev', phone: '0900000004', firstName: 'Duy', lastName: 'Bùi' },
]

async function upsertUserWithProfile(
    prisma: PrismaClient,
    input: {
        email: string
        phone?: string
        firstName: string
        lastName: string
        roles: Array<'CUSTOMER' | 'SELLER' | 'BRAND' | 'SHIPPER' | 'ADMIN' | 'SUPER_ADMIN'>
    },
) {
    const user = await prisma.user.upsert({
        where: { email: input.email },
        update: { roles: input.roles },
        create: {
            email: input.email,
            phone: input.phone ?? null,
            passwordHash: SEED_PASSWORD_HASH,
            roles: input.roles,
            isEmailVerified: true,
            isPhoneVerified: Boolean(input.phone),
        },
    })

    await prisma.profile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            userId: user.id,
            firstName: input.firstName,
            lastName: input.lastName,
            displayName: `${input.firstName} ${input.lastName}`,
        },
    })

    return user
}

async function assignSystemRole(prisma: PrismaClient, userId: string, roleName: string) {
    const role = await prisma.systemRole.findUnique({ where: { name: roleName } })
    if (!role) return

    await prisma.userSystemRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        update: {},
        create: { userId, roleId: role.id },
    })
}

export async function seedUsers(prisma: PrismaClient): Promise<SeedUsers> {
    console.log('  - Seeding users (staff, seller, customer, shipper)...')

    let superAdminId = ''
    let adminId = ''
    let moderatorId = ''
    for (const staff of STAFF) {
        const user = await upsertUserWithProfile(prisma, { ...staff, roles: [toUserRole(staff.role)] })
        await assignSystemRole(prisma, user.id, staff.role)
        if (staff.role === 'SUPER_ADMIN') superAdminId = user.id
        if (staff.role === 'ADMIN') adminId = user.id
        if (staff.role === 'MODERATOR') moderatorId = user.id
    }

    const sellerUserIds: string[] = []
    for (const seller of SELLERS) {
        const user = await upsertUserWithProfile(prisma, { ...seller, roles: ['SELLER'] })
        await assignSystemRole(prisma, user.id, 'SELLER')
        sellerUserIds.push(user.id)
    }

    const brandUser = await upsertUserWithProfile(prisma, {
        email: 'brand.timmywear@timmyhub.dev',
        firstName: 'TimmyWear',
        lastName: 'Official',
        roles: ['BRAND'],
    })
    await assignSystemRole(prisma, brandUser.id, 'BRAND')

    const customerUserIds: string[] = []
    for (const customer of CUSTOMERS) {
        const user = await upsertUserWithProfile(prisma, { ...customer, roles: ['CUSTOMER'] })
        await assignSystemRole(prisma, user.id, 'CUSTOMER')
        customerUserIds.push(user.id)
    }

    const shipperUser = await upsertUserWithProfile(prisma, {
        email: 'shipper1@timmyhub.dev',
        firstName: 'Tùng',
        lastName: 'Đặng',
        roles: ['SHIPPER'],
    })
    await assignSystemRole(prisma, shipperUser.id, 'SHIPPER')

    return {
        superAdminId,
        adminId,
        moderatorId,
        sellerUserIds,
        brandUserId: brandUser.id,
        customerUserIds,
        shipperUserId: shipperUser.id,
    }
}
