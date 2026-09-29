import type { PermissionName } from '@timmyhub/contracts'

// Quyền giao diện cần biết để ẩn/hiện nút. Tên phải khớp `PERMISSION_DEFINITIONS` của `@timmyhub/contracts`
// (docs/00-overview/roles-and-permissions.md §4.1) — `satisfies Record<string, PermissionName>` biến việc gõ sai
// thành lỗi biên dịch, không phải lỗi 403 lúc chạy.
export const USER_PERMISSION = {
    LIST: 'identity:users:list',
    READ: 'identity:users:read',
    CREATE: 'identity:users:create',
    UPDATE: 'identity:users:update',
    DELETE: 'identity:users:delete',
    LOCK: 'identity:users:lock',
    ASSIGN_ROLE: 'identity:users:assign-role',
} as const satisfies Record<string, PermissionName>

export type UserPermissionKey = keyof typeof USER_PERMISSION

// Quyền hiệu lực của người đang đăng nhập, rút gọn thành cờ mà giao diện dùng — Server Component tính một lần rồi
// truyền xuống client (REQ-IDN-023: client JS không đọc được role/permission).
export type UserPermissionFlags = Record<UserPermissionKey, boolean>

export function toUserPermissionFlags(permissions: ReadonlySet<string>): UserPermissionFlags {
    return {
        LIST: permissions.has(USER_PERMISSION.LIST),
        READ: permissions.has(USER_PERMISSION.READ),
        CREATE: permissions.has(USER_PERMISSION.CREATE),
        UPDATE: permissions.has(USER_PERMISSION.UPDATE),
        DELETE: permissions.has(USER_PERMISSION.DELETE),
        LOCK: permissions.has(USER_PERMISSION.LOCK),
        ASSIGN_ROLE: permissions.has(USER_PERMISSION.ASSIGN_ROLE),
    }
}
