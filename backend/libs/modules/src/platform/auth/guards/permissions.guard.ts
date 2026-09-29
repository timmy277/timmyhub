import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import type { PermissionName } from '@timmyhub/contracts'
import { ApiError, apiMessageKey, isSuperAdmin } from '@timmyhub/contracts'

import { PERMISSION_RESOLVER } from '../auth.constants'
import { AUTHENTICATED_ONLY_KEY, IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../decorators/index'
import type { PermissionResolver } from '../interfaces/index'

// Layer 2 — permission động, hỏi qua PermissionResolver (hiện thực: RbacService của identity, cache-aside trong
// process). SUPER_ADMIN bypass (rbac-advanced.md §8) nhưng vẫn phải qua layer 0-1 trước đó.
//
// Endpoint không khai `@Permissions()` là **fail-closed**: chỉ hợp lệ khi đã đánh dấu `@Public()` (không cần phiên)
// hoặc `@AuthenticatedOnly()` (cần phiên, không đòi permission). Còn lại là cấu hình thiếu → từ chối, không cho qua.
// RbacConsistencyChecker đã chặn từ lúc khởi động nên nhánh này chỉ là lưới an toàn thứ hai.
@Injectable()
export class PermissionsGuard implements CanActivate {
    // ===== Dependencies =====
    private readonly logger = new Logger(PermissionsGuard.name)

    constructor(
        private readonly reflector: Reflector,
        @Inject(PERMISSION_RESOLVER) private readonly permissionResolver: PermissionResolver,
    ) {}

    // ===== Queries =====
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const targets = [context.getHandler(), context.getClass()]

        const required = this.reflector.getAllAndOverride<PermissionName[]>(PERMISSIONS_KEY, targets)
        if (!required || required.length === 0) {
            const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)
            if (isPublic) return true

            const isAuthenticatedOnly = this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_ONLY_KEY, targets)
            if (isAuthenticatedOnly) return true

            const handler = `${context.getClass().name}.${context.getHandler().name}`
            this.logger.error(
                `RBAC: handler ${handler} không khai @Permissions/@AuthenticatedOnly/@Public — từ chối theo mặc định.`,
            )
            throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('auth.forbiddenPermission') })
        }

        const { user } = context.switchToHttp().getRequest<Request>()
        if (!user) throw new ApiError('UNAUTHORIZED')
        if (isSuperAdmin(user.roles)) return true

        const effective = await this.permissionResolver.getEffectivePermissions(user.id)
        const allowed = required.every((permission) => effective.has(permission))
        if (!allowed) throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('auth.forbiddenPermission') })
        return true
    }
}
