// ID cố định cho toast cần cập nhật/đóng từ nơi khác (vd `toast.promise` phải đóng khi component unmount).
export const TOAST_ID = {
    USERS_REFRESH: 'users-refresh',
    RBAC_REFRESH: 'rbac-refresh',
    AUDIT_REFRESH: 'audit-refresh',
} as const
