import type { UserRole } from '@timmyhub/prisma'

// Payload đã xác thực gắn vào request.user sau JwtAuthGuard — không bao giờ chứa permission (rbac-advanced.md §6:
// permission không được nhúng vào JWT, nếu không việc thu hồi phải chờ token hết hạn).
export type AuthUser = {
    id: string
    email: string
    roles: UserRole[]
}

declare module 'express' {
    interface Request {
        user?: AuthUser
    }
}
