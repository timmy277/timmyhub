import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'

import type { AuthResult, LoginInput, RegisterInput, UserRole } from '@timmyhub/contracts'
import { ApiError } from '@timmyhub/contracts'

import { isCommonPassword } from './common-passwords'
import {
    ACCESS_TOKEN_ALGORITHM,
    ACCESS_TOKEN_TTL,
    ACCOUNT_LOCK_REASON,
    BCRYPT_COST,
    DUMMY_HASH,
    FAILED_LOGIN_LOCK_THRESHOLD,
    IDENTITY_CONFIG_ERROR,
    IDENTITY_EVENT,
    LOCK_DURATION_MS,
    REFRESH_TOKEN_TTL_MS,
} from './identity.constants'
import { IdentityRepository } from './identity.repository'
import { generateRawRefreshToken, hashRefreshToken } from './utils/index'

@Injectable()
export class AuthService {
    // ===== Dependencies =====
    constructor(
        private readonly identityRepository: IdentityRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    // ===== Commands =====

    // REQ-IDN-001 / REQ-IDN-002
    async register(input: RegisterInput): Promise<{ userId: string; email: string }> {
        if (isCommonPassword(input.password)) {
            throw new ApiError('WEAK_PASSWORD')
        }

        const existing = await this.identityRepository.findUserByEmail(input.email)
        if (existing) {
            throw new ApiError('EMAIL_ALREADY_REGISTERED')
        }

        const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
        const user = await this.identityRepository.registerUser({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
        })

        // Event nội bộ chỉ mang userId — listener không cần email, tránh đưa dữ liệu cá nhân đi lòng vòng.
        this.eventEmitter.emit(IDENTITY_EVENT.USER_REGISTERED, { userId: user.id })
        return { userId: user.id, email: user.email }
    }

    // REQ-IDN-003 / REQ-IDN-004 / REQ-IDN-028 / REQ-IDN-029
    async login(input: LoginInput, context: { ip: string | null; userAgent: string | null }): Promise<AuthResult> {
        const user = await this.identityRepository.findUserByEmail(input.email)
        const hashToCompare = user?.passwordHash ?? DUMMY_HASH
        const passwordMatches = await bcrypt.compare(input.password, hashToCompare)

        // Trả lỗi giống nhau cho "email không tồn tại" và "sai mật khẩu" — không tiết lộ qua nội dung lỗi.
        if (!user || !passwordMatches) {
            if (user) {
                await this.failLogin(user.id, user.failedLoginCount)
            }
            throw new ApiError('INVALID_CREDENTIALS')
        }

        if (user.isBanned) {
            throw new ApiError('ACCOUNT_BANNED')
        }

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            throw new ApiError('ACCOUNT_LOCKED')
        }

        await this.identityRepository.recordSuccessfulLogin(user.id, context.ip)
        const device = await this.identityRepository.upsertDevice(user.id, context.userAgent, context.ip)
        const tokens = await this.issueTokens(user.id, user.email, user.roles, device.id)

        return { ...tokens, user: { id: user.id, email: user.email, roles: user.roles } }
    }

    // REQ-IDN-005 / REQ-IDN-006
    async refresh(rawRefreshToken: string): Promise<AuthResult> {
        const currentHash = hashRefreshToken(rawRefreshToken)
        const nextTokenId = this.identityRepository.generateOpaqueTokenId()
        const currentToken = await this.identityRepository.findRefreshTokenByHash(currentHash)

        if (!currentToken) {
            throw new ApiError('REFRESH_TOKEN_INVALID')
        }

        const rawNextToken = generateRawRefreshToken()
        const nextHash = hashRefreshToken(rawNextToken)
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

        const result = await this.identityRepository.rotateRefreshToken({
            currentTokenHash: currentHash,
            nextTokenId,
            nextTokenHash: nextHash,
            userId: currentToken.userId,
            deviceId: currentToken.deviceId,
            expiresAt,
        })

        if (result.outcome === 'conflict') {
            const wasRotatedBefore = result.previous?.replacedBy != null
            if (wasRotatedBefore) {
                // Token ROTATED bị dùng lại — dấu hiệu bị đánh cắp, thu hồi toàn bộ phiên (REQ-IDN-006).
                await this.identityRepository.revokeAllUserRefreshTokens(currentToken.userId)
                throw new ApiError('REFRESH_TOKEN_REUSED')
            }
            throw new ApiError('REFRESH_TOKEN_EXPIRED')
        }

        if (currentToken.expiresAt.getTime() < Date.now()) {
            throw new ApiError('REFRESH_TOKEN_EXPIRED')
        }

        const user = await this.identityRepository.findUserById(currentToken.userId)
        if (!user) {
            throw new ApiError('REFRESH_TOKEN_INVALID')
        }

        const accessToken = await this.signAccessToken(user.id, user.email, user.roles)
        return {
            accessToken,
            refreshToken: rawNextToken,
            user: { id: user.id, email: user.email, roles: user.roles },
        }
    }

    // REQ-IDN-007
    async logout(rawRefreshToken: string): Promise<void> {
        await this.identityRepository.revokeRefreshTokenByHash(hashRefreshToken(rawRefreshToken))
    }

    // REQ-IDN-008
    async logoutAll(rawRefreshToken: string): Promise<void> {
        const token = await this.identityRepository.findRefreshTokenByHash(hashRefreshToken(rawRefreshToken))
        if (!token) {
            throw new ApiError('REFRESH_TOKEN_INVALID')
        }
        await this.identityRepository.revokeAllUserRefreshTokens(token.userId)
    }

    // ===== Private helpers =====
    private async failLogin(userId: string, currentFailedCount: number): Promise<void> {
        await this.identityRepository.recordFailedLogin(userId)
        if (currentFailedCount + 1 >= FAILED_LOGIN_LOCK_THRESHOLD) {
            const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS)
            await this.identityRepository.lockUser(userId, lockedUntil)
            this.eventEmitter.emit(IDENTITY_EVENT.USER_LOCKED, {
                userId,
                lockedUntil,
                reason: ACCOUNT_LOCK_REASON.TOO_MANY_FAILED_LOGINS,
            })
        }
    }

    private async issueTokens(
        userId: string,
        email: string,
        roles: readonly UserRole[],
        deviceId: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const rawRefreshToken = generateRawRefreshToken()
        const tokenHash = hashRefreshToken(rawRefreshToken)
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

        await this.identityRepository.createRefreshToken({ userId, deviceId, tokenHash, expiresAt })
        const accessToken = await this.signAccessToken(userId, email, roles)
        return { accessToken, refreshToken: rawRefreshToken }
    }

    private async signAccessToken(userId: string, email: string, roles: readonly UserRole[]): Promise<string> {
        const privateKey = this.configService.get<string>('JWT_ACCESS_PRIVATE_KEY')
        if (!privateKey) {
            throw new Error(IDENTITY_CONFIG_ERROR.MISSING_ACCESS_PRIVATE_KEY)
        }
        return this.jwtService.signAsync(
            { sub: userId, email, roles },
            {
                algorithm: ACCESS_TOKEN_ALGORITHM,
                privateKey,
                expiresIn: ACCESS_TOKEN_TTL,
            },
        )
    }
}
