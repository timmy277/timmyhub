import type { PrismaClient } from '../../src/generated/prisma/client'

// name luôn theo format module:resource:action (CLAUDE.md §3 luật #6) — role/scope tra theo module+resource+action,
// không tra theo name (name chỉ để hiển thị/log).
const PERMISSIONS: Array<{
    name: string
    displayName: string
    module: string
    resource: string
    action: string
}> = [
    // RBAC — quản trị vai trò/quyền
    { name: 'rbac:role:read', displayName: 'Xem vai trò', module: 'RBAC', resource: 'role', action: 'read' },
    { name: 'rbac:role:create', displayName: 'Tạo vai trò', module: 'RBAC', resource: 'role', action: 'create' },
    { name: 'rbac:role:update', displayName: 'Sửa vai trò', module: 'RBAC', resource: 'role', action: 'update' },
    { name: 'rbac:role:delete', displayName: 'Xoá vai trò', module: 'RBAC', resource: 'role', action: 'delete' },
    {
        name: 'rbac:permission:read',
        displayName: 'Xem danh sách quyền',
        module: 'RBAC',
        resource: 'permission',
        action: 'read',
    },

    // IDENTITY — quản lý người dùng
    { name: 'identity:user:read', displayName: 'Xem người dùng', module: 'IDENTITY', resource: 'user', action: 'read' },
    {
        name: 'identity:user:update',
        displayName: 'Sửa người dùng',
        module: 'IDENTITY',
        resource: 'user',
        action: 'update',
    },
    { name: 'identity:user:ban', displayName: 'Khoá người dùng', module: 'IDENTITY', resource: 'user', action: 'ban' },

    // SELLER — duyệt hồ sơ/đơn đăng ký bán hàng
    {
        name: 'seller:application:read',
        displayName: 'Xem đơn đăng ký bán hàng',
        module: 'SELLER',
        resource: 'application',
        action: 'read',
    },
    {
        name: 'seller:application:approve',
        displayName: 'Duyệt đơn đăng ký bán hàng',
        module: 'SELLER',
        resource: 'application',
        action: 'approve',
    },
    {
        name: 'seller:profile:suspend',
        displayName: 'Đình chỉ shop',
        module: 'SELLER',
        resource: 'profile',
        action: 'suspend',
    },
    {
        name: 'seller:profile:update',
        displayName: 'Sửa hồ sơ shop',
        module: 'SELLER',
        resource: 'profile',
        action: 'update',
    },

    // CATALOG — danh mục, sản phẩm, tồn kho
    {
        name: 'catalog:category:create',
        displayName: 'Tạo danh mục',
        module: 'CATALOG',
        resource: 'category',
        action: 'create',
    },
    {
        name: 'catalog:category:update',
        displayName: 'Sửa danh mục',
        module: 'CATALOG',
        resource: 'category',
        action: 'update',
    },
    {
        name: 'catalog:category:delete',
        displayName: 'Xoá danh mục',
        module: 'CATALOG',
        resource: 'category',
        action: 'delete',
    },
    {
        name: 'catalog:product:create',
        displayName: 'Tạo sản phẩm',
        module: 'CATALOG',
        resource: 'product',
        action: 'create',
    },
    {
        name: 'catalog:product:update',
        displayName: 'Sửa sản phẩm',
        module: 'CATALOG',
        resource: 'product',
        action: 'update',
    },
    {
        name: 'catalog:product:approve',
        displayName: 'Duyệt sản phẩm',
        module: 'CATALOG',
        resource: 'product',
        action: 'approve',
    },
    {
        name: 'catalog:inventory:adjust',
        displayName: 'Điều chỉnh tồn kho',
        module: 'CATALOG',
        resource: 'inventory',
        action: 'adjust',
    },

    // ORDER — xử lý đơn hàng
    { name: 'order:order:read', displayName: 'Xem đơn hàng', module: 'ORDER', resource: 'order', action: 'read' },
    {
        name: 'order:order:process',
        displayName: 'Xử lý đơn hàng',
        module: 'ORDER',
        resource: 'order',
        action: 'process',
    },
    {
        name: 'order:dispute:resolve',
        displayName: 'Xử lý tranh chấp',
        module: 'ORDER',
        resource: 'dispute',
        action: 'resolve',
    },

    // PAYMENT — ví, rút tiền
    {
        name: 'payment:withdrawal:read',
        displayName: 'Xem yêu cầu rút tiền',
        module: 'PAYMENT',
        resource: 'withdrawal',
        action: 'read',
    },
    {
        name: 'payment:withdrawal:approve',
        displayName: 'Duyệt yêu cầu rút tiền',
        module: 'PAYMENT',
        resource: 'withdrawal',
        action: 'approve',
    },

    // PROMOTION — voucher, chiến dịch
    {
        name: 'promotion:campaign:create',
        displayName: 'Tạo chiến dịch',
        module: 'PROMOTION',
        resource: 'campaign',
        action: 'create',
    },
    {
        name: 'promotion:voucher:create',
        displayName: 'Tạo voucher',
        module: 'PROMOTION',
        resource: 'voucher',
        action: 'create',
    },

    // CONTENT — bài đăng, quảng cáo
    {
        name: 'content:post:moderate',
        displayName: 'Kiểm duyệt bài đăng',
        module: 'CONTENT',
        resource: 'post',
        action: 'moderate',
    },
    {
        name: 'content:ad:approve',
        displayName: 'Duyệt chiến dịch quảng cáo',
        module: 'CONTENT',
        resource: 'ad',
        action: 'approve',
    },

    // ADMIN — toàn quyền, chỉ gán cho SUPER_ADMIN
    {
        name: 'admin:system:all',
        displayName: 'Toàn quyền hệ thống',
        module: 'ADMIN',
        resource: 'system',
        action: 'all',
    },
]

export async function seedPermissions(prisma: PrismaClient) {
    console.log('  - Seeding permissions...')

    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission,
        })
    }

    return PERMISSIONS.map((p) => p.name)
}
