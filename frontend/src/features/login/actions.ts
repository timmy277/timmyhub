'use server'

import { cookies } from 'next/headers'
import { decode } from 'next-auth/jwt'

import { API_BASE_URL, API_ROUTE, AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME_SECURE } from '@/constants'

// Server action thu hồi phiên ở backend: decode JWT từ cookie (chỉ server giải mã được — JWE) để lấy
// refresh token rồi gọi POST /v1/auth/logout (REQ-IDN-007 — chỉ xoá cookie thôi thì refresh token vẫn
// ACTIVE 30 ngày trong DB, bản sao cookie bị đánh cắp trước đó vẫn dùng được).
// Việc xoá cookie + reset SessionProvider do phía client làm qua signOut() của next-auth/react — server
// action không reset được state phía client.
export async function revokeSessionAction(): Promise<void> {
    const cookieStore = await cookies()

    // Dev dùng cookie thường; production Auth.js tự đổi sang __Secure- (secureCookie theo https).
    const isSecure = cookieStore.get(AUTH_SESSION_COOKIE_NAME_SECURE) != null
    const cookieName = isSecure ? AUTH_SESSION_COOKIE_NAME_SECURE : AUTH_SESSION_COOKIE_NAME
    const rawToken = cookieStore.get(cookieName)?.value
    if (!rawToken) return

    try {
        // Salt giải mã JWT của Auth.js = tên cookie phiên (jwt.js: salt = cookieName).
        const payload = await decode({
            token: rawToken,
            secret: process.env.AUTH_SECRET ?? '',
            salt: cookieName,
        })
        const refreshToken = payload?.refreshToken
        if (typeof refreshToken !== 'string') return

        // Thu hồi phiên ở BE — lỗi (token đã hết hạn, BE sập…) không chặn việc xoá cookie phía client.
        await fetch(`${API_BASE_URL}/${API_ROUTE.AUTH.LOGOUT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        }).catch(() => undefined)
    } catch {
        // JWT không giải mã được (đổi AUTH_SECRET…) — bỏ qua, cookie sẽ bị xoá bởi signOut phía client.
    }
}
