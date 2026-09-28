'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { ROUTE } from '@/constants'
import { getSession } from '@/lib/auth-session'
import { resolveSafeCallbackUrl } from '@/utils'

// Đã đăng nhập mà vẫn vào /login (gõ tay, bookmark, back sau logout…) → chuyển ngay về đích cũ.
// Dùng getSession() (fetch mới /api/auth/session mỗi lần) thay vì useSession() (đọc cache của
// SessionProvider): cache cũ có thể vẫn báo 'authenticated' trong khi phiên phía server đã chết —
// tin cache là lặp redirect vô hạn /users ↔ /login (layout đá về /login, component đá lại /users).
export function RedirectIfAuthenticated() {
    // ===== Hooks =====
    const router = useRouter()

    // ===== Effects =====
    useEffect(() => {
        let cancelled = false

        void (async () => {
            const session = await getSession()
            if (cancelled || !session?.user?.id) return

            // `callbackUrl` đã được lọc open-redirect ở `resolveSafeCallbackUrl` (REQ-IDN-033).
            const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl')
            router.replace(resolveSafeCallbackUrl(callbackUrl, ROUTE.HOME))
        })()

        return () => {
            cancelled = true
        }
    }, [router])

    // ===== Render =====
    return null
}
