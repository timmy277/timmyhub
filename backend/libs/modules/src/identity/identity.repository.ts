import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { OUTBOX_AGGREGATE, OUTBOX_EVENT, UserRole } from '@timmyhub/contracts'
import type { Prisma, User } from '@timmyhub/prisma'
import { PrismaService } from '@timmyhub/prisma'

import { writeOutboxEvent } from './events/index'
import { REGISTERED_VIA } from './identity.constants'

export type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>

export type RegisterUserInput = {
    email: string
    passwordHash: string
    firstName: string
    lastName: string
}

export type RefreshRotationResult =
    | { outcome: 'rotated'; refreshTokenId: string }
    | {
          outcome: 'conflict'
          previous: { replacedBy: string | null; isRevoked: boolean; expiresAt: Date; userId: string } | null
      }

@Injectable()
export class IdentityRepository {
    // ===== Dependencies =====
    constructor(private readonly prisma: PrismaService) {}

    // ===== Queries =====
    countUsers(): Promise<number> {
        return this.prisma.user.count()
    }

    findUserByEmail(email: string): Promise<UserWithProfile | null> {
        return this.prisma.user.findUnique({
            where: { email },
            include: { profile: true },
        })
    }

    findUserById(id: string): Promise<UserWithProfile | null> {
        return this.prisma.user.findUnique({
            where: { id },
            include: { profile: true },
        })
    }

    findRefreshTokenByHash(tokenHash: string) {
        return this.prisma.refreshToken.findUnique({ where: { token: tokenHash } })
    }

    // Sinh id trước khi ghi để token cũ trỏ được sang token mới (replacedBy) trong cùng lượt xoay.
    generateOpaqueTokenId(): string {
        return randomUUID()
    }

    // ===== Commands =====

    // REQ-IDN-001: tạo User + Profile + outbox event trong cùng transaction (luật cứng #3 CLAUDE.md).
    async registerUser(input: RegisterUserInput): Promise<User> {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: input.email,
                    passwordHash: input.passwordHash,
                    roles: [UserRole.USER],
                    isEmailVerified: false,
                    profile: {
                        create: {
                            firstName: input.firstName,
                            lastName: input.lastName,
                            displayName: `${input.firstName} ${input.lastName}`,
                        },
                    },
                },
            })

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: user.id,
                eventType: OUTBOX_EVENT.USER_REGISTERED,
                payload: { userId: user.id, email: user.email, registeredVia: REGISTERED_VIA.PASSWORD },
            })

            return user
        })
    }

    // REQ-IDN-004: tăng đếm nguyên tử bằng UPDATE ... increment, không đọc-rồi-ghi (luật cứng #4).
    async recordFailedLogin(userId: string): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { failedLoginCount: { increment: 1 } },
        })
    }

    async lockUser(userId: string, lockedUntil: Date): Promise<void> {
        await this.prisma.user.update({ where: { id: userId }, data: { lockedUntil } })
    }

    // REQ-IDN-003 / REQ-IDN-029: đăng nhập thành công reset đếm sai và tự mở khoá.
    async recordSuccessfulLogin(userId: string, ip: string | null): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
        })
    }

    // REQ-IDN-003 kịch bản 2: tái dùng Device hiện có nếu cùng userId + userAgent, ngược lại tạo mới.
    async upsertDevice(
        userId: string,
        userAgent: string | null,
        ip: string | null,
        deviceName?: string,
    ): Promise<{ id: string }> {
        const existing = userAgent
            ? await this.prisma.device.findFirst({ where: { userId, userAgent, isActive: true } })
            : null

        if (existing) {
            await this.prisma.device.update({
                where: { id: existing.id },
                data: { ip: ip ?? existing.ip, deviceName: deviceName ?? existing.deviceName },
            })
            return { id: existing.id }
        }

        const created = await this.prisma.device.create({
            data: { userId, userAgent, ip, deviceName: deviceName ?? null },
        })
        return { id: created.id }
    }

    async createRefreshToken(input: {
        id?: string
        userId: string
        deviceId: string | null
        tokenHash: string
        expiresAt: Date
    }): Promise<{ id: string }> {
        const created = await this.prisma.refreshToken.create({
            data: {
                ...(input.id ? { id: input.id } : {}),
                userId: input.userId,
                deviceId: input.deviceId,
                token: input.tokenHash,
                expiresAt: input.expiresAt,
            },
        })
        return { id: created.id }
    }

    // REQ-IDN-005/006: compare-and-swap nguyên tử — chỉ một request thắng khi xoay token đồng thời.
    async rotateRefreshToken(input: {
        currentTokenHash: string
        nextTokenId: string
        nextTokenHash: string
        userId: string
        deviceId: string | null
        expiresAt: Date
    }): Promise<RefreshRotationResult> {
        const now = new Date()
        const result = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.refreshToken.updateMany({
                where: {
                    token: input.currentTokenHash,
                    isRevoked: false,
                    replacedBy: null,
                    expiresAt: { gt: now },
                },
                data: { replacedBy: input.nextTokenId },
            })

            if (updated.count === 0) return updated

            await tx.refreshToken.create({
                data: {
                    id: input.nextTokenId,
                    userId: input.userId,
                    deviceId: input.deviceId,
                    token: input.nextTokenHash,
                    expiresAt: input.expiresAt,
                },
            })
            return updated
        })

        if (result.count === 0) {
            const previous = await this.prisma.refreshToken.findUnique({ where: { token: input.currentTokenHash } })
            return {
                outcome: 'conflict',
                previous: previous
                    ? {
                          replacedBy: previous.replacedBy,
                          isRevoked: previous.isRevoked,
                          expiresAt: previous.expiresAt,
                          userId: previous.userId,
                      }
                    : null,
            }
        }

        return { outcome: 'rotated', refreshTokenId: input.nextTokenId }
    }

    async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { token: tokenHash, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() },
        })
    }

    // REQ-IDN-006/008: thu hồi toàn bộ phiên đang ACTIVE của một user (tái sử dụng token hoặc logout-all).
    async revokeAllUserRefreshTokens(userId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() },
        })
    }
}
