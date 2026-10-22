import type { UserRole } from '@timmyhub/contracts'
import type { DefaultSession } from 'next-auth'

// Augment kiểu NextAuth — phiên của dự án: JWT mang access/refresh token + roles (mã hoá trong cookie
// HttpOnly). Session phía client chỉ bóc dữ liệu an toàn: id, email và access token (giữ trong RAM bởi
// SessionTokenWatcher để interceptor gắn Bearer — không persist vào localStorage/cookie thường).
// Refresh token VÀ roles KHÔNG bao giờ ra khỏi server (REQ-IDN-022 / REQ-IDN-023 — UI cần quyền thì
// Server Component đọc JWT qua decode ở server, client không thấy roles).
declare module 'next-auth' {
    interface User {
        accessToken?: string
        refreshToken?: string
        roles?: UserRole[]
        displayName?: string | null
        avatar?: string | null
    }

    interface Session {
        accessToken?: string
        accessExpiresAt?: number
        user: {
            id: string
        } & DefaultSession['user']
    }
}

// Interface `JWT` khai báo thật ở `@auth/core/jwt` — `next-auth/jwt` chỉ `export *`, augmentation
// TypeScript không ăn qua re-export nên phải augment đúng module khai báo.
declare module '@auth/core/jwt' {
    interface JWT {
        accessToken?: string
        refreshToken?: string
        roles?: UserRole[]
        name?: string | null
        email?: string | null
        picture?: string | null
        /** Thời điểm access token hết hạn (epoch ms) — jwt callback dùng để chủ động refresh trước hạn. */
        accessExpiresAt?: number
    }
}
