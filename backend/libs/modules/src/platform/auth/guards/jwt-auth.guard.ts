import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { ApiError } from '@timmyhub/contracts'
import type { UserRole } from '@timmyhub/prisma'
import type { Request } from 'express'

import { IS_PUBLIC_KEY } from '../decorators/index'

type AccessTokenPayload = { sub: string; email: string; roles: UserRole[] }

function extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) return null
    return header.slice('Bearer '.length).trim() || null
}

// Layer 0 — xác thực. Không có guard này trước đây: mọi endpoint đều không kiểm tra access token (lỗ hổng đã vá).
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ])
        if (isPublic) return true

        const request = context.switchToHttp().getRequest<Request>()
        const token = extractBearerToken(request)
        if (!token) {
            throw new ApiError('UNAUTHORIZED', 'Thiếu access token.')
        }

        const publicKey = this.configService.get<string>('JWT_ACCESS_PUBLIC_KEY')
        if (!publicKey) {
            throw new Error('Thiếu biến môi trường JWT_ACCESS_PUBLIC_KEY')
        }

        try {
            const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
                algorithms: ['RS256'],
                publicKey,
            })
            request.user = { id: payload.sub, email: payload.email, roles: payload.roles }
            return true
        } catch {
            throw new ApiError('UNAUTHORIZED', 'Access token không hợp lệ hoặc đã hết hạn.')
        }
    }
}
