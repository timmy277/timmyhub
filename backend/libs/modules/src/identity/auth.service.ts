import { createHash, randomBytes } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { JwtService } from '@nestjs/jwt'
import type { AuthResult, LoginInput, RegisterInput } from '@timmyhub/contracts'
import { ApiError } from '@timmyhub/contracts'
import * as bcrypt from 'bcryptjs'

import { isCommonPassword } from './common-passwords'
import { IDENTITY_USER_LOCKED_EVENT, IDENTITY_USER_REGISTERED_EVENT } from './events/identity.events'
import { IdentityRepository } from './identity.repository'

const BCRYPT_COST = 12
const FAILED_LOGIN_LOCK_THRESHOLD = 5
const LOCK_DURATION_MS = 15 * 60 * 1000
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Hash giả để so sánh khi email không tồn tại — giữ thời gian phản hồi ổn định (docs security.md §4).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', BCRYPT_COST)

function hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex')
}

// REQ-IDN-003: refresh token là chuỗi ngẫu nhiên 256 bit, không phải JWT.
function generateRawRefreshToken(): string {
    return randomBytes(32).toString('hex')
}

@Injectable()
export class AuthService {
    constructor(
        private readonly identityRepository: IdentityRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    // REQ-IDN-001 / REQ-IDN-002
    async register(input: RegisterInput): Promise<{ userId: string; email: string }> {
        if (isCommonPassword(input.password)) {
            throw new ApiError('WEAK_PASSWORD', 'Mật khẩu quá phổ biến, vui lòng chọn mật khẩu khác.')
        }

        const existing = await this.identityRepository.findUserByEmail(input.email)
        if (existing) {
            throw new ApiError('EMAIL_ALREADY_REGISTERED', 'Email đã được sử dụng.')
        }

        const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
        const user = await this.identityRepository.registerUser({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
        })

        this.eventEmitter.emit(IDENTITY_USER_REGISTERED_EVENT, { userId: user.id, email: user.email })
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
            throw new ApiError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.')
        }

        if (user.isBanned) {
            throw new ApiError('ACCOUNT_BANNED', 'Tài khoản đã bị khoá vĩnh viễn.')
        }

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            throw new ApiError('ACCOUNT_LOCKED', 'Tài khoản đang bị tạm khoá, vui lòng thử lại sau.')
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
            throw new ApiError('REFRESH_TOKEN_INVALID', 'Refresh token không hợp lệ.')
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
                throw new ApiError(
                    'REFRESH_TOKEN_REUSED',
                    'Phiên đăng nhập có dấu hiệu bị đánh cắp, vui lòng đăng nhập lại.',
                )
            }
            throw new ApiError('REFRESH_TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
        }

        if (currentToken.expiresAt.getTime() < Date.now()) {
            throw new ApiError('REFRESH_TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
        }

        const user = await this.identityRepository.findUserById(currentToken.userId)
        if (!user) {
            throw new ApiError('REFRESH_TOKEN_INVALID', 'Refresh token không hợp lệ.')
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
            throw new ApiError('REFRESH_TOKEN_INVALID', 'Refresh token không hợp lệ.')
        }
        await this.identityRepository.revokeAllUserRefreshTokens(token.userId)
    }

    private async failLogin(userId: string, currentFailedCount: number): Promise<void> {
        await this.identityRepository.recordFailedLogin(userId)
        if (currentFailedCount + 1 >= FAILED_LOGIN_LOCK_THRESHOLD) {
            const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS)
            await this.identityRepository.lockUser(userId, lockedUntil)
            this.eventEmitter.emit(IDENTITY_USER_LOCKED_EVENT, {
                userId,
                lockedUntil,
                reason: 'too-many-failed-logins',
            })
        }
    }

    private async issueTokens(
        userId: string,
        email: string,
        roles: string[],
        deviceId: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const rawRefreshToken = generateRawRefreshToken()
        const tokenHash = hashRefreshToken(rawRefreshToken)
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

        await this.identityRepository.createRefreshToken({ userId, deviceId, tokenHash, expiresAt })
        const accessToken = await this.signAccessToken(userId, email, roles)
        return { accessToken, refreshToken: rawRefreshToken }
    }

    private async signAccessToken(userId: string, email: string, roles: string[]): Promise<string> {
        const privateKey = this.configService.get<string>('JWT_ACCESS_PRIVATE_KEY')
        if (!privateKey) {
            throw new Error('Thiếu biến môi trường JWT_ACCESS_PRIVATE_KEY')
        }
        return this.jwtService.signAsync(
            { sub: userId, email, roles },
            {
                algorithm: 'RS256',
                privateKey,
                expiresIn: ACCESS_TOKEN_TTL,
            },
        )
    }
}
