import { Injectable } from '@nestjs/common'

import type { UserListQuery } from '@timmyhub/contracts'
import { OUTBOX_AGGREGATE, OUTBOX_EVENT, UserRole } from '@timmyhub/contracts'
import type { Prisma, Profile, User } from '@timmyhub/prisma'
import { PrismaService } from '@timmyhub/prisma'

// Import thẳng file writer thay vì barrel `events/index`: barrel kéo theo `IdentityEventsListener` (cần
// `@nestjs/event-emitter`), làm module này không nạp được trong môi trường test Jest/CJS. Writer là hàm thuần nhận `tx`.
// Ngoại lệ này đã khai một lần ở `eslint.config.mjs` (`!../events/outbox-writer`) — cùng lý do với `rbac.repository.ts`.
import { writeOutboxEvent } from '../events/outbox-writer'
import { writeAuditLog } from '../audit-log.writer'
import { REGISTERED_VIA } from '../identity.constants'
import { buildUserListOrderBy, buildUserListWhere } from '../utils/index'

// `User` + `Profile` (có thể chưa tồn tại — tài khoản SSO mới) là hình dạng mọi truy vấn danh sách/chi tiết trả về.
export type UserWithProfile = User & { profile: Profile | null }

export type CreateUserRecordInput = {
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    phone: string | null
    roles: UserRole[]
    createdBy: string
}

export type UpdateUserProfileInput = {
    firstName?: string | undefined
    lastName?: string | undefined
    displayName?: string | undefined
    phone?: string | null | undefined
}

// `sort` → orderBy của Prisma nằm ở `../utils/user-list.utils` (`buildUserListOrderBy`) — hàm thuần, kiểm chứng được
// mà không cần DB, cùng chỗ với `buildUserListWhere`.
@Injectable()
export class UsersRepository {
    // ===== Dependencies =====
    constructor(private readonly prisma: PrismaService) {}

    // ===== Queries =====

    // Luật cứng #7 CLAUDE.md: phạm vi đi vào câu truy vấn, không lọc sau khi lấy về. Mọi điều kiện (tìm kiếm chung,
    // lọc theo cột, lọc role/trạng thái, loại bản ghi đã xoá mềm) nằm trong `where` — `totalItems` cũng đếm trên
    // cùng `where` đó nên phân trang không rò rỉ số bản ghi ngoài phạm vi.
    async listUsers(params: {
        filters: Pick<UserListQuery, 'q' | 'role' | 'status' | 'name' | 'email' | 'createdFrom' | 'createdTo'>
        page: number
        pageSize: number
        sort: UserListQuery['sort']
    }): Promise<{ items: UserWithProfile[]; totalItems: number }> {
        const where = buildUserListWhere(params.filters)
        const [items, totalItems] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                include: { profile: true },
                orderBy: buildUserListOrderBy(params.sort),
                skip: (params.page - 1) * params.pageSize,
                take: params.pageSize,
            }),
            this.prisma.user.count({ where }),
        ])
        return { items, totalItems }
    }

    findUserById(id: string): Promise<UserWithProfile | null> {
        return this.prisma.user.findUnique({ where: { id }, include: { profile: true } })
    }

    findUserByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } })
    }

    findUserByPhone(phone: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { phone } })
    }

    // ===== Commands =====

    // Tạo `User` + `Profile` + `UserSystemRole` (để lớp permission động phân giải được) + outbox event, tất cả trong
    // một transaction (luật cứng #3). Không tạo `RefreshToken`: tài khoản do admin tạo chưa có phiên nào.
    async createUser(input: CreateUserRecordInput): Promise<UserWithProfile> {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: input.email,
                    phone: input.phone,
                    passwordHash: input.passwordHash,
                    roles: input.roles,
                    // Tài khoản do admin tạo được coi là đã xác minh email: admin chịu trách nhiệm danh tính.
                    isEmailVerified: true,
                    isPhoneVerified: false,
                    profile: {
                        create: {
                            firstName: input.firstName,
                            lastName: input.lastName,
                            displayName: `${input.firstName} ${input.lastName}`,
                        },
                    },
                },
                include: { profile: true },
            })

            await this.assignSystemRoles(tx, user.id, input.roles)

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: user.id,
                eventType: OUTBOX_EVENT.USER_REGISTERED,
                payload: {
                    userId: user.id,
                    email: user.email,
                    registeredVia: REGISTERED_VIA.ADMIN,
                    createdBy: input.createdBy,
                },
            })

            await writeAuditLog(tx, {
                action: 'identity.user.create',
                entityType: 'User',
                entityId: user.id,
                actorId: input.createdBy,
                actorType: 'ADMIN',
                after: { fields: ['roles', 'firstName', 'lastName', 'phone'], isEmailVerified: true },
            })

            return user
        })
    }

    // PATCH hồ sơ thay người dùng (hỗ trợ). `phone: null` là xoá số; field không gửi thì giữ nguyên.
    async updateUserProfile(userId: string, input: UpdateUserProfileInput, actorId: string): Promise<UserWithProfile> {
        return this.prisma.$transaction(async (tx) => {
            const profileData: Prisma.ProfileUpdateInput = {}
            if (input.firstName !== undefined) profileData.firstName = input.firstName
            if (input.lastName !== undefined) profileData.lastName = input.lastName
            if (input.displayName !== undefined) profileData.displayName = input.displayName

            if (Object.keys(profileData).length > 0) {
                await tx.profile.upsert({
                    where: { userId },
                    update: profileData,
                    // Tài khoản SSO có thể chưa có `Profile` — upsert để không phải rẽ nhánh create/update ở service.
                    create: {
                        userId,
                        firstName: input.firstName ?? '',
                        lastName: input.lastName ?? '',
                        displayName: input.displayName ?? null,
                    },
                })
            }

            if (input.phone !== undefined) {
                await tx.user.update({ where: { id: userId }, data: { phone: input.phone } })
            }

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: userId,
                eventType: OUTBOX_EVENT.USER_PROFILE_UPDATED,
                payload: {
                    userId,
                    fields: Object.keys(input).filter(
                        (field) => input[field as keyof UpdateUserProfileInput] !== undefined,
                    ),
                },
            })

            await writeAuditLog(tx, {
                action: 'identity.user.update',
                entityType: 'User',
                entityId: userId,
                actorId,
                actorType: 'ADMIN',
                after: {
                    changedFields: Object.keys(input).filter(
                        (field) => input[field as keyof UpdateUserProfileInput] !== undefined,
                    ),
                },
            })

            const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } })
            return user
        })
    }

    // Khoá / mở khoá của admin (REQ-USR-012). Khoá thu hồi toàn bộ phiên đang hoạt động trong cùng transaction:
    // access token còn hạn tối đa 15 phút, nhưng refresh token thì phải chết ngay.
    async setUserLocked(
        userId: string,
        input: { locked: boolean; reason?: string | undefined; actorId: string },
    ): Promise<UserWithProfile> {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: {
                    isBanned: input.locked,
                    banReason: input.locked ? (input.reason ?? null) : null,
                },
                include: { profile: true },
            })

            if (input.locked) {
                await tx.refreshToken.updateMany({
                    where: { userId, isRevoked: false },
                    data: { isRevoked: true, revokedAt: new Date() },
                })
            }

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: userId,
                eventType: OUTBOX_EVENT.USER_LOCKED,
                payload: { userId, isBanned: input.locked, reason: input.reason ?? null, actorId: input.actorId },
            })

            await writeAuditLog(tx, {
                action: input.locked ? 'identity.user.lock' : 'identity.user.unlock',
                entityType: 'User',
                entityId: userId,
                actorId: input.actorId,
                actorType: 'ADMIN',
                after: { isBanned: input.locked, reason: input.locked ? (input.reason ?? null) : null },
            })

            return user
        })
    }

    // Xoá mềm (FEAT-USR-004, api-conventions §2 `DELETE` = xoá mềm): giữ bản ghi cho audit, chặn đăng nhập bằng
    // `deletedAt` và thu hồi mọi phiên. Không xoá cứng vì `User` là chủ thể của nhiều domain khác.
    async softDeleteUser(userId: string, actorId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { deletedAt: new Date(), isActive: false },
            })

            await tx.refreshToken.updateMany({
                where: { userId, isRevoked: false },
                data: { isRevoked: true, revokedAt: new Date() },
            })

            await tx.userPermission.deleteMany({ where: { userId } })
            await tx.userSystemRole.deleteMany({ where: { userId } })

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: userId,
                eventType: OUTBOX_EVENT.USER_DELETED,
                payload: { userId, actorId },
            })

            await writeAuditLog(tx, {
                action: 'identity.user.delete',
                entityType: 'User',
                entityId: userId,
                actorId,
                actorType: 'ADMIN',
                after: { deleted: true },
            })
        })
    }

    // Gán vai trò hệ thống lúc tạo user. `@@id([userId, roleId])` làm gán trùng thành no-op; role không tồn tại
    // (dữ liệu seed chưa chạy) thì bỏ qua thay vì làm hỏng cả transaction tạo user.
    private async assignSystemRoles(
        tx: Prisma.TransactionClient,
        userId: string,
        roles: readonly UserRole[],
    ): Promise<void> {
        const systemRoles = await tx.systemRole.findMany({ where: { name: { in: [...roles] } } })
        if (systemRoles.length === 0) return

        await tx.userSystemRole.createMany({
            data: systemRoles.map((role) => ({ userId, roleId: role.id })),
            skipDuplicates: true,
        })
    }
}
