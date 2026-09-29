import { Inject, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'

import type {
    CreateUserInput,
    LockUserInput,
    UpdateUserInput,
    UserDetail,
    UserListQuery,
    UserListResult,
} from '@timmyhub/contracts'
import { ApiError, apiMessageKey, isSuperAdmin, UserRole } from '@timmyhub/contracts'
import type { PermissionResolver } from '@timmyhub/modules/platform/auth'
import { PERMISSION_RESOLVER } from '@timmyhub/modules/platform/auth'

import { isCommonPassword } from '../common-passwords'
import { ASSIGN_USER_ROLE_PERMISSION, BCRYPT_COST, DEFAULT_CREATED_USER_ROLES } from '../identity.constants'
import { toUserDetail, toUserPagination, toUserSummary } from './users.mapper'
import type { UserWithProfile } from './users.repository'
import { UsersRepository } from './users.repository'

// Actor đã xác thực (JwtAuthGuard gắn vào request) — chỉ cần id + roles lớp 1; quyền động hỏi qua PermissionResolver.
export type UsersActor = {
    id: string
    roles: readonly UserRole[]
}

// Quản trị người dùng — FEAT-USR-004 (admin CRUD user) và FEAT-USR-005 (khoá/mở khoá), requirements
// docs/03-specs/user-profile/requirements.md §4.
//
// Phạm vi dữ liệu (lớp 4, CLAUDE.md luật #6-8): danh mục quyền §4.1 không có biến thể `:own` cho `identity:users:*`
// nên quyền này là toàn sàn — mọi bản ghi chưa xoá mềm đều nằm trong phạm vi, và điều kiện đó được đưa thẳng vào
// `where` của truy vấn (users.repository). Luật theo bản ghi: tài khoản SUPER_ADMIN nằm ngoài phạm vi của người
// không phải SUPER_ADMIN → 404 (không phải 403, luật cứng #8).
@Injectable()
export class UsersService {
    // ===== Dependencies =====
    constructor(
        private readonly repository: UsersRepository,
        @Inject(PERMISSION_RESOLVER) private readonly permissionResolver: PermissionResolver,
    ) {}

    // ===== Queries =====
    async listUsers(query: UserListQuery): Promise<UserListResult> {
        const { items, totalItems } = await this.repository.listUsers({
            // Bộ lọc theo cột (`name`/`email`/`createdFrom`/`createdTo`) đi cùng đường với `q`/`role`/`status` — tất
            // cả vào `where` của Prisma, không lọc ở tầng này (luật cứng #7).
            filters: {
                q: query.q,
                role: query.role,
                status: query.status,
                name: query.name,
                email: query.email,
                createdFrom: query.createdFrom,
                createdTo: query.createdTo,
            },
            page: query.page,
            pageSize: query.pageSize,
            sort: query.sort,
        })

        return {
            items: items.map(toUserSummary),
            pagination: toUserPagination(totalItems, query.page, query.pageSize),
        }
    }

    async getUser(userId: string): Promise<UserDetail> {
        return toUserDetail(await this.requireVisibleUser(userId))
    }

    // ===== Commands =====
    async createUser(input: CreateUserInput, actor: UsersActor): Promise<UserDetail> {
        if (isCommonPassword(input.password)) {
            throw new ApiError('WEAK_PASSWORD')
        }

        const emailTaken = await this.repository.findUserByEmail(input.email)
        if (emailTaken) {
            throw new ApiError('EMAIL_ALREADY_REGISTERED')
        }

        if (input.phone) {
            const phoneTaken = await this.repository.findUserByPhone(input.phone)
            if (phoneTaken) {
                throw new ApiError('PHONE_ALREADY_REGISTERED')
            }
        }

        const roles = input.roles ?? [...DEFAULT_CREATED_USER_ROLES]
        await this.assertCanAssignRoles(actor, roles)

        const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
        const user = await this.repository.createUser({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? null,
            roles,
            createdBy: actor.id,
        })

        return toUserDetail(user)
    }

    async updateUser(userId: string, input: UpdateUserInput, actor: UsersActor): Promise<UserDetail> {
        const target = await this.requireManageableUser(userId, actor)

        if (input.phone !== undefined && input.phone !== null) {
            const phoneTaken = await this.repository.findUserByPhone(input.phone)
            if (phoneTaken && phoneTaken.id !== userId) {
                throw new ApiError('PHONE_ALREADY_REGISTERED')
            }
        }

        // Không field nào đổi → trả nguyên trạng, không ghi DB, không phát event (idempotent theo nội dung,
        // REQ-USR-002 kịch bản 3).
        const hasChange = Object.values(input).some((value) => value !== undefined)
        if (!hasChange) return toUserDetail(target)

        return toUserDetail(await this.repository.updateUserProfile(userId, input, actor.id))
    }

    // REQ-USR-012 / REQ-USR-013
    async setUserLocked(userId: string, locked: boolean, actor: UsersActor, body?: LockUserInput): Promise<UserDetail> {
        this.assertNotSelf(userId, actor)
        await this.requireManageableUser(userId, actor)

        const user = await this.repository.setUserLocked(userId, {
            locked,
            reason: body?.reason,
            actorId: actor.id,
        })
        return toUserDetail(user)
    }

    // REQ-USR-013: xoá là thao tác không thể tự làm trên chính mình (mất luôn đường quản trị) và cũng không áp dụng
    // cho tài khoản ngoài phạm vi.
    async deleteUser(userId: string, actor: UsersActor): Promise<void> {
        this.assertNotSelf(userId, actor)
        await this.requireManageableUser(userId, actor)
        await this.repository.softDeleteUser(userId, actor.id)
    }

    // ===== Private helpers =====

    // Tài khoản hiển thị được: chưa xoá mềm. Không tìm thấy hoặc đã xoá đều 404 — như nhau với người gọi, tránh rò rỉ
    // sự tồn tại của bản ghi đã xoá.
    private async requireVisibleUser(userId: string): Promise<UserWithProfile> {
        const user = await this.repository.findUserById(userId)
        if (!user || user.deletedAt) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('identity.userNotFound') })
        }
        return user
    }

    // Thêm một lớp phạm vi cho thao tác ghi: tài khoản SUPER_ADMIN chỉ SUPER_ADMIN mới đụng được. Trả 404 (luật cứng
    // #8) thay vì 403 — người ngoài phạm vi không cần biết tài khoản đó có thật hay không.
    private async requireManageableUser(userId: string, actor: UsersActor): Promise<UserWithProfile> {
        const user = await this.requireVisibleUser(userId)
        if (isSuperAdmin(user.roles) && !isSuperAdmin(actor.roles)) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('identity.userNotFound') })
        }
        return user
    }

    private assertNotSelf(userId: string, actor: UsersActor): void {
        if (userId === actor.id) {
            throw new ApiError('CANNOT_MODIFY_SELF')
        }
    }

    // Người tạo không được cấp quyền vượt quá quyền của chính mình (rbac-advanced.md §7, cùng luật với
    // RbacService.grantUserPermission): tạo tài khoản với vai trò khác mặc định đòi `identity:users:assign-role`, và
    // vai trò SUPER_ADMIN chỉ SUPER_ADMIN gán được.
    private async assertCanAssignRoles(actor: UsersActor, roles: readonly UserRole[]): Promise<void> {
        const hasNonDefaultRole = roles.some((role) => role !== UserRole.USER)
        if (!hasNonDefaultRole) return

        if (roles.includes(UserRole.SUPER_ADMIN) && !isSuperAdmin(actor.roles)) {
            throw new ApiError('CANNOT_ESCALATE_PRIVILEGE', { messageKey: apiMessageKey('rbac.cannotGrantSuperAdmin') })
        }

        if (isSuperAdmin(actor.roles)) return

        const effective = await this.permissionResolver.getEffectivePermissions(actor.id)
        if (!effective.has(ASSIGN_USER_ROLE_PERMISSION)) {
            throw new ApiError('CANNOT_ESCALATE_PRIVILEGE', {
                messageKey: apiMessageKey('rbac.cannotGrantUnownedPermission'),
            })
        }
    }
}
