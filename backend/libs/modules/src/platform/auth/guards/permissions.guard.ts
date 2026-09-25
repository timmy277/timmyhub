import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import type { PermissionName } from '@timmyhub/contracts'
import { ApiError, apiMessageKey, isSuperAdmin } from '@timmyhub/contracts'

import { PERMISSION_RESOLVER } from '../auth.constants'
import { PERMISSIONS_KEY } from '../decorators/index'
import type { PermissionResolver } from '../interfaces/index'

// Layer 2 — permission động, hỏi qua PermissionResolver (hiện thực: RbacService của identity, cache-aside trong
// process). SUPER_ADMIN bypass (rbac-advanced.md §8) nhưng vẫn phải qua layer 0-1 trước đó.
@Injectable()
export class PermissionsGuard implements CanActivate {
    // ===== Dependencies =====
    constructor(
        private readonly reflector: Reflector,
        @Inject(PERMISSION_RESOLVER) private readonly permissionResolver: PermissionResolver,
    ) {}

    // ===== Queries =====
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required = this.reflector.getAllAndOverride<PermissionName[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ])
        if (!required || required.length === 0) return true

        const { user } = context.switchToHttp().getRequest<Request>()
        if (!user) throw new ApiError('UNAUTHORIZED')
        if (isSuperAdmin(user.roles)) return true

        const effective = await this.permissionResolver.getEffectivePermissions(user.id)
        const allowed = required.every((permission) => effective.has(permission))
        if (!allowed) throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('auth.forbiddenPermission') })
        return true
    }
}
