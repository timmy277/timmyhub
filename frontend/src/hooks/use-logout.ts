'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

import { revokeSessionAction } from '@/features/login'

// Đăng xuất: signOut() của next-auth/react chạy POST /api/auth/signout — NextAuth xoá cookie phiên
// HttpOnly VÀ reset SessionProvider về 'unauthenticated' (server action không reset được state client).
// revokeSessionAction thu hồi refresh token ở BE trước (REQ-IDN-007). onSettled luôn điều hướng về login.
export function useLogout() {
    // ===== Hooks =====
    const router = useRouter()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            // Thu hồi phiên ở BE — lỗi cũng không chặn việc xoá cookie bên dưới.
            await revokeSessionAction().catch(() => undefined)
            // Xoá cookie HttpOnly + reset SessionProvider (status → 'unauthenticated').
            await signOut({ redirect: false })
            queryClient.clear()
        },
        onSettled: () => {
            router.push('/login')
        },
    })
}
