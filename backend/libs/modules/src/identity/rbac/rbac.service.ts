import { Injectable } from '@nestjs/common'
import type { PermissionSummary, RoleSummary } from '@timmyhub/contracts'
import { ApiError } from '@timmyhub/contracts'
import type { UserRole } from '@timmyhub/prisma'

import { PermissionCacheService } from './permission-cache.service'
import { RbacRepository } from './rbac.repository'

export type RbacActor = {
    id: string
    roles: UserRole[]
}

function toRoleSummary(role: {
    id: string
    name: string
    displayName: string
    description: string | null
    isSystem: boolean
    createdAt: Date
}): RoleSummary {
    return {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        createdAt: role.createdAt.toISOString(),
    }
}

function toPermissionSummary(permission: {
    id: string
    name: string
    displayName: string
    module: string
    resource: string
    action: string
}): PermissionSummary {
    return {
        id: permission.id,
        name: permission.name,
        displayName: permission.displayName,
        module: permission.module,
        resource: permission.resource,
        action: permission.action,
    }
}

// RBAC lớp 2 (permission động) + quản trị role/permission — docs/03-specs/rbac-permission/design.md.
// Layer 1 (UserRole thô) được RolesGuard đọc thẳng từ JWT, không qua service này.
@Injectable()
export class RbacService {
    constructor(
        private readonly repository: RbacRepository,
        private readonly cache: PermissionCacheService,
    ) {}

    // §6 design.md: một query duy nhất (role permissions ∪ grant − deny), cache-aside 15 phút.
    async getEffectivePermissions(userId: string): Promise<ReadonlySet<string>> {
        const cached = this.cache.get(userId)
        if (cached) return cached

        const user = await this.repository.findUserWithRbac(userId)
        if (!user) throw new ApiError('NOT_FOUND', 'Người dùng không tồn tại.')

        const effective = new Set<string>()
        for (const userRole of user.userRoles) {
            for (const rolePermission of userRole.role.permissions) {
                effective.add(rolePermission.permission.name)
            }
        }
        for (const userPermission of user.userPermissions) {
            if (userPermission.isGranted) {
                effective.add(userPermission.permission.name)
            } else {
                effective.delete(userPermission.permission.name)
            }
        }

        this.cache.set(userId, effective)
        return effective
    }

    async checkPermission(userId: string, permission: string): Promise<boolean> {
        const effective = await this.getEffectivePermissions(userId)
        return effective.has(permission)
    }

    async listRoles(): Promise<RoleSummary[]> {
        const roles = await this.repository.listRoles()
        return roles.map(toRoleSummary)
    }

    async createRole(input: {
        name: string
        displayName: string
        description?: string | undefined
    }): Promise<RoleSummary> {
        const existing = await this.repository.findRoleByName(input.name)
        if (existing) throw new ApiError('ROLE_ALREADY_EXISTS', `Vai trò "${input.name}" đã tồn tại.`)
        const role = await this.repository.createRole(input)
        return toRoleSummary(role)
    }

    async updateRole(
        roleId: string,
        input: { displayName?: string | undefined; description?: string | undefined },
    ): Promise<RoleSummary> {
        const role = await this.getRoleOrThrow(roleId)
        // SUPER_ADMIN bypass mọi kiểm tra layer 2-3, nên metadata của chính vai trò đó không được sửa qua API.
        if (role.name === 'SUPER_ADMIN') {
            throw new ApiError('ROLE_IS_SYSTEM', 'Không thể sửa vai trò SUPER_ADMIN.')
        }
        const updated = await this.repository.updateRole(roleId, input)
        return toRoleSummary(updated)
    }

    async deleteRole(roleId: string): Promise<void> {
        const role = await this.getRoleOrThrow(roleId)
        if (role.isSystem) throw new ApiError('ROLE_IS_SYSTEM', 'Không thể xoá vai trò hệ thống.')

        const userCount = await this.repository.countUsersWithRole(roleId)
        if (userCount > 0) {
            throw new ApiError('ROLE_IN_USE', 'Vai trò đang được gán cho người dùng, phải chuyển hết trước khi xoá.')
        }

        await this.repository.deleteRole(roleId)
    }

    async assignRolePermissions(roleId: string, permissionNames: string[]): Promise<RoleSummary> {
        const role = await this.getRoleOrThrow(roleId)
        if (role.name === 'SUPER_ADMIN') {
            throw new ApiError('ROLE_IS_SYSTEM', 'SUPER_ADMIN bỏ qua mọi kiểm tra quyền, không cấu hình được.')
        }

        const permissions = await this.repository.findPermissionsByNames(permissionNames)
        const foundNames = new Set(permissions.map((p) => p.name))
        const missing = permissionNames.filter((name) => !foundNames.has(name))
        if (missing.length > 0) {
            throw new ApiError('PERMISSION_NOT_FOUND', `Permission không tồn tại: ${missing.join(', ')}`)
        }

        const affectedUserIds = await this.repository.replaceRolePermissions(
            roleId,
            permissions.map((p) => p.id),
        )
        this.cache.invalidateUsers(affectedUserIds)

        return toRoleSummary(role)
    }

    async listPermissions(): Promise<PermissionSummary[]> {
        const permissions = await this.repository.listPermissions()
        return permissions.map(toPermissionSummary)
    }

    async createPermission(input: {
        name: string
        displayName: string
        module: string
        resource: string
        action: string
    }): Promise<PermissionSummary> {
        const existing = await this.repository.findPermissionByName(input.name)
        if (existing) throw new ApiError('PERMISSION_ALREADY_EXISTS', `Permission "${input.name}" đã tồn tại.`)
        const permission = await this.repository.createPermission(input)
        return toPermissionSummary(permission)
    }

    async deletePermission(permissionId: string): Promise<void> {
        const permission = await this.repository.listPermissions()
        const found = permission.find((p) => p.id === permissionId)
        if (!found) throw new ApiError('PERMISSION_NOT_FOUND', 'Permission không tồn tại.')
        await this.repository.deletePermission(permissionId)
        this.cache.invalidateAll()
    }

    // Ngăn leo thang đặc quyền: chỉ SUPER_ADMIN mới gán được vai trò SUPER_ADMIN cho người khác.
    async assignRoleToUser(targetUserId: string, roleName: string, actor: RbacActor): Promise<void> {
        const role = await this.repository.findRoleByName(roleName)
        if (!role) throw new ApiError('ROLE_NOT_FOUND', `Vai trò "${roleName}" không tồn tại.`)

        if (role.name === 'SUPER_ADMIN' && !actor.roles.includes('SUPER_ADMIN')) {
            throw new ApiError('CANNOT_ESCALATE_PRIVILEGE', 'Chỉ SUPER_ADMIN mới được gán vai trò SUPER_ADMIN.')
        }

        await this.repository.assignUserRole(targetUserId, role.id, role.name, actor.id)
        this.cache.invalidateUser(targetUserId)
    }

    async revokeRoleFromUser(targetUserId: string, roleName: string, actor: RbacActor): Promise<void> {
        const role = await this.repository.findRoleByName(roleName)
        if (!role) throw new ApiError('ROLE_NOT_FOUND', `Vai trò "${roleName}" không tồn tại.`)

        await this.repository.revokeUserRole(targetUserId, role.id, role.name, actor.id)
        this.cache.invalidateUser(targetUserId)
    }

    // Ngăn leo thang đặc quyền: người cấp không bao giờ được cấp quyền mà chính họ không có (rbac-advanced.md §4).
    async grantUserPermission(
        targetUserId: string,
        permissionName: string,
        isGranted: boolean,
        actor: RbacActor,
    ): Promise<void> {
        const permission = await this.repository.findPermissionByName(permissionName)
        if (!permission) throw new ApiError('PERMISSION_NOT_FOUND', `Permission "${permissionName}" không tồn tại.`)

        if (isGranted && !actor.roles.includes('SUPER_ADMIN')) {
            const actorPermissions = await this.getEffectivePermissions(actor.id)
            if (!actorPermissions.has(permissionName)) {
                throw new ApiError('CANNOT_ESCALATE_PRIVILEGE', 'Không thể cấp quyền mà bạn không có.')
            }
        }

        await this.repository.upsertUserPermission(targetUserId, permission.id, isGranted, actor.id)
        this.cache.invalidateUser(targetUserId)
    }

    private async getRoleOrThrow(roleId: string) {
        const role = await this.repository.findRoleById(roleId)
        if (!role) throw new ApiError('ROLE_NOT_FOUND', 'Vai trò không tồn tại.')
        return role
    }
}
