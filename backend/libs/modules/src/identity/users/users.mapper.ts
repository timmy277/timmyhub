import type { UserDetail, UserPagination, UserSummary } from '@timmyhub/contracts'
import { UserStatus } from '@timmyhub/contracts'

import type { UserWithProfile } from './users.repository'

// Chuyển bản ghi Prisma sang DTO của `@timmyhub/contracts`. Hàm thuần, không phụ thuộc request — nhờ vậy test khẳng
// định được "không trường nhạy cảm nào lọt ra" (REQ-USR-010) mà không cần dựng HTTP.

// Trạng thái quản trị: LOCKED là bị admin khoá (`isBanned` — thứ AuthService.login chặn). `lockedUntil` (tạm khoá do
// đăng nhập sai, REQ-IDN-029) trả riêng, không gộp vào trạng thái này.
export function toUserStatus(isBanned: boolean): UserStatus {
    return isBanned ? UserStatus.LOCKED : UserStatus.ACTIVE
}

export function toUserSummary(user: UserWithProfile): UserSummary {
    return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        status: toUserStatus(user.isBanned),
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        lockedUntil: user.lockedUntil?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        profile: user.profile
            ? {
                  firstName: user.profile.firstName,
                  lastName: user.profile.lastName,
                  displayName: user.profile.displayName,
                  avatar: user.profile.avatar,
              }
            : null,
    }
}

export function toUserDetail(user: UserWithProfile): UserDetail {
    return {
        ...toUserSummary(user),
        isBanned: user.isBanned,
        banReason: user.banReason,
        twoFactorEnabled: user.twoFactorEnabled,
        updatedAt: user.updatedAt.toISOString(),
    }
}

// Hình dạng phân trang của api-conventions §3.2. `page`/`pageSize` đã được zod kẹp biên (1..100) trước khi tới đây.
export function toUserPagination(totalItems: number, page: number, pageSize: number): UserPagination {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    return {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    }
}
