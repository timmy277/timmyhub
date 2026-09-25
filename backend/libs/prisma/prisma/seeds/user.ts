import * as bcrypt from 'bcryptjs'

import { BCRYPT_COST, UserRole } from '@timmyhub/contracts'

import type { PrismaClient } from '../../src/generated/prisma/client'

// Phải khớp thuật toán + cost hash của AuthService (bcrypt, BCRYPT_COST dùng chung từ contracts), nếu không
// user seed sẽ không đăng nhập được. Mật khẩu seed chung cho mọi tài khoản mẫu: Seed@12345
const SEED_PASSWORD_HASH = bcrypt.hashSync('Seed@12345', BCRYPT_COST)

type StaffRole = typeof UserRole.SUPER_ADMIN | typeof UserRole.ADMIN | typeof UserRole.MODERATOR

export type SeedUsers = {
    superAdminId: string
    adminId: string
    moderatorId: string
    sellerUserIds: string[]
    brandUserId: string
    buyerUserIds: string[]
    shipperUserId: string
}

const STAFF: Array<{
    email: string
    role: StaffRole
    firstName: string
    lastName: string
}> = [
    { email: 'superadmin@timmyhub.dev', role: UserRole.SUPER_ADMIN, firstName: 'Super', lastName: 'Admin' },
    { email: 'admin@timmyhub.dev', role: UserRole.ADMIN, firstName: 'Minh', lastName: 'Trần' },
    { email: 'moderator@timmyhub.dev', role: UserRole.MODERATOR, firstName: 'Lan', lastName: 'Phạm' },
]

const SELLERS: Array<{ email: string; firstName: string; lastName: string }> = [
    { email: 'seller.thoitrang@timmyhub.dev', firstName: 'Hùng', lastName: 'Nguyễn' },
    { email: 'seller.dientu@timmyhub.dev', firstName: 'Quân', lastName: 'Lê' },
    { email: 'seller.giadung@timmyhub.dev', firstName: 'Thảo', lastName: 'Vũ' },
]

// Người mua (role USER). Email giữ tiền tố "customer" vì là dữ liệu mẫu đã quen dùng khi đăng nhập thử.
const BUYERS: Array<{ email: string; phone: string; firstName: string; lastName: string }> = [
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
        roles: UserRole[]
    },
) {
    const user = await prisma.user.upsert({
        where: { email: input.email },
        update: { roles: input.roles, passwordHash: SEED_PASSWORD_HASH },
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

async function assignSystemRole(prisma: PrismaClient, userId: string, roleName: UserRole) {
    const role = await prisma.systemRole.findUnique({ where: { name: roleName } })
    if (!role) return

    await prisma.userSystemRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        update: {},
        create: { userId, roleId: role.id },
    })
}

export async function seedUsers(prisma: PrismaClient): Promise<SeedUsers> {
    console.log('  - Seeding users (staff, seller, buyer, shipper)...')

    let superAdminId = ''
    let adminId = ''
    let moderatorId = ''
    for (const staff of STAFF) {
        const user = await upsertUserWithProfile(prisma, { ...staff, roles: [staff.role] })
        await assignSystemRole(prisma, user.id, staff.role)
        if (staff.role === UserRole.SUPER_ADMIN) superAdminId = user.id
        if (staff.role === UserRole.ADMIN) adminId = user.id
        if (staff.role === UserRole.MODERATOR) moderatorId = user.id
    }

    const sellerUserIds: string[] = []
    for (const seller of SELLERS) {
        const user = await upsertUserWithProfile(prisma, { ...seller, roles: [UserRole.SELLER] })
        await assignSystemRole(prisma, user.id, UserRole.SELLER)
        sellerUserIds.push(user.id)
    }

    const brandUser = await upsertUserWithProfile(prisma, {
        email: 'brand.timmywear@timmyhub.dev',
        firstName: 'TimmyWear',
        lastName: 'Official',
        roles: [UserRole.BRAND],
    })
    await assignSystemRole(prisma, brandUser.id, UserRole.BRAND)

    const buyerUserIds: string[] = []
    for (const buyer of BUYERS) {
        const user = await upsertUserWithProfile(prisma, { ...buyer, roles: [UserRole.USER] })
        await assignSystemRole(prisma, user.id, UserRole.USER)
        buyerUserIds.push(user.id)
    }

    const shipperUser = await upsertUserWithProfile(prisma, {
        email: 'shipper1@timmyhub.dev',
        firstName: 'Tùng',
        lastName: 'Đặng',
        roles: [UserRole.SHIPPER],
    })
    await assignSystemRole(prisma, shipperUser.id, UserRole.SHIPPER)

    return {
        superAdminId,
        adminId,
        moderatorId,
        sellerUserIds,
        brandUserId: brandUser.id,
        buyerUserIds,
        shipperUserId: shipperUser.id,
    }
}
