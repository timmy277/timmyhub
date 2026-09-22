import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ApiError } from '@timmyhub/contracts'
import type { UserRole } from '@timmyhub/prisma'
import type { Request } from 'express'

import { ROLES_KEY } from '../decorators/index'

// Layer 1 — kiểm tra thô trên User.roles. Chạy sau JwtAuthGuard nên request.user đã có.
// SUPER_ADMIN bypass layer 1-2 (không bypass layer 4 CASL — xem design.md §8), nhưng việc bypass phải để lại vết.
// Chưa có audit module (FEAT-AUD-001 chưa triển khai) nên tạm ghi log — thay bằng ghi audit log thật khi module đó có.
@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name)

    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ])
        if (!required || required.length === 0) return true

        const { user } = context.switchToHttp().getRequest<Request>()
        if (!user) throw new ApiError('UNAUTHORIZED', 'Chưa xác thực.')

        if (user.roles.includes('SUPER_ADMIN')) {
            this.logger.warn(
                `SUPER_ADMIN bypass RolesGuard: user=${user.id} handler=${context.getClass().name}.${context.getHandler().name}`,
            )
            return true
        }

        const allowed = required.some((role) => user.roles.includes(role))
        if (!allowed) throw new ApiError('FORBIDDEN', 'Không có quyền truy cập tài nguyên này.')
        return true
    }
}
