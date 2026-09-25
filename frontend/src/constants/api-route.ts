// Nguồn duy nhất cho đường dẫn API backend (CLAUDE.md luật #22) — khớp `AUTH_ROUTE`, `IDENTITY_ROUTE` và
// `@Controller('v1/rbac')` ở backend. Đường dẫn tương đối, chưa gồm base URL; route có tham số là hàm để không ghép
// chuỗi tay ở nơi gọi.
export const API_ROUTE = {
    AUTH: {
        REGISTER: 'v1/auth/register',
        LOGIN: 'v1/auth/login',
        REFRESH: 'v1/auth/refresh',
        LOGOUT: 'v1/auth/logout',
        LOGOUT_ALL: 'v1/auth/logout-all',
    },
    IDENTITY: {
        PING: 'v1/identity/ping',
    },
    RBAC: {
        ROLES: 'v1/rbac/roles',
        ROLE: (roleId: string) => `v1/rbac/roles/${encodeURIComponent(roleId)}`,
        ROLE_PERMISSIONS: (roleId: string) => `v1/rbac/roles/${encodeURIComponent(roleId)}/permissions`,
        PERMISSIONS: 'v1/rbac/permissions',
        PERMISSION: (permissionId: string) => `v1/rbac/permissions/${encodeURIComponent(permissionId)}`,
        USER_ROLES: (userId: string) => `v1/rbac/users/${encodeURIComponent(userId)}/roles`,
        USER_ROLE: (userId: string, roleName: string) =>
            `v1/rbac/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleName)}`,
        USER_PERMISSIONS: (userId: string) => `v1/rbac/users/${encodeURIComponent(userId)}/permissions`,
        USER_EFFECTIVE_PERMISSIONS: (userId: string) =>
            `v1/rbac/users/${encodeURIComponent(userId)}/effective-permissions`,
    },
} as const
