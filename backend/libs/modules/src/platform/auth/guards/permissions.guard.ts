import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { PermissionName } from '@timmyhub/contracts'
import { ApiError } from '@timmyhub/contracts'
import type { Request } from 'express'

import { RbacService } from '@timmyhub/modules/identity'

import { PERMISSIONS_KEY } from '../decorators/index'

// Layer 2 — permission động, đọc từ RbacService (cache-aside trong process, xem permission-cache.service.ts).
// SUPER_ADMIN bypass (rbac-advanced.md §8) nhưng vẫn phải qua layer 0-1 trước đó.
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly rbacService: RbacService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required = this.reflector.getAllAndOverride<PermissionName[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ])
        if (!required || required.length === 0) return true

        const { user } = context.switchToHttp().getRequest<Request>()
        if (!user) throw new ApiError('UNAUTHORIZED', 'Chưa xác thực.')
        if (user.roles.includes('SUPER_ADMIN')) return true

        const effective = await this.rbacService.getEffectivePermissions(user.id)
        const allowed = required.every((permission) => effective.has(permission))
        if (!allowed) throw new ApiError('FORBIDDEN', 'Không có quyền thực hiện thao tác này.')
        return true
    }
}
