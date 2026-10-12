'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { QUERY_KEY } from '@/constants'
import { getSession } from '@/lib/auth-session'

// Đã đăng nhập mà vẫn vào /login (gõ tay, bookmark, back sau logout…) → chuyển ngay về đích cũ.
// Dùng getSession() (fetch mới /api/auth/session mỗi lần) thay vì useSession() (đọc cache của
// SessionProvider): cache cũ có thể vẫn báo 'authenticated' trong khi phiên phía server đã chết —
// tin cache là lặp redirect vô hạn /users ↔ /login (layout đá về /login, component đá lại /users).
export function RedirectIfAuthenticated() {
    // ===== Hooks =====
    const router = useRouter()
    const { data: session, isFetchedAfterMount } = useQuery({
        queryKey: QUERY_KEY.AUTH.SESSION,
        queryFn: () => getSession(),
        staleTime: 0,
        refetchOnMount: 'always',
        retry: false,
    })

    // ===== Effects =====
    useEffect(() => {
        if (!isFetchedAfterMount || !session?.user?.id) return

        // Route handler `/api/auth/redirect` đọc roles từ JWT và redirect thẳng — không double-hop
        // qua home page nữa. `callbackUrl` vẫn qua server để lọc open-redirect (REQ-IDN-033).
        const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl')
        const params = new URLSearchParams()
        if (callbackUrl && callbackUrl !== '/') params.set('callbackUrl', callbackUrl)
        const query = params.toString()
        router.replace(query ? `/api/auth/redirect?${query}` : '/api/auth/redirect')
    }, [isFetchedAfterMount, router, session?.user?.id])

    // ===== Render =====
    return null
}
