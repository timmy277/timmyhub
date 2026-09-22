import type { SystemRoleName } from '@timmyhub/contracts'
import { PERMISSION_DEFINITIONS } from '@timmyhub/contracts'

import type { PrismaClient } from '../../src/generated/prisma/client'

const ROLE_METADATA: Record<SystemRoleName, { displayName: string; description: string; isSystem: boolean }> = {
    SUPER_ADMIN: {
        displayName: 'Quản trị viên tối cao',
        description: 'Bỏ qua toàn bộ kiểm tra role/permission (layer 1-3), chỉ layer xác thực vẫn áp dụng.',
        isSystem: true,
    },
    ADMIN: {
        displayName: 'Quản trị viên',
        description: 'Vận hành sàn: duyệt seller/sản phẩm, xử lý tranh chấp, rút tiền, kiểm duyệt nội dung.',
        isSystem: true,
    },
    MODERATOR: {
        displayName: 'Kiểm duyệt viên',
        description: 'Duyệt sản phẩm/bài đăng/quảng cáo, không đụng tới ví/rút tiền.',
        isSystem: true,
    },
    SELLER: {
        displayName: 'Người bán',
        description: 'Quản lý shop, sản phẩm, đơn hàng, ví của chính mình.',
        isSystem: true,
    },
    BRAND: {
        displayName: 'Thương hiệu',
        description: 'Đại diện thương hiệu, quản lý shop chính hãng.',
        isSystem: true,
    },
    CUSTOMER: {
        displayName: 'Khách hàng',
        description: 'Người mua hàng trên sàn.',
        isSystem: true,
    },
    SHIPPER: {
        displayName: 'Người giao hàng',
        description: 'Nhân viên giao vận, cập nhật trạng thái vận đơn được gán.',
        isSystem: true,
    },
}

// permissionNames của mỗi role được TÍNH từ PERMISSION_DEFINITIONS[].defaultRoles, không khai tay riêng ở đây —
// thêm permission mới vào catalog và gán defaultRoles là đủ, role.ts không cần sửa theo (tránh lệch, rbac-advanced.md §7).
// SUPER_ADMIN không cần liệt kê permission nào: guard bypass thẳng theo layer 1 (RolesGuard/PermissionsGuard).
function buildRolePermissionNames(): Record<SystemRoleName, string[]> {
    const map: Record<SystemRoleName, string[]> = {
        SUPER_ADMIN: [],
        ADMIN: [],
        MODERATOR: [],
        SELLER: [],
        BRAND: [],
        CUSTOMER: [],
        SHIPPER: [],
    }
    for (const permission of PERMISSION_DEFINITIONS) {
        for (const roleName of permission.defaultRoles) {
            map[roleName].push(permission.name)
        }
    }
    return map
}

export async function seedRoles(prisma: PrismaClient) {
    console.log('  - Seeding roles và gán quyền...')

    const rolePermissionNames = buildRolePermissionNames()

    for (const [roleName, metadata] of Object.entries(ROLE_METADATA) as [
        SystemRoleName,
        (typeof ROLE_METADATA)[SystemRoleName],
    ][]) {
        const systemRole = await prisma.systemRole.upsert({
            where: { name: roleName },
            update: { displayName: metadata.displayName, description: metadata.description },
            create: {
                name: roleName,
                displayName: metadata.displayName,
                description: metadata.description,
                isSystem: metadata.isSystem,
            },
        })

        for (const permissionName of rolePermissionNames[roleName]) {
            const permission = await prisma.permission.findUnique({ where: { name: permissionName } })
            if (!permission) {
                throw new Error(
                    `Seed role: permission "${permissionName}" không tồn tại trong bảng Permission — chạy seedPermissions trước seedRoles.`,
                )
            }

            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: systemRole.id, permissionId: permission.id } },
                update: {},
                create: { roleId: systemRole.id, permissionId: permission.id },
            })
        }
    }
}
