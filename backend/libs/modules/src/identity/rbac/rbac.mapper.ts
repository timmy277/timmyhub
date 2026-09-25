import type { PermissionSummary, RoleSummary } from '@timmyhub/contracts'
import type { Permission, SystemRole } from '@timmyhub/prisma'

// Bản ghi Prisma → DTO trả về API (rbac.schema.ts ở contracts). Chỉ lấy đúng field công khai, Date → ISO string.
export function toRoleSummary(
    role: Pick<SystemRole, 'id' | 'name' | 'displayName' | 'description' | 'isSystem' | 'createdAt'>,
): RoleSummary {
    return {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        createdAt: role.createdAt.toISOString(),
    }
}

export function toPermissionSummary(
    permission: Pick<Permission, 'id' | 'name' | 'displayName' | 'module' | 'resource' | 'action'>,
): PermissionSummary {
    return {
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
        module: permission.module,
        resource: permission.resource,
        action: permission.action,
    }
}
