import { Injectable } from '@nestjs/common'

import type { CreatePermissionInput, EffectivePermissions, PermissionSummary, RoleSummary } from '@timmyhub/contracts'
import { ApiError, apiMessageKey, isSuperAdmin, UserRole } from '@timmyhub/contracts'
import type { PermissionResolver } from '@timmyhub/modules/platform/auth'
import type { SystemRole } from '@timmyhub/prisma'

import { PERMISSION_NAME_SEPARATOR, READ_OTHER_USERS_PERMISSION } from '../identity.constants'
import { PermissionCacheService } from './permission-cache.service'
import { toPermissionSummary, toRoleSummary } from './rbac.mapper'
import { RbacRepository } from './rbac.repository'

export type RbacActor = {
    id: string
    roles: readonly UserRole[]
}

type PermissionNameParts = { module: string; resource: string; action: string }

// RBAC lớp 2 (permission động) + quản trị role/permission — docs/03-specs/rbac-permission/design.md.
// Layer 1 (UserRole thô) được RolesGuard đọc thẳng từ JWT, không qua service này.
// Hiện thực PermissionResolver của platform/auth — guard hỏi quyền qua token PERMISSION_RESOLVER, không import class này.
@Injectable()
export class RbacService implements PermissionResolver {
    // ===== Dependencies =====
    constructor(
        private readonly repository: RbacRepository,
        private readonly cache: PermissionCacheService,
    ) {}

    // ===== Queries =====

    // §6 design.md: một query duy nhất (role permissions ∪ grant − deny), cache-aside 15 phút.
    async getEffectivePermissions(userId: string): Promise<ReadonlySet<string>> {
        const cached = this.cache.get(userId)
        if (cached) return cached

        const user = await this.repository.findUserWithRbac(userId)
        if (!user) throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('identity.userNotFound') })

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

    // Phạm vi own|any (luật cứng #6-8 CLAUDE.md): xem của chính mình luôn được phép; xem của người khác đòi
    // identity:users:read. Không đủ quyền thì trả 404 như thể user không tồn tại — 403 sẽ rò rỉ sự tồn tại.
    async getEffectivePermissionsForActor(targetUserId: string, actor: RbacActor): Promise<EffectivePermissions> {
        if (targetUserId !== actor.id && !(await this.canReadOtherUsers(actor))) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('identity.userNotFound') })
        }

        const permissions = await this.getEffectivePermissions(targetUserId)
        return { userId: targetUserId, permissions: [...permissions] }
    }

    async checkPermission(userId: string, permission: string): Promise<boolean> {
        const effective = await this.getEffectivePermissions(userId)
        return effective.has(permission)
    }

    async listRoles(): Promise<RoleSummary[]> {
        const roles = await this.repository.listRoles()
        return roles.map(toRoleSummary)
    }

    async listPermissions(): Promise<PermissionSummary[]> {
        const permissions = await this.repository.listPermissions()
        return permissions.map(toPermissionSummary)
    }

    // ===== Commands =====
    async createRole(input: {
        name: string
        displayName: string
        description?: string | undefined
    }): Promise<RoleSummary> {
        const existing = await this.repository.findRoleByName(input.name)
        if (existing)
            throw new ApiError('ROLE_ALREADY_EXISTS', {
                messageKey: apiMessageKey('rbac.roleAlreadyExists'),
                messageParams: { roleName: input.name },
            })
        const role = await this.repository.createRole(input)
        return toRoleSummary(role)
    }

    async updateRole(
        roleId: string,
        input: { displayName?: string | undefined; description?: string | undefined },
    ): Promise<RoleSummary> {
        const role = await this.getRoleOrThrow(roleId)
        // SUPER_ADMIN bypass mọi kiểm tra layer 2-3, nên metadata của chính vai trò đó không được sửa qua API.
        if (role.name === UserRole.SUPER_ADMIN) {
            throw new ApiError('ROLE_IS_SYSTEM', { messageKey: apiMessageKey('rbac.superAdminNotEditable') })
        }
        const updated = await this.repository.updateRole(roleId, input)
        return toRoleSummary(updated)
    }

    async deleteRole(roleId: string): Promise<void> {
        const role = await this.getRoleOrThrow(roleId)
        if (role.isSystem)
            throw new ApiError('ROLE_IS_SYSTEM', { messageKey: apiMessageKey('rbac.systemRoleNotDeletable') })

        const userCount = await this.repository.countUsersWithRole(roleId)
        if (userCount > 0) {
            throw new ApiError('ROLE_IN_USE')
        }

        await this.repository.deleteRole(roleId)
    }

    async assignRolePermissions(roleId: string, permissionNames: string[]): Promise<RoleSummary> {
        const role = await this.getRoleOrThrow(roleId)
        if (role.name === UserRole.SUPER_ADMIN) {
            throw new ApiError('ROLE_IS_SYSTEM', { messageKey: apiMessageKey('rbac.superAdminNotConfigurable') })
        }

        const permissions = await this.repository.findPermissionsByNames(permissionNames)
        const foundNames = new Set(permissions.map((p) => p.name))
        const missing = permissionNames.filter((name) => !foundNames.has(name))
        if (missing.length > 0) {
            throw new ApiError('PERMISSION_NOT_FOUND', {
                messageKey: apiMessageKey('rbac.permissionsNotFound'),
                messageParams: { names: missing.join(', ') },
            })
        }

        const affectedUserIds = await this.repository.replaceRolePermissions(
            roleId,
            permissions.map((p) => p.id),
        )
        this.cache.invalidateUsers(affectedUserIds)

        return toRoleSummary(role)
    }

    async createPermission(input: CreatePermissionInput): Promise<PermissionSummary> {
        const existing = await this.repository.findPermissionByName(input.name)
        if (existing) {
            throw new ApiError('PERMISSION_ALREADY_EXISTS', {
                messageKey: apiMessageKey('rbac.permissionAlreadyExists'),
                messageParams: { permissionName: input.name },
            })
        }
        const permission = await this.repository.createPermission({
            name: input.name,
            displayName: input.displayName,
            ...this.parsePermissionName(input.name),
        })
        return toPermissionSummary(permission)
    }

    async deletePermission(permissionId: string): Promise<void> {
        const permission = await this.repository.findPermissionById(permissionId)
        if (!permission) throw new ApiError('PERMISSION_NOT_FOUND')
        await this.repository.deletePermission(permissionId)
        this.cache.invalidateAll()
    }

    // Ngăn leo thang đặc quyền: chỉ SUPER_ADMIN mới gán được vai trò SUPER_ADMIN cho người khác.
    async assignRoleToUser(targetUserId: string, roleName: string, actor: RbacActor): Promise<void> {
        const role = await this.getRoleByNameOrThrow(roleName)

        if (role.name === UserRole.SUPER_ADMIN && !isSuperAdmin(actor.roles)) {
            throw new ApiError('CANNOT_ESCALATE_PRIVILEGE', { messageKey: apiMessageKey('rbac.cannotGrantSuperAdmin') })
        }

        await this.repository.assignUserRole(targetUserId, role.id, role.name, actor.id)
        this.cache.invalidateUser(targetUserId)
    }

    async revokeRoleFromUser(targetUserId: string, roleName: string, actor: RbacActor): Promise<void> {
        const role = await this.getRoleByNameOrThrow(roleName)

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
        if (!permission) {
            throw new ApiError('PERMISSION_NOT_FOUND', {
                messageKey: apiMessageKey('rbac.permissionNotFoundByName'),
                messageParams: { permissionName },
            })
        }

        if (isGranted && !isSuperAdmin(actor.roles)) {
            const actorPermissions = await this.getEffectivePermissions(actor.id)
            if (!actorPermissions.has(permissionName)) {
                throw new ApiError('CANNOT_ESCALATE_PRIVILEGE', {
                    messageKey: apiMessageKey('rbac.cannotGrantUnownedPermission'),
                })
            }
        }

        await this.repository.upsertUserPermission(targetUserId, permission.id, isGranted, actor.id)
        this.cache.invalidateUser(targetUserId)
    }

    // ===== Private helpers =====
    private async getRoleOrThrow(roleId: string): Promise<SystemRole> {
        const role = await this.repository.findRoleById(roleId)
        if (!role) throw new ApiError('ROLE_NOT_FOUND')
        return role
    }

    private async getRoleByNameOrThrow(roleName: string): Promise<SystemRole> {
        const role = await this.repository.findRoleByName(roleName)
        if (!role)
            throw new ApiError('ROLE_NOT_FOUND', {
                messageKey: apiMessageKey('rbac.roleNotFoundByName'),
                messageParams: { roleName },
            })
        return role
    }

    private async canReadOtherUsers(actor: RbacActor): Promise<boolean> {
        if (isSuperAdmin(actor.roles)) return true
        const actorPermissions = await this.getEffectivePermissions(actor.id)
        return actorPermissions.has(READ_OTHER_USERS_PERMISSION)
    }

    // `module:resource:action[:scope]` — CreatePermissionSchema đã kiểm định dạng bằng regex nên luôn có ít nhất 3
    // phần. action lấy TOÀN BỘ phần sau dấu ':' thứ hai (vd. `identity:devices:list:any` → action `list:any`), khớp
    // cách seed ghi cột action; split rồi lấy phần tử thứ 3 sẽ làm mất hậu tố phạm vi.
    private parsePermissionName(name: string): PermissionNameParts {
        const [module = '', resource = '', ...actionParts] = name.split(PERMISSION_NAME_SEPARATOR)
        return { module, resource, action: actionParts.join(PERMISSION_NAME_SEPARATOR) }
    }
}
