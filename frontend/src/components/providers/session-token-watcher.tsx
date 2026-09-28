'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

import { ACCESS_TOKEN_TTL_MS, TOKEN_REFRESH_MARGIN_MS } from '@/constants'
import { setMemoryAccessToken } from '@/services'

// Access token KHÔNG persist ở bất kỳ storage nào (REQ-IDN-022) — nhưng interceptor axios cần Bearer
// token ngay lập tức. Watcher giữ token trong RAM:
// 1) Khi phiên authenticated (và mỗi lần phiên thay đổi), lấy access token từ session vào RAM.
// 2) Đặt lịch gọi getSession() trước khi token hết hạn (trừ margin 30s) — jwt callback phía server thấy
//    token sắp hết hạn sẽ gọi POST v1/auth/refresh, re-issue cookie và trả token mới về session.
// F5 làm mất token RAM nhưng request kế tiếp nhận 401 → interceptor gọi getSession() → server refresh
// → app tự phục hồi, không cần đăng nhập lại.
export function SessionTokenWatcher() {
    // ===== Hooks =====
    const { status, data, update } = useSession()

    // ===== Effects =====
    useEffect(() => {
        if (status === 'unauthenticated') {
            setMemoryAccessToken(null)
            return
        }
        if (status !== 'authenticated') return

        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | null = null

        const pull = async (): Promise<void> => {
            const token = data?.accessToken ?? null
            if (!cancelled) setMemoryAccessToken(token)
            if (cancelled || !token) return

            // Lên lịch làm mới phiên trước khi token hết hạn (margin an toàn).
            const wait = Math.max(ACCESS_TOKEN_TTL_MS - TOKEN_REFRESH_MARGIN_MS, 5_000)
            timer = setTimeout(() => {
                if (cancelled) return
                void update()
            }, wait)
        }

        void pull()

        return () => {
            cancelled = true
            if (timer) clearTimeout(timer)
        }
    }, [status, data, update])

    // ===== Render =====
    return null
}
