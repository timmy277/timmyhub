import { z } from 'zod'

// Vai trò hệ thống — nguồn duy nhất cho FE, BE và seed (CLAUDE.md luật #23). Enum Prisma `UserRole` phải khớp tập này.
// Người mua gọi là USER (không còn CUSTOMER) để FE, BE và tài liệu dùng chung một tên.
export const UserRole = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MODERATOR: 'MODERATOR',
    SELLER: 'SELLER',
    BRAND: 'BRAND',
    USER: 'USER',
    SHIPPER: 'SHIPPER',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

// Thứ tự hiển thị: quyền cao trước.
export const USER_ROLES = Object.values(UserRole) as [UserRole, ...UserRole[]]

export const UserRoleSchema = z.enum(UserRole)

// SUPER_ADMIN bypass lớp 1-2 (rbac-advanced.md §8) — mọi nơi kiểm tra bypass đi qua hàm này, không so chuỗi trần.
export function isSuperAdmin(roles: readonly string[]): boolean {
    return roles.includes(UserRole.SUPER_ADMIN)
}
