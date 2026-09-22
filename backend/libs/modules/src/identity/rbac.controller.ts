import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import type {
    AssignRolePermissionsInput,
    AssignUserRoleInput,
    CreatePermissionInput,
    CreateRoleInput,
    EffectivePermissions,
    GrantUserPermissionInput,
    UpdateRoleInput,
} from '@timmyhub/contracts'
import {
    ApiError,
    AssignRolePermissionsSchema,
    AssignUserRoleSchema,
    CreatePermissionSchema,
    CreateRoleSchema,
    GrantUserPermissionSchema,
    UpdateRoleSchema,
} from '@timmyhub/contracts'
import { ZodValidationPipe } from '@timmyhub/common'

import { CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { RbacService } from './rbac/rbac.service'

// docs/03-specs/rbac-permission/design.md §3 — endpoint quản trị role/permission (layer 2, `identity` module).
@Controller('v1/rbac')
export class RbacController {
    constructor(private readonly rbacService: RbacService) {}

    @Permissions('rbac:roles:list')
    @Get('roles')
    listRoles() {
        return this.rbacService.listRoles()
    }

    @Permissions('rbac:roles:create')
    @Post('roles')
    createRole(@Body(new ZodValidationPipe(CreateRoleSchema)) body: CreateRoleInput) {
        return this.rbacService.createRole(body)
    }

    @Permissions('rbac:roles:update')
    @Put('roles/:roleId')
    updateRole(@Param('roleId') roleId: string, @Body(new ZodValidationPipe(UpdateRoleSchema)) body: UpdateRoleInput) {
        return this.rbacService.updateRole(roleId, body)
    }

    @Permissions('rbac:roles:delete')
    @Delete('roles/:roleId')
    deleteRole(@Param('roleId') roleId: string) {
        return this.rbacService.deleteRole(roleId)
    }

    @Permissions('rbac:role-permissions:assign')
    @Put('roles/:roleId/permissions')
    assignRolePermissions(
        @Param('roleId') roleId: string,
        @Body(new ZodValidationPipe(AssignRolePermissionsSchema)) body: AssignRolePermissionsInput,
    ) {
        return this.rbacService.assignRolePermissions(roleId, body.permissionNames)
    }

    @Permissions('rbac:permissions:list')
    @Get('permissions')
    listPermissions() {
        return this.rbacService.listPermissions()
    }

    @Permissions('rbac:permissions:create')
    @Post('permissions')
    createPermission(@Body(new ZodValidationPipe(CreatePermissionSchema)) body: CreatePermissionInput) {
        // CreatePermissionSchema đã bắt buộc định dạng module:resource:action[:any] bằng regex, nên 3 phần đầu luôn có.
        const parts = body.name.split(':')
        const [module, resource, action] = parts as [string, string, string, ...string[]]
        return this.rbacService.createPermission({ ...body, module, resource, action })
    }

    @Permissions('rbac:permissions:delete')
    @Delete('permissions/:permissionId')
    deletePermission(@Param('permissionId') permissionId: string) {
        return this.rbacService.deletePermission(permissionId)
    }

    @Permissions('identity:users:assign-role')
    @Post('users/:userId/roles')
    async assignRole(
        @Param('userId') userId: string,
        @Body(new ZodValidationPipe(AssignUserRoleSchema)) body: AssignUserRoleInput,
        @CurrentUser() actor: AuthUser,
    ) {
        await this.rbacService.assignRoleToUser(userId, body.roleName, actor)
    }

    @Permissions('identity:users:assign-role')
    @Delete('users/:userId/roles/:roleName')
    async revokeRole(
        @Param('userId') userId: string,
        @Param('roleName') roleName: string,
        @CurrentUser() actor: AuthUser,
    ) {
        await this.rbacService.revokeRoleFromUser(userId, roleName, actor)
    }

    @Permissions('rbac:user-permissions:assign')
    @Put('users/:userId/permissions')
    async grantPermission(
        @Param('userId') userId: string,
        @Body(new ZodValidationPipe(GrantUserPermissionSchema)) body: GrantUserPermissionInput,
        @CurrentUser() actor: AuthUser,
    ) {
        await this.rbacService.grantUserPermission(userId, body.permissionName, body.isGranted, actor)
    }

    // Phạm vi own|any (luật cứng #6-8 CLAUDE.md): xem của chính mình luôn được phép; xem của người khác đòi
    // identity:users:read, và nếu không đủ quyền thì trả 404 — không tiết lộ endpoint tồn tại (không phải 403).
    @Get('users/:userId/effective-permissions')
    async getEffectivePermissions(
        @Param('userId') userId: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<EffectivePermissions> {
        if (userId !== actor.id) {
            const canReadOthers = actor.roles.includes('SUPER_ADMIN')
                ? true
                : (await this.rbacService.getEffectivePermissions(actor.id)).has('identity:users:read')
            if (!canReadOthers) throw new ApiError('NOT_FOUND', 'Người dùng không tồn tại.')
        }

        const permissions = await this.rbacService.getEffectivePermissions(userId)
        return { userId, permissions: [...permissions] }
    }
}
