'use client'

import { useMutation } from '@tanstack/react-query'
import { signIn } from 'next-auth/react'

import type { LoginInput } from '@timmyhub/contracts'

import { LoginError } from '@/features/login'

// Đăng nhập qua NextAuth credentials — token do NextAuth ghi vào cookie HttpOnly, client không đụng tới.
// Dùng useMutation chỉ để UI đọc trạng thái isPending; điều hướng tự làm ở onSuccess.
export function useLogin() {
    return useMutation({
        mutationFn: async (input: LoginInput) => {
            const result = await signIn('credentials', {
                ...input,
                redirect: false,
            })
            // redirect:false → signIn trả { error, code } thay vì điều hướng. Ném lỗi kèm MÃ để form phân
            // biệt được sai thông tin đăng nhập / tài khoản bị khoá / BE không phản hồi.
            if (result?.error) throw new LoginError(result.code ?? result.error)
            return result
        },
        onSuccess: () => {
            // Route handler `/api/auth/redirect` đọc roles từ JWT cookie và `redirect()` thẳng đến
            // dashboard (nếu là admin) hoặc trang chủ — browser nhận HTTP 307, không bao giờ render
            // trang home trung gian (BUG cũ: luôn assign('/') rồi home page mới redirect tiếp).
            // `callbackUrl` vẫn qua route handler để server lọc open-redirect (REQ-IDN-033).
            //
            // Cố ý dùng `window.location.assign` thay vì `useRouter().push`: cần full-page navigation
            // để route handler server-side chạy (nó đọc JWT cookie, không thể chạy ở client). Router
            // client-side sẽ render trang nội bộ thay vì gọi route handler GET.
            const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl')
            const params = new URLSearchParams()
            if (callbackUrl && callbackUrl !== '/') params.set('callbackUrl', callbackUrl)
            const query = params.toString()
            const target = query ? `/api/auth/redirect?${query}` : '/api/auth/redirect'
            window.location.assign(target)
        },
    })
}
