import { cookies } from 'next/headers'
import { decode } from 'next-auth/jwt'
import { redirect } from 'next/navigation'

import { UserRole } from '@timmyhub/contracts'

import { AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME_SECURE, ROUTE } from '@/constants'
import { resolveSafeCallbackUrl } from '@/utils'

// Route handler server-side quyết định đích sau đăng nhập dựa trên roles trong JWT.
//
// Trước đây `use-login.ts` dùng `window.location.assign('/')` → browser vào `/` (home) → Server Component
// mới gọi `getActor()` (fetch BE lấy permissions) rồi `redirect('/dashboard')` — gây double-hop nhìn thấy
// trang home chớp rồi mới vào dashboard (BUG).
//
// Cách này đọc trực tiếp `roles` từ JWT cookie (đã có sẵn, không cần gọi BE), rồi `redirect()` ngay — browser
// nhận HTTP 307 và follow thẳng đến dashboard, không bao giờ render trang trung gian.
//
// `callbackUrl` vẫn đi qua `resolveSafeCallbackUrl` (REQ-IDN-033 — chống open-redirect). Nếu user vào
// `/login?callbackUrl=/users` thì sau đăng nhập về đúng `/users`, không về dashboard.
//
// Roles admin: SUPER_ADMIN, ADMIN, MODERATOR → có quyền truy cập dashboard (kiểm chi tiết ở admin layout).
// Các role khác (SELLER, BRAND, USER, SHIPPER) → về trang chủ.

type JwtPayload = {
    roles?: string[]
}

const ADMIN_DASHBOARD_ROLES: ReadonlySet<string> = new Set([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR])

export async function GET(request: Request): Promise<Response> {
    const cookieStore = await cookies()

    // Dev dùng cookie thường; production Auth.js tự đổi sang __Secure- (secureCookie theo https).
    const isSecure = cookieStore.get(AUTH_SESSION_COOKIE_NAME_SECURE) != null
    const cookieName = isSecure ? AUTH_SESSION_COOKIE_NAME_SECURE : AUTH_SESSION_COOKIE_NAME
    const rawToken = cookieStore.get(cookieName)?.value

    let roles: string[] = []
    if (rawToken) {
        try {
            const payload = (await decode({
                token: rawToken,
                secret: process.env.AUTH_SECRET ?? '',
                salt: cookieName,
            })) as JwtPayload | null
            roles = Array.isArray(payload?.roles) ? payload.roles : []
        } catch {
            // JWT không giải mã được — coi như không có roles, về trang chủ.
        }
    }

    // callbackUrl từ query — nếu hợp lệ và user đã chỉ định đích (khác trang chủ), ưu tiên theo đó.
    // Nếu callbackUrl là trang chủ '/' (do proxy tự gán khi truy cập URL gốc), admin đi thẳng về dashboard,
    // tránh nhảy qua home rồi mới redirect tiếp (double-hop).
    const url = new URL(request.url)
    const rawCallbackUrl = url.searchParams.get('callbackUrl')
    const effectiveCallbackUrl = rawCallbackUrl === ROUTE.HOME ? null : rawCallbackUrl

    const isAdmin = roles.some((r) => ADMIN_DASHBOARD_ROLES.has(r))
    const fallback = isAdmin ? ROUTE.DASHBOARD : ROUTE.HOME
    const target = resolveSafeCallbackUrl(effectiveCallbackUrl, fallback)

    redirect(target)
}
