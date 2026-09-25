// Token DI cho PermissionResolver (interfaces/permission-resolver.interface.ts). Symbol thay vì class để guard không
// phải import RbacService của identity; IdentityModule đăng ký `{ provide: PERMISSION_RESOLVER, useExisting: RbacService }`.
// Symbol.for (registry toàn cục) chứ không Symbol(): identity lấy token qua self-reference '@timmyhub/modules/platform/auth'
// còn guard lấy qua đường tương đối — nếu hai đường nạp ra hai bản module (vd. test map src, app chạy dist) thì
// Symbol() sẽ khác nhau và DI không khớp.
export const PERMISSION_RESOLVER = Symbol.for('timmyhub.platform.auth.PERMISSION_RESOLVER')

export const BEARER_PREFIX = 'Bearer '
export const ACCESS_TOKEN_VERIFY_ALGORITHM = 'RS256'

// Thông điệp cho người dùng đi qua khoá `auth.*` / `error.*` của catalog contracts; ở đây chỉ còn lỗi cấu hình (log).
export const AUTH_CONFIG_ERROR = {
    MISSING_ACCESS_PUBLIC_KEY: 'Thiếu biến môi trường JWT_ACCESS_PUBLIC_KEY',
} as const
