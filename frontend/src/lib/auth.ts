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
                        name: data.user.displayName,
                        image: data.user.avatar,
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
        async jwt({ token, user, trigger, session }) {
            // 1) Đăng nhập thành công — nhét token cấp từ backend vào JWT.
            if (user?.accessToken) {
                token.accessToken = user.accessToken
                token.refreshToken = user.refreshToken
                token.roles = user.roles
                token.name = user.name
                token.email = user.email
                token.picture = user.image
                token.accessExpiresAt = Date.now() + ACCESS_TOKEN_TTL_MS
                return token
            }

            // 2) Client chủ động update (`unstable_update` hoặc `useSession().update(...)`) —
            // 2) Client chủ động update (`unstable_update` hoặc `useSession().update(...)`) —
            //    CHỈ cho phép cập nhật thông tin hiển thị an toàn (name, avatar/image).
            //    TUYỆT ĐỐI không merge roles hay permissions từ client để tránh lỗ hổng nâng quyền.
            if (trigger === 'update' && session) {
                const nextName =
                    (session as { name?: string; user?: { name?: string } }).name ??
                    (session as { user?: { name?: string } }).user?.name
                const nextImage =
                    (session as { image?: string | null; user?: { image?: string | null } }).image ??
                    (session as { user?: { image?: string | null } }).user?.image

                if (typeof nextName === 'string') {
                    token.name = nextName
                }
                if (typeof nextImage === 'string' || nextImage === null) {
                    token.picture = nextImage
                }
                // KHÔNG return token ở đây: tiếp tục để luồng bên dưới kiểm tra refresh token nếu cần
            }

            // 3) Refresh access token bằng refresh token trong JWT.
            //    Chỉ refresh khi token sắp hết hạn hoặc client yêu cầu làm mới phiên (refresh: true).
            //    ĐẶC BIỆT: Chỉ thực hiện xoay refresh token khi trigger === 'update' (tức request chạy qua Route Handler
            //    POST /api/auth/session, nơi mà NextAuth đảm bảo phát sinh header Set-Cookie mới cho browser).
            //    Nếu gọi auth() từ Server Component hoặc Server Action, KHÔNG được tự ý xoay refresh token ở backend
            //    vì RSC là read-only đối với cookie — token mới sẽ bị rớt lại server, browser vẫn giữ token cũ,
            //    dẫn đến lần gọi sau backend phát hiện token cũ bị dùng lại (wasRotatedBefore) và kích hoạt
            //    REQ-IDN-006 thu hồi toàn bộ phiên của người dùng!
            const expiresAt = token.accessExpiresAt ?? 0
            const isExpiringSoon = Date.now() >= expiresAt - TOKEN_REFRESH_MARGIN_MS
            const isForcedRefresh = trigger === 'update' && Boolean((session as { refresh?: boolean })?.refresh)

            if (!token.refreshToken || (!isExpiringSoon && !isForcedRefresh)) {
                return token
            }

            // Nếu không phải là client trigger update (ví dụ RSC hoặc Server Action gọi auth()):
            // Giữ nguyên token hiện tại, nhường quyền xoay token cho SessionTokenWatcher / apiClient refresh qua POST /api/auth/session.
            if (trigger !== 'update') {
                return token
            }

            const refreshed = await callBackend(API_ROUTE.AUTH.REFRESH, { refreshToken: token.refreshToken })
            if (refreshed.ok) {
                const data = refreshed.data
                token.accessToken = data.accessToken
                token.refreshToken = data.refreshToken
                token.roles = data.user.roles
                token.name = data.user.displayName
                token.email = data.user.email
                token.picture = data.user.avatar
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
            // hướng về /login. Trả về null để @auth/core xoá cookie khỏi browser (sessionStore.clean()).
            return null
        },
        // session() bóc dữ liệu an toàn ra cho client — refresh token VÀ roles KHÔNG bao giờ qua session
        // client (REQ-IDN-023: client JS không được đọc roles/permissions; UI cần quyền thì render từ
        // Server Component hoặc hỏi API). Server cần roles đọc thẳng JWT qua `decode` (xem actions.ts).
        // Access token đi kèm để SessionTokenWatcher giữ trong RAM cho interceptor; sống 15 phút, không
        // persist vào storage nào — cookie thật vẫn là bản mã hoá HttpOnly.
        session({ session, token }) {
            if (token.sub) session.user.id = token.sub
            if (token.accessToken) session.accessToken = token.accessToken
            if (token.accessExpiresAt) session.accessExpiresAt = token.accessExpiresAt
            if (token.name !== undefined) session.user.name = token.name
            if (token.email) session.user.email = token.email
            if (token.picture !== undefined) session.user.image = token.picture
            return session
        },
    },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(authConfig)
