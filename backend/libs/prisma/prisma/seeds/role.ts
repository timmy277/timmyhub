import type { PrismaClient } from '../../src/generated/prisma/client'

const ROLES: Array<{
    name: string
    displayName: string
    description: string
    isSystem: boolean
    // để rỗng = không gán quyền động nào (role dùng thuần layer 1 — User.roles enum)
    permissionNames: string[]
}> = [
    {
        name: 'SUPER_ADMIN',
        displayName: 'Quản trị viên tối cao',
        description: 'Toàn quyền truy cập hệ thống',
        isSystem: true,
        permissionNames: ['admin:system:all'],
    },
    {
        name: 'ADMIN',
        displayName: 'Quản trị viên',
        description: 'Vận hành sàn: duyệt seller, sản phẩm, xử lý tranh chấp, rút tiền',
        isSystem: true,
        permissionNames: [
            'identity:user:read',
            'identity:user:update',
            'identity:user:ban',
            'seller:application:read',
            'seller:application:approve',
            'seller:profile:suspend',
            'catalog:category:create',
            'catalog:category:update',
            'catalog:category:delete',
            'catalog:product:approve',
            'order:order:read',
            'order:order:process',
            'order:dispute:resolve',
            'payment:withdrawal:read',
            'payment:withdrawal:approve',
            'content:post:moderate',
            'content:ad:approve',
        ],
    },
    {
        name: 'MODERATOR',
        displayName: 'Kiểm duyệt viên',
        description: 'Duyệt sản phẩm/bài đăng, không đụng tới ví/rút tiền',
        isSystem: true,
        permissionNames: [
            'catalog:product:approve',
            'content:post:moderate',
            'content:ad:approve',
            'seller:application:read',
        ],
    },
    {
        name: 'SELLER',
        displayName: 'Người bán',
        description: 'Quản lý shop, sản phẩm, đơn hàng của chính mình',
        isSystem: true,
        permissionNames: [
            'catalog:product:create',
            'catalog:product:update',
            'catalog:inventory:adjust',
            'seller:profile:update',
            'promotion:voucher:create',
        ],
    },
    {
        name: 'BRAND',
        displayName: 'Thương hiệu',
        description: 'Đại diện thương hiệu, quản lý shop chính hãng',
        isSystem: true,
        permissionNames: ['catalog:product:create', 'catalog:product:update', 'promotion:campaign:create'],
    },
    {
        name: 'CUSTOMER',
        displayName: 'Khách hàng',
        description: 'Người mua hàng trên sàn',
        isSystem: true,
        permissionNames: [],
    },
    {
        name: 'SHIPPER',
        displayName: 'Người giao hàng',
        description: 'Nhân viên giao vận, cập nhật trạng thái vận đơn',
        isSystem: true,
        permissionNames: ['order:order:read', 'order:order:process'],
    },
]

export async function seedRoles(prisma: PrismaClient) {
    console.log('  - Seeding roles và gán quyền...')

    for (const role of ROLES) {
        const systemRole = await prisma.systemRole.upsert({
            where: { name: role.name },
            update: { displayName: role.displayName, description: role.description },
            create: {
                name: role.name,
                displayName: role.displayName,
                description: role.description,
                isSystem: role.isSystem,
            },
        })

        for (const permissionName of role.permissionNames) {
            const permission = await prisma.permission.findUnique({ where: { name: permissionName } })
            if (!permission) continue

            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: systemRole.id, permissionId: permission.id } },
                update: {},
                create: { roleId: systemRole.id, permissionId: permission.id },
            })
        }
    }
}
