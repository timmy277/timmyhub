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

// Quyền của màn quản trị vai trò/quyền. Cùng khuôn với `USER_PERMISSION`: `satisfies` biến tên gõ sai thành lỗi biên
// dịch. Không khai `rbac:permissions:update` vì backend chưa có endpoint sửa permission — cờ không dùng là cờ chết.
export const RBAC_PERMISSION = {
    ROLES_LIST: 'rbac:roles:list',
    ROLES_READ: 'rbac:roles:read',
    ROLES_CREATE: 'rbac:roles:create',
    ROLES_UPDATE: 'rbac:roles:update',
    ROLES_DELETE: 'rbac:roles:delete',
    PERMISSIONS_LIST: 'rbac:permissions:list',
    PERMISSIONS_READ: 'rbac:permissions:read',
    PERMISSIONS_CREATE: 'rbac:permissions:create',
    PERMISSIONS_DELETE: 'rbac:permissions:delete',
    ROLE_PERMISSIONS_ASSIGN: 'rbac:role-permissions:assign',
} as const satisfies Record<string, PermissionName>

export type RbacPermissionKey = keyof typeof RBAC_PERMISSION
export type RbacPermissionFlags = Record<RbacPermissionKey, boolean>

export function toRbacPermissionFlags(permissions: ReadonlySet<string>): RbacPermissionFlags {
    return {
        ROLES_LIST: permissions.has(RBAC_PERMISSION.ROLES_LIST),
        ROLES_READ: permissions.has(RBAC_PERMISSION.ROLES_READ),
        ROLES_CREATE: permissions.has(RBAC_PERMISSION.ROLES_CREATE),
        ROLES_UPDATE: permissions.has(RBAC_PERMISSION.ROLES_UPDATE),
        ROLES_DELETE: permissions.has(RBAC_PERMISSION.ROLES_DELETE),
        PERMISSIONS_LIST: permissions.has(RBAC_PERMISSION.PERMISSIONS_LIST),
        PERMISSIONS_READ: permissions.has(RBAC_PERMISSION.PERMISSIONS_READ),
        PERMISSIONS_CREATE: permissions.has(RBAC_PERMISSION.PERMISSIONS_CREATE),
        PERMISSIONS_DELETE: permissions.has(RBAC_PERMISSION.PERMISSIONS_DELETE),
        ROLE_PERMISSIONS_ASSIGN: permissions.has(RBAC_PERMISSION.ROLE_PERMISSIONS_ASSIGN),
    }
}

// Quyền xem dashboard / báo cáo toàn sàn — chỉ ADMIN+ mới có `analytics:platform:read`.
export const DASHBOARD_PERMISSION = 'analytics:platform:read' as const satisfies PermissionName
