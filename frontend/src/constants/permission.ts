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

// Quyền quản lý duyệt đơn đăng ký người bán — dành cho ADMIN
export const SELLER_APPLICATIONS_PERMISSION = 'seller:applications:list' as const satisfies PermissionName

// Quyền tra cứu nhật ký kiểm toán nằm ở `constants/audit.ts` (AUDIT_PERMISSION.LIST).

// Quyền quản lý shop của người bán — SELLER, BRAND có `seller:shops:update`.
export const SELLER_SHOP_PERMISSION = 'seller:shops:update' as const satisfies PermissionName
export const SELLER_SHOP_ANY_PERMISSION = 'seller:shops:update:any' as const satisfies PermissionName

// Quyền quản lý sản phẩm phía Người bán (Seller)
export const SELLER_PRODUCT_PERMISSION = {
    LIST: 'catalog:products:read',
    READ: 'catalog:products:read',
    CREATE: 'catalog:products:create',
    UPDATE: 'catalog:products:update',
    DELETE: 'catalog:products:delete',
    SUSPEND: 'catalog:products:suspend',
    RESTORE: 'catalog:products:restore',
} as const satisfies Record<string, PermissionName>

export type SellerProductPermissionKey = keyof typeof SELLER_PRODUCT_PERMISSION
export type SellerProductPermissionFlags = Record<SellerProductPermissionKey, boolean>

export function toSellerProductPermissionFlags(permissions: ReadonlySet<string>): SellerProductPermissionFlags {
    return {
        LIST: permissions.has(SELLER_PRODUCT_PERMISSION.LIST),
        READ: permissions.has(SELLER_PRODUCT_PERMISSION.READ),
        CREATE: permissions.has(SELLER_PRODUCT_PERMISSION.CREATE),
        UPDATE: permissions.has(SELLER_PRODUCT_PERMISSION.UPDATE),
        DELETE: permissions.has(SELLER_PRODUCT_PERMISSION.DELETE),
        SUSPEND: permissions.has(SELLER_PRODUCT_PERMISSION.SUSPEND),
        RESTORE: permissions.has(SELLER_PRODUCT_PERMISSION.RESTORE),
    }
}

// Quyền quản lý sản phẩm phía Quản trị viên (Admin / Moderator)
export const ADMIN_PRODUCT_PERMISSION = {
    LIST: 'catalog:products:list:any',
    READ: 'catalog:products:read:any',
    APPROVE: 'catalog:products:approve',
    REJECT: 'catalog:products:reject',
    UPDATE: 'catalog:products:update:any',
    DELETE: 'catalog:products:delete:any',
    SUSPEND: 'catalog:products:suspend:any',
    RESTORE: 'catalog:products:restore:any',
} as const satisfies Record<string, PermissionName>

export type AdminProductPermissionKey = keyof typeof ADMIN_PRODUCT_PERMISSION
export type AdminProductPermissionFlags = Record<AdminProductPermissionKey, boolean>

export function toAdminProductPermissionFlags(permissions: ReadonlySet<string>): AdminProductPermissionFlags {
    return {
        LIST: permissions.has(ADMIN_PRODUCT_PERMISSION.LIST),
        READ: permissions.has(ADMIN_PRODUCT_PERMISSION.READ),
        APPROVE: permissions.has(ADMIN_PRODUCT_PERMISSION.APPROVE),
        REJECT: permissions.has(ADMIN_PRODUCT_PERMISSION.REJECT),
        UPDATE: permissions.has(ADMIN_PRODUCT_PERMISSION.UPDATE),
        DELETE: permissions.has(ADMIN_PRODUCT_PERMISSION.DELETE),
        SUSPEND: permissions.has(ADMIN_PRODUCT_PERMISSION.SUSPEND),
        RESTORE: permissions.has(ADMIN_PRODUCT_PERMISSION.RESTORE),
    }
}

export const CATALOG_PRODUCTS_ADMIN_PERMISSION = ADMIN_PRODUCT_PERMISSION.LIST
export const CATALOG_PRODUCTS_SELLER_PERMISSION = SELLER_PRODUCT_PERMISSION.CREATE
