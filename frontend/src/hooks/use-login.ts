'use client'

import { useMutation } from '@tanstack/react-query'
import { signIn } from 'next-auth/react'

import type { LoginInput } from '@timmyhub/contracts'

import { ROUTE } from '@/constants'
import { LoginError } from '@/features/login'
import { resolveSafeCallbackUrl } from '@/utils'

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
            // `callbackUrl` đã được lọc open-redirect ở `resolveSafeCallbackUrl` (REQ-IDN-033); giá trị
            // không hợp lệ hoặc không có thì về trang chủ. Locale đi theo cookie, không mang trên URL.
            const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl')
            window.location.assign(resolveSafeCallbackUrl(callbackUrl, ROUTE.HOME))
        },
    })
}
