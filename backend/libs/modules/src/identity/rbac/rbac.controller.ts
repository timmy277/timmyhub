import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    AssignRolePermissionsInput,
    AssignUserRoleInput,
    CreatePermissionInput,
    CreateRoleInput,
    EffectivePermissions,
    GrantUserPermissionInput,
    PermissionSummary,
    RoleDetail,
    UpdateRoleInput,
} from '@timmyhub/contracts'
import {
    AssignRolePermissionsSchema,
    AssignUserRoleSchema,
    CreatePermissionSchema,
    CreateRoleSchema,
    GrantUserPermissionSchema,
    UpdateRoleSchema,
} from '@timmyhub/contracts'
import { AuthenticatedOnly, CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { RBAC_ROUTE, RBAC_ROUTE_PARAM } from '../identity.constants'
import { RbacService } from './rbac.service'

// docs/03-specs/rbac-permission/design.md §3 — endpoint quản trị role/permission (layer 2, `identity` module).
// Controller chỉ nhận/validate input và chuyển cho RbacService — mọi quyết định phân quyền nằm ở service.
@Controller(RBAC_ROUTE.ROOT)
export class RbacController {
    // ===== Dependencies =====
    constructor(private readonly rbacService: RbacService) {}

    // ===== Queries =====
    @Permissions('rbac:roles:list')
    @Get(RBAC_ROUTE.ROLES)
    listRoles() {
        return this.rbacService.listRoles()
    }

    // Chi tiết role kèm tập quyền đang gán — màn chi tiết/sửa role cần để hiện và gán lại quyền. `rbac:roles:read`
    // (đã có trong catalog) tách khỏi `rbac:roles:list`: xem danh sách không đương nhiên được xem chi tiết.
    @Permissions('rbac:roles:read')
    @Get(RBAC_ROUTE.ROLE)
    getRole(@Param(RBAC_ROUTE_PARAM.ROLE_ID) roleId: string): Promise<RoleDetail> {
        return this.rbacService.getRoleDetail(roleId)
    }

    @Permissions('rbac:permissions:list')
    @Get(RBAC_ROUTE.PERMISSIONS)
    listPermissions() {
        return this.rbacService.listPermissions()
    }

    // Chi tiết permission. `rbac:permissions:read` tách khỏi `rbac:permissions:list`: xem danh sách không đương nhiên
    // được xem chi tiết (đối xứng với role).
    @Permissions('rbac:permissions:read')
    @Get(RBAC_ROUTE.PERMISSION)
    getPermission(@Param(RBAC_ROUTE_PARAM.PERMISSION_ID) permissionId: string): Promise<PermissionSummary> {
        return this.rbacService.getPermissionDetail(permissionId)
    }

    // `@AuthenticatedOnly()` chứ không `@Permissions(...)`: xem quyền của chính mình luôn được phép, phạm vi own|any
    // do RbacService quyết định (404 khi ngoài phạm vi, không 403). Nhãn này bắt buộc phải có — thiếu nó thì
    // PermissionsGuard từ chối và RbacConsistencyChecker chặn khởi động (không còn nhánh fail-open).
    @AuthenticatedOnly()
    @Get(RBAC_ROUTE.USER_EFFECTIVE_PERMISSIONS)
    getEffectivePermissions(
        @Param(RBAC_ROUTE_PARAM.USER_ID) userId: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<EffectivePermissions> {
        return this.rbacService.getEffectivePermissionsForActor(userId, actor)
    }

    // ===== Commands =====
    @Permissions('rbac:roles:create')
    @Post(RBAC_ROUTE.ROLES)
    createRole(@Body(new ZodValidationPipe(CreateRoleSchema)) body: CreateRoleInput, @CurrentUser() actor: AuthUser) {
        return this.rbacService.createRole(body, actor)
    }

    @Permissions('rbac:roles:update')
    @Put(RBAC_ROUTE.ROLE)
    updateRole(
        @Param(RBAC_ROUTE_PARAM.ROLE_ID) roleId: string,
        @Body(new ZodValidationPipe(UpdateRoleSchema)) body: UpdateRoleInput,
        @CurrentUser() actor: AuthUser,
    ) {
        return this.rbacService.updateRole(roleId, body, actor)
    }

    @Permissions('rbac:roles:delete')
    @Delete(RBAC_ROUTE.ROLE)
    deleteRole(@Param(RBAC_ROUTE_PARAM.ROLE_ID) roleId: string, @CurrentUser() actor: AuthUser) {
        return this.rbacService.deleteRole(roleId, actor)
    }

    @Permissions('rbac:role-permissions:assign')
    @Put(RBAC_ROUTE.ROLE_PERMISSIONS)
    assignRolePermissions(
        @Param(RBAC_ROUTE_PARAM.ROLE_ID) roleId: string,
        @Body(new ZodValidationPipe(AssignRolePermissionsSchema)) body: AssignRolePermissionsInput,
        @CurrentUser() actor: AuthUser,
    ) {
        return this.rbacService.assignRolePermissions(roleId, body.permissionNames, actor)
    }

    @Permissions('rbac:permissions:create')
    @Post(RBAC_ROUTE.PERMISSIONS)
    createPermission(
        @Body(new ZodValidationPipe(CreatePermissionSchema)) body: CreatePermissionInput,
        @CurrentUser() actor: AuthUser,
    ) {
        return this.rbacService.createPermission(body, actor)
    }

    @Permissions('rbac:permissions:delete')
    @Delete(RBAC_ROUTE.PERMISSION)
    deletePermission(@Param(RBAC_ROUTE_PARAM.PERMISSION_ID) permissionId: string, @CurrentUser() actor: AuthUser) {
        return this.rbacService.deletePermission(permissionId, actor)
    }

    @Permissions('identity:users:assign-role')
    @Post(RBAC_ROUTE.USER_ROLES)
    async assignRole(
        @Param(RBAC_ROUTE_PARAM.USER_ID) userId: string,
        @Body(new ZodValidationPipe(AssignUserRoleSchema)) body: AssignUserRoleInput,
        @CurrentUser() actor: AuthUser,
    ) {
        await this.rbacService.assignRoleToUser(userId, body.roleName, actor)
    }

    @Permissions('identity:users:assign-role')
    @Delete(RBAC_ROUTE.USER_ROLE)
    async revokeRole(
        @Param(RBAC_ROUTE_PARAM.USER_ID) userId: string,
        @Param(RBAC_ROUTE_PARAM.ROLE_NAME) roleName: string,
        @CurrentUser() actor: AuthUser,
    ) {
        await this.rbacService.revokeRoleFromUser(userId, roleName, actor)
    }

    @Permissions('rbac:user-permissions:assign')
    @Put(RBAC_ROUTE.USER_PERMISSIONS)
    async grantPermission(
        @Param(RBAC_ROUTE_PARAM.USER_ID) userId: string,
        @Body(new ZodValidationPipe(GrantUserPermissionSchema)) body: GrantUserPermissionInput,
        @CurrentUser() actor: AuthUser,
    ) {
        await this.rbacService.grantUserPermission(userId, body.permissionName, body.isGranted, actor)
    }
}
