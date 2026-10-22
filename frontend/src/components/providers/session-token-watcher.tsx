'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

import { ACCESS_TOKEN_TTL_MS, TOKEN_REFRESH_MARGIN_MS } from '@/constants'
import { setMemoryAccessToken } from '@/services'
import { withAuthRefreshLock } from '@/utils'

// Access token KHÔNG persist ở bất kỳ storage nào (REQ-IDN-022) — nhưng interceptor axios cần Bearer
// token ngay lập tức. Watcher giữ token trong RAM:
// 1) Khi phiên authenticated (và mỗi lần phiên thay đổi), lấy access token từ session vào RAM.
// 2) Đặt lịch gọi update({ refresh: true }) trước khi token hết hạn (trừ margin 30s) — jwt callback
//    phía server thấy trigger === 'update' sẽ gọi POST v1/auth/refresh, re-issue cookie và trả token mới về session.
// F5 làm mất token RAM nhưng request kế tiếp nhận 401 → interceptor gọi refreshSession() → server refresh
// → app tự phục hồi, không cần đăng nhập lại.
export function SessionTokenWatcher() {
    // ===== Hooks =====
    const { status, data, update } = useSession()
    const updateRef = useRef(update)

    useEffect(() => {
        updateRef.current = update
    }, [update])

    // ===== Effects =====
    useEffect(() => {
        if (status === 'unauthenticated') {
            setMemoryAccessToken(null)
            return
        }
        if (status !== 'authenticated') return

        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | null = null

        const token = data?.accessToken ?? null
        if (token) setMemoryAccessToken(token)
        if (!token) return

        // Tính thời gian chờ chính xác dựa trên accessExpiresAt trả về từ session
        const now = Date.now()
        const expiresAt = data.accessExpiresAt ?? now + ACCESS_TOKEN_TTL_MS
        const remainingMs = expiresAt - now
        // Đặt lịch trước khi token hết hạn (trừ margin), tối thiểu 5s nếu token sắp hết hạn
        const wait = Math.max(remainingMs - TOKEN_REFRESH_MARGIN_MS, 5_000)

        timer = setTimeout(() => {
            if (cancelled) return
            void withAuthRefreshLock(async () => {
                await updateRef.current({ refresh: true })
            })
        }, wait)

        return () => {
            cancelled = true
            if (timer) clearTimeout(timer)
        }
    }, [status, data?.accessToken, data?.accessExpiresAt])

    // ===== Render =====
    return null
}
