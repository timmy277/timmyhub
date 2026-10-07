import { generateKeyPairSync } from 'node:crypto'

import type { ConfigService } from '@nestjs/config'
import type { JwtService } from '@nestjs/jwt'

import { UserRole } from '@timmyhub/contracts'

import { AuthService } from './auth.service'
import type { IdentityRepository, RefreshRotationResult } from './identity.repository'
import { hashRefreshToken } from './utils/index'

// `signAccessToken` dùng `crypto.createPrivateKey` nên mock phải trả PEM hợp lệ (không thể là 'private-key' nữa).
const TEST_PRIVATE_KEY_PEM = generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString()

// `@nestjs/event-emitter@12` và `@nestjs/config@12` đều là package ESM thuần (`"type": "module"`, không có nhánh
// CJS) nên Jest — vốn nạp module qua `require` — không đọc được. Ứng dụng chạy thật không dính lỗi này (Node 22
// `require(esm)`), chỉ Jest chặn. `AuthService` chỉ dùng `emit()` và `configService.get()`, cả hai đều được tiêm
// giả bên dưới, nên chặn hẳn module thật là đủ và trung thực.
jest.mock('@nestjs/event-emitter', () => ({
    EventEmitter2: class EventEmitter2 {},
    // `identity/events/identity.events.ts` gắn `@OnEvent(...)` ở thời điểm nạp module ⇒ stub phải có mặt,
    // nhưng chỉ cần là decorator rỗng vì ở đây không kiểm tra việc gắn listener.
    OnEvent: () => () => undefined,
}))
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }))

// Vòng xoay refresh token (REQ-IDN-005/006) — phần dễ hỏng nhất và cũng dễ trả giá nhất của luồng đăng nhập.
//
// Bối cảnh: bản trước kiểm hạn token SAU khi đã xoay, nên một refresh token hết hạn gửi lần đầu vẫn kịp đánh dấu
// `replacedBy` và tạo một token mồ côi; gửi lần thứ hai thì CAS trượt và bị hiểu nhầm là token bị đánh cắp ⇒
// `revokeAllUserRefreshTokens()` đăng xuất mọi thiết bị của người dùng. Trái REQ-IDN-006 kịch bản 2.
//
// Bộ test này khoá lại hành vi đúng: token hết hạn bị chặn TRƯỚC khi chạm database, và không bao giờ kéo theo việc
// thu hồi toàn bộ phiên.

const RAW_TOKEN = 'raw-refresh-token'
const RAW_TOKEN_HASH = hashRefreshToken(RAW_TOKEN)

const DEFAULT_USER = {
    id: 'user-1',
    email: 'user1@timmyhub.dev',
    roles: [UserRole.USER],
    deletedAt: null as Date | null,
}

function futureDate(): Date {
    return new Date(Date.now() + 60_000)
}

function pastDate(): Date {
    return new Date(Date.now() - 60_000)
}

function buildService(
    options: {
        token?: { userId: string; deviceId: string | null; expiresAt: Date } | null
        rotation?: RefreshRotationResult
        user?: typeof DEFAULT_USER | null
    } = {},
) {
    const findRefreshTokenByHash = jest.fn().mockResolvedValue(options.token ?? null)
    const rotateRefreshToken = jest
        .fn()
        .mockResolvedValue(options.rotation ?? { outcome: 'rotated', refreshTokenId: 'next-id' })
    const revokeAllUserRefreshTokens = jest.fn().mockResolvedValue(undefined)
    const generateOpaqueTokenId = jest.fn().mockReturnValue('next-id')
    // `undefined` = dùng mặc định; `null` = mô phỏng user đã bị xoá (khác hẳn nhau, không dùng `??`).
    const findUserById = jest.fn().mockResolvedValue(options.user === undefined ? DEFAULT_USER : options.user)

    const repository = {
        findRefreshTokenByHash,
        rotateRefreshToken,
        revokeAllUserRefreshTokens,
        generateOpaqueTokenId,
        findUserById,
    } as unknown as IdentityRepository

    const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-access-token') } as unknown as JwtService
    const configService = { get: jest.fn().mockReturnValue(TEST_PRIVATE_KEY_PEM) } as unknown as ConfigService
    const eventEmitter = { emit: jest.fn() } as unknown as ConstructorParameters<typeof AuthService>[3]

    return {
        service: new AuthService(repository, jwtService, configService, eventEmitter),
        rotateRefreshToken,
        revokeAllUserRefreshTokens,
        findRefreshTokenByHash,
    }
}

describe('AuthService.refresh — REQ-IDN-005 / REQ-IDN-006', () => {
    it('token không tồn tại → REFRESH_TOKEN_INVALID, không xoay token', async () => {
        const { service, rotateRefreshToken } = buildService({ token: null })

        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' })
        expect(rotateRefreshToken).not.toHaveBeenCalled()
    })

    it('token hết hạn → REFRESH_TOKEN_EXPIRED, KHÔNG xoay token và KHÔNG thu hồi phiên', async () => {
        const { service, rotateRefreshToken, revokeAllUserRefreshTokens } = buildService({
            token: { userId: 'user-1', deviceId: null, expiresAt: pastDate() },
        })

        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_EXPIRED' })
        // Hai khẳng định này là cốt lõi: chặn trước khi chạm DB nên không có token mồ côi, không có `replacedBy`.
        expect(rotateRefreshToken).not.toHaveBeenCalled()
        expect(revokeAllUserRefreshTokens).not.toHaveBeenCalled()
    })

    it('hồi quy: gửi lại token đã hết hạn lần thứ hai vẫn KHÔNG thu hồi toàn bộ phiên', async () => {
        const { service, rotateRefreshToken, revokeAllUserRefreshTokens } = buildService({
            token: { userId: 'user-1', deviceId: null, expiresAt: pastDate() },
        })

        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_EXPIRED' })
        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_EXPIRED' })

        expect(rotateRefreshToken).not.toHaveBeenCalled()
        expect(revokeAllUserRefreshTokens).not.toHaveBeenCalled()
    })

    it('token đã xoay mà bị dùng lại → REFRESH_TOKEN_REUSED và thu hồi mọi phiên', async () => {
        const { service, revokeAllUserRefreshTokens } = buildService({
            token: { userId: 'user-1', deviceId: null, expiresAt: futureDate() },
            rotation: {
                outcome: 'conflict',
                previous: { replacedBy: 'other-token-id', isRevoked: false, expiresAt: futureDate(), userId: 'user-1' },
            },
        })

        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_REUSED' })
        expect(revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-1')
    })

    it('CAS trượt nhưng token chưa từng bị xoay (vd. đã thu hồi) → EXPIRED, không thu hồi phiên', async () => {
        const { service, revokeAllUserRefreshTokens } = buildService({
            token: { userId: 'user-1', deviceId: null, expiresAt: futureDate() },
            rotation: {
                outcome: 'conflict',
                previous: { replacedBy: null, isRevoked: true, expiresAt: futureDate(), userId: 'user-1' },
            },
        })

        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_EXPIRED' })
        expect(revokeAllUserRefreshTokens).not.toHaveBeenCalled()
    })

    it('CAS trượt và bản ghi không còn → EXPIRED, không thu hồi phiên', async () => {
        const { service, revokeAllUserRefreshTokens } = buildService({
            token: { userId: 'user-1', deviceId: null, expiresAt: futureDate() },
            rotation: { outcome: 'conflict', previous: null },
        })

        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_EXPIRED' })
        expect(revokeAllUserRefreshTokens).not.toHaveBeenCalled()
    })

    it('token hợp lệ → trả access token mới, refresh token mới, và xoay đúng hash', async () => {
        const { service, rotateRefreshToken } = buildService({
            token: { userId: 'user-1', deviceId: 'device-1', expiresAt: futureDate() },
        })

        const result = await service.refresh(RAW_TOKEN)

        expect(result.accessToken).toBe('signed-access-token')
        expect(typeof result.refreshToken).toBe('string')
        expect(result.refreshToken).not.toBe(RAW_TOKEN)
        expect(rotateRefreshToken).toHaveBeenCalledWith(
            expect.objectContaining({
                currentTokenHash: RAW_TOKEN_HASH,
                userId: 'user-1',
                deviceId: 'device-1',
                nextTokenId: 'next-id',
            }),
        )
    })

    it('token hợp lệ nhưng user đã bị xoá → REFRESH_TOKEN_INVALID', async () => {
        const { service } = buildService({
            token: { userId: 'user-1', deviceId: null, expiresAt: futureDate() },
            user: null,
        })

        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' })
    })

    it('token hợp lệ nhưng user bị soft-delete → REFRESH_TOKEN_INVALID', async () => {
        const { service } = buildService({
            token: { userId: 'user-1', deviceId: null, expiresAt: futureDate() },
            user: { ...DEFAULT_USER, deletedAt: new Date() },
        })

        await expect(service.refresh(RAW_TOKEN)).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' })
    })
})
