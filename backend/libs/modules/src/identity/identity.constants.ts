import * as bcrypt from 'bcryptjs'

import type { PermissionName } from '@timmyhub/contracts'
import { BCRYPT_COST } from '@timmyhub/contracts'

// Hằng số của domain identity (auth + rbac) — coding-standards.md §4.3: không khai báo trong file class.

// ===== Mật khẩu & token =====

// BCRYPT_COST nằm ở @timmyhub/contracts (password-hashing.ts), không ở đây: seed (backend/libs/prisma) cũng phải hash
// cùng cost, mà @timmyhub/prisma không phụ thuộc @timmyhub/modules — ngược lại mới đúng — nên chỉ contracts là chỗ
// chung không tạo vòng phụ thuộc. Re-export để code identity chỉ cần import từ một file hằng số.
export { BCRYPT_COST }

// REQ-IDN-004 / REQ-IDN-029: sai mật khẩu 5 lần liên tiếp → tạm khoá 15 phút.
export const FAILED_LOGIN_LOCK_THRESHOLD = 5
export const LOCK_DURATION_MS = 15 * 60 * 1000
export const ACCOUNT_LOCK_REASON = {
    TOO_MANY_FAILED_LOGINS: 'too-many-failed-logins',
} as const

export const ACCESS_TOKEN_TTL = '15m'
export const ACCESS_TOKEN_ALGORITHM = 'RS256'
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
// REQ-IDN-003: refresh token là chuỗi ngẫu nhiên 256 bit (32 byte), không phải JWT.
export const REFRESH_TOKEN_BYTES = 32

// Hash giả để so sánh khi email không tồn tại — giữ thời gian phản hồi ổn định (security.md §4). Tính một lần lúc
// nạp module (như trước khi tách file), cùng BCRYPT_COST để thời gian compare khớp với hash thật.
export const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', BCRYPT_COST)

export const REGISTERED_VIA = {
    PASSWORD: 'password',
} as const

// ===== RBAC =====

// Cache effective permission in-process — rbac-advanced.md §6 (xem permission-cache.service.ts).
export const PERMISSION_CACHE_TTL_MS = 15 * 60 * 1000

// Dấu phân cách trong tên permission `module:resource:action[:scope]`.
export const PERMISSION_NAME_SEPARATOR = ':'

// Quyền cần có để xem effective permission của người khác (của chính mình luôn được xem).
export const READ_OTHER_USERS_PERMISSION: PermissionName = 'identity:users:read'

// ===== Event nội bộ (EventEmitter2, ADR-0015) =====

export const IDENTITY_EVENT = {
    USER_PINGED: 'identity.user.pinged',
    USER_REGISTERED: 'identity.user.registered',
    USER_LOCKED: 'identity.user.locked',
} as const

// ===== Route =====

export const IDENTITY_ROUTE = {
    ROOT: 'v1/identity',
    PING: 'ping',
} as const

export const AUTH_ROUTE = {
    ROOT: 'v1/auth',
    REGISTER: 'register',
    LOGIN: 'login',
    REFRESH: 'refresh',
    LOGOUT: 'logout',
    LOGOUT_ALL: 'logout-all',
} as const

export const RBAC_ROUTE_PARAM = {
    ROLE_ID: 'roleId',
    PERMISSION_ID: 'permissionId',
    USER_ID: 'userId',
    ROLE_NAME: 'roleName',
} as const

export const RBAC_ROUTE = {
    ROOT: 'v1/rbac',
    ROLES: 'roles',
    ROLE: `roles/:${RBAC_ROUTE_PARAM.ROLE_ID}`,
    ROLE_PERMISSIONS: `roles/:${RBAC_ROUTE_PARAM.ROLE_ID}/permissions`,
    PERMISSIONS: 'permissions',
    PERMISSION: `permissions/:${RBAC_ROUTE_PARAM.PERMISSION_ID}`,
    USER_ROLES: `users/:${RBAC_ROUTE_PARAM.USER_ID}/roles`,
    USER_ROLE: `users/:${RBAC_ROUTE_PARAM.USER_ID}/roles/:${RBAC_ROUTE_PARAM.ROLE_NAME}`,
    USER_PERMISSIONS: `users/:${RBAC_ROUTE_PARAM.USER_ID}/permissions`,
    USER_EFFECTIVE_PERMISSIONS: `users/:${RBAC_ROUTE_PARAM.USER_ID}/effective-permissions`,
} as const

// ===== Lỗi cấu hình =====

// Thông điệp hiển thị cho người dùng nằm ở catalog `@timmyhub/contracts` (i18n/messages.*.ts), ném qua ApiError bằng
// khoá. Ở đây chỉ còn lỗi cấu hình lúc khởi động — dành cho log vận hành, không tới tay người dùng.
export const IDENTITY_CONFIG_ERROR = {
    MISSING_ACCESS_PRIVATE_KEY: 'Thiếu biến môi trường JWT_ACCESS_PRIVATE_KEY',
} as const
