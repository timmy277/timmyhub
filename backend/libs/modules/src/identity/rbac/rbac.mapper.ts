import type { PermissionSummary, RoleDetail, RoleSummary } from '@timmyhub/contracts'
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

// Chi tiết role = metadata của `RoleSummary` + tên permission đang gán. Tách khỏi `toRoleSummary` để danh sách role
// không phải trả kèm một mảng lớn cho mỗi dòng.
export function toRoleDetail(
    role: Pick<SystemRole, 'id' | 'name' | 'displayName' | 'description' | 'isSystem' | 'createdAt'>,
    permissionNames: string[],
): RoleDetail {
    return { ...toRoleSummary(role), permissionNames }
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
