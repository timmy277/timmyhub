import { PERMISSION_DEFINITIONS } from '@timmyhub/contracts'

import type { PrismaClient } from '../../src/generated/prisma/client'

// Nguồn permission DUY NHẤT là PERMISSION_DEFINITIONS (@timmyhub/contracts/permissions.catalog.ts), theo
// docs/00-overview/roles-and-permissions.md §4. Không tự liệt kê lại ở đây — tránh đúng lỗi "danh sách permission
// lệch giữa seed và code" mà hệ thống cũ từng gặp (rbac-advanced.md §7).
export async function seedPermissions(prisma: PrismaClient) {
    console.log(`  - Seeding ${PERMISSION_DEFINITIONS.length} permissions...`)

    for (const permission of PERMISSION_DEFINITIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {
                displayName: permission.displayName,
                module: permission.module,
                resource: permission.resource,
                action: permission.action,
            },
            create: {
                name: permission.name,
                displayName: permission.displayName,
                module: permission.module,
                resource: permission.resource,
                action: permission.action,
            },
        })
    }

    return PERMISSION_DEFINITIONS.map((p) => p.name)
}
