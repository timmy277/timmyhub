import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { createPublicKey } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

import type { UserRole } from '@timmyhub/contracts'
import { ApiError, apiMessageKey } from '@timmyhub/contracts'

import { ACCESS_TOKEN_VERIFY_ALGORITHM, AUTH_CONFIG_ERROR, BEARER_PREFIX } from '../auth.constants'
import { IS_PUBLIC_KEY } from '../decorators/index'

type AccessTokenPayload = { sub: string; email: string; roles: UserRole[] }

// Layer 0 — xác thực. Không có guard này trước đây: mọi endpoint đều không kiểm tra access token (lỗ hổng đã vá).
@Injectable()
export class JwtAuthGuard implements CanActivate {
    // ===== Dependencies =====
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly reflector: Reflector,
    ) {}

    // ===== Queries =====
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ])
        const request = context.switchToHttp().getRequest<Request>()
        const token = this.extractBearerToken(request)

        if (isPublic) {
            if (token) {
                const rawPublicKey = this.configService.get<string>('JWT_ACCESS_PUBLIC_KEY')
                if (rawPublicKey) {
                    try {
                        const publicKey = createPublicKey(normalizePem(rawPublicKey))
                        const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
                            algorithms: [ACCESS_TOKEN_VERIFY_ALGORITHM],
                            publicKey: publicKey as unknown as string,
                        })
                        request.user = { id: payload.sub, email: payload.email, roles: payload.roles }
                    } catch {
                        // Public route: ignore invalid/expired token without failing request
                    }
                }
            }
            return true
        }
        if (!token) {
            throw new ApiError('UNAUTHORIZED', { messageKey: apiMessageKey('auth.missingAccessToken') })
        }

        const rawPublicKey = this.configService.get<string>('JWT_ACCESS_PUBLIC_KEY')
        if (!rawPublicKey) {
            throw new Error(AUTH_CONFIG_ERROR.MISSING_ACCESS_PUBLIC_KEY)
        }

        try {
            const publicKey = createPublicKey(normalizePem(rawPublicKey))
            const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
                algorithms: [ACCESS_TOKEN_VERIFY_ALGORITHM],
                publicKey: publicKey as unknown as string,
            })
            request.user = { id: payload.sub, email: payload.email, roles: payload.roles }
            return true
        } catch {
            throw new ApiError('UNAUTHORIZED', { messageKey: apiMessageKey('auth.invalidAccessToken') })
        }
    }

    // ===== Private helpers =====
    private extractBearerToken(request: Request): string | null {
        const header = request.headers.authorization
        if (!header?.startsWith(BEARER_PREFIX)) return null
        return header.slice(BEARER_PREFIX.length).trim() || null
    }
}

// Tương tự auth.service.ts — Render/Vercel có thể nuốt newline trong PEM, khiến verify RS256 fail.
function normalizePem(raw: string): string {
    let value = raw.trim()
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
    }
    if (!value.includes('\n') && value.includes('\\n')) {
        value = value.replace(/\\n/g, '\n')
    }
    return value
}
