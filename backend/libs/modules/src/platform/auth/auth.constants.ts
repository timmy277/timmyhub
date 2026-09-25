// Token DI cho PermissionResolver (interfaces/permission-resolver.interface.ts). Symbol thay vì class để guard không
// phải import RbacService của identity; IdentityModule đăng ký `{ provide: PERMISSION_RESOLVER, useExisting: RbacService }`.
// Symbol.for (registry toàn cục) chứ không Symbol(): identity lấy token qua self-reference '@timmyhub/modules/platform/auth'
// còn guard lấy qua đường tương đối — nếu hai đường nạp ra hai bản module (vd. test map src, app chạy dist) thì
// Symbol() sẽ khác nhau và DI không khớp.
export const PERMISSION_RESOLVER = Symbol.for('timmyhub.platform.auth.PERMISSION_RESOLVER')

export const BEARER_PREFIX = 'Bearer '
export const ACCESS_TOKEN_VERIFY_ALGORITHM = 'RS256'

export const AUTH_GUARD_MESSAGE = {
    UNAUTHENTICATED: 'Chưa xác thực.',
    MISSING_ACCESS_TOKEN: 'Thiếu access token.',
    INVALID_ACCESS_TOKEN: 'Access token không hợp lệ hoặc đã hết hạn.',
    MISSING_ACCESS_PUBLIC_KEY: 'Thiếu biến môi trường JWT_ACCESS_PUBLIC_KEY',
    FORBIDDEN_ROLE: 'Không có quyền truy cập tài nguyên này.',
    FORBIDDEN_PERMISSION: 'Không có quyền thực hiện thao tác này.',
} as const
