// Nguồn duy nhất cho đường dẫn route — nav và link đều lấy từ đây để không lệch với cây `app/`.
export const ROUTE = {
    HOME: '/',
    DASHBOARD: '/dashboard',
    USERS: '/users',
    ROLES: '/roles',
    PERMISSIONS: '/permissions',
    AUDIT: '/audit',
    MEDIA: '/media',
    LOGIN: '/login',
} as const
