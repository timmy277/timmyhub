import NextAuth, { CredentialsSignin, type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import type { AuthResult, LoginInput } from '@timmyhub/contracts'
import { LoginSchema } from '@timmyhub/contracts'

import {
    ACCESS_TOKEN_TTL_MS,
    API_BASE_URL,
    API_ROUTE,
    BACKEND_UNAVAILABLE_CODE,
    SESSION_MAX_AGE_SECONDS,
    TOKEN_REFRESH_MARGIN_MS,
} from '@/constants'

// Cấu hình NextAuth v5 (ADR-0005). Phiên là JWT mã hoá JWE (A256CBC-HS512) trong cookie HttpOnly — access/
// refresh token của backend sống trong JWT này, KHÔNG persist vào localStorage/cookie thường (REQ-IDN-022 /
// REQ-IDN-023). File này chỉ được import từ Server Component / Route Handler / proxy; phía client dùng
// `next-auth/react` qua `@/lib/auth-session`.

// Kết quả gọi backend: hàm này KHÔNG bao giờ throw, để `authorize` và jwt callback phân biệt được ba tình
// huống khác nhau — token bị từ chối (401), backend không phản hồi (status 0), backend lỗi (5xx).
type BackendAuthResult = { ok: true; data: AuthResult } | { ok: false; status: number; code?: string }

// Gọi backend bằng fetch thuần (không axios) để file gọn nhẹ khi bundle vào edge runtime của proxy.
async function callBackend<B>(path: string, body: B): Promise<BackendAuthResult> {
    let response: Response
    try {
        response = await fetch(`${API_BASE_URL}/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    } catch {
        // Backend không chạy / mạng lỗi — status 0, tách hẳn khỏi 401 (token bị từ chối).
        return { ok: false, status: 0, code: BACKEND_UNAVAILABLE_CODE }
    }

    if (!response.ok) {
        // Body lỗi theo khung ApiExceptionFilter: { error: { code, messageKey, … } }.
        try {
            const body = (await response.json()) as { error?: { code?: string } }
            return { ok: false, status: response.status, code: body.error?.code }
        } catch {
            return { ok: false, status: response.status }
        }
    }

    try {
        return { ok: true, data: (await response.json()) as AuthResult }
    } catch {
        return { ok: false, status: response.status, code: BACKEND_UNAVAILABLE_CODE }
    }
}

// `CredentialsSignin.code` là thứ NextAuth đưa vào query param `code` của URL callback (`@auth/core`
// index.js: `params.set("code", error.code)`), rồi `next-auth/react` trả lại trong kết quả `signIn(...)`.
// Base class luôn gán `code = 'credentials'` nên phải ghi đè SAU khi gọi super.
// ⚠ Chỉ truyền MÃ (INVALID_CREDENTIALS, ACCOUNT_LOCKED…), không kèm chi tiết — giá trị này đi vào URL.
class LoginRejectedError extends CredentialsSignin {
    constructor(code: string) {
        super()
        this.code = code
    }
}

export const authConfig = {
    // JWT strategy — phiên là JWT mã hoá trong cookie HttpOnly, client script không đọc được.
    session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    providers: [
        Credentials({
            // Schema validate đến từ @timmyhub/contracts — Zod là nguồn validation duy nhất (luật #15).
            credentials: { email: {}, password: {} },
            authorize: async (credentials) => {
                const parsed = LoginSchema.safeParse(credentials)
                if (!parsed.success) return null

                const input: LoginInput = parsed.data
                const result = await callBackend(API_ROUTE.AUTH.LOGIN, input)
                if (result.ok) {
                    const data = result.data
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        roles: data.user.roles,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                    }
                }

                // Ném mã lỗi của backend để UI báo đúng: sai thông tin đăng nhập (INVALID_CREDENTIALS),
                // tài khoản bị khoá (ACCOUNT_LOCKED), bị ban (ACCOUNT_BANNED), hay backend không chạy.
                throw new LoginRejectedError(result.code ?? BACKEND_UNAVAILABLE_CODE)
            },
        }),
    ],
    callbacks: {
        // jwt() chạy lúc đăng nhập (user được cấp), lúc client chủ động update, và mỗi lần đọc phiên.
        // Access/refresh token + roles sống trong JWT này — cookie mã hoá HttpOnly, script không đọc được.
        async jwt({ token, user }) {
            // 1) Đăng nhập thành công — nhét token cấp từ backend vào JWT.
            if (user?.accessToken) {
                token.accessToken = user.accessToken
                token.refreshToken = user.refreshToken
                token.roles = user.roles
                token.accessExpiresAt = Date.now() + ACCESS_TOKEN_TTL_MS
                return token
            }

            // 2) Client chủ động update (`unstable_update`) — CHỈ re-sign JWT (để làm mới hạn phiên),
            //    tuyệt đối không merge dữ liệu từ client: cho phép ghi đè roles từ ngoài là lỗ hổng
            //    nâng quyền. Phiên cũ được giữ nguyên trong token.

            // 3) Access token sắp hết hạn → refresh server-side bằng refresh token trong JWT.
            //    `accessExpiresAt` chỉ mang MỘT nghĩa: hạn của access token. Việc chống race đa tab nằm ở
            //    phía client (`withAuthRefreshLock`) nên hai tab không bao giờ refresh cùng lúc — server
            //    không phải đoán xem một lần dùng lại token là race hợp lệ hay là token bị đánh cắp.
            const expiresAt = token.accessExpiresAt ?? 0
            if (!token.refreshToken || Date.now() < expiresAt - TOKEN_REFRESH_MARGIN_MS) {
                return token
            }

            const refreshed = await callBackend(API_ROUTE.AUTH.REFRESH, { refreshToken: token.refreshToken })
            if (refreshed.ok) {
                const data = refreshed.data
                token.accessToken = data.accessToken
                token.refreshToken = data.refreshToken
                token.roles = data.user.roles
                token.accessExpiresAt = Date.now() + ACCESS_TOKEN_TTL_MS
                return token
            }

            // Backend không phản hồi hoặc lỗi 5xx — KHÔNG phải token bị từ chối: giữ nguyên phiên và thử
            // lại ở lần đọc session sau. Đăng xuất người dùng vì backend sập một nhịp là sai.
            if (refreshed.status !== 401) {
                return token
            }

            // Backend đã từ chối refresh token (REQ-IDN-006): REUSED (bị đánh cắp), EXPIRED hoặc INVALID.
            // Phiên hết hiệu lực thật → xoá sạch token để mọi lần đọc session sau trả null và proxy điều
            // hướng về /login. KHÔNG giữ lại token cũ: `@auth/core` re-issue cookie ở mỗi lần đọc session,
            // nên giữ lại là ghi đè refresh token (có thể đã bị xoay ở tab khác) vào cookie jar dùng chung.
            return {}
        },
        // session() bóc dữ liệu an toàn ra cho client — refresh token VÀ roles KHÔNG bao giờ qua session
        // client (REQ-IDN-023: client JS không được đọc roles/permissions; UI cần quyền thì render từ
        // Server Component hoặc hỏi API). Server cần roles đọc thẳng JWT qua `decode` (xem actions.ts).
        // Access token đi kèm để SessionTokenWatcher giữ trong RAM cho interceptor; sống 15 phút, không
        // persist vào storage nào — cookie thật vẫn là bản mã hoá HttpOnly.
        session({ session, token }) {
            if (token.sub) session.user.id = token.sub
            if (token.accessToken) session.accessToken = token.accessToken
            return session
        },
    },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(authConfig)
