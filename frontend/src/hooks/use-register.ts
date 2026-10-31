'use client'

import { useMutation } from '@tanstack/react-query'
import { signIn } from 'next-auth/react'

import type { RegisterFormInput } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import { apiClient } from '@/services'

export function useRegister() {
    return useMutation({
        mutationFn: async (input: RegisterFormInput) => {
            const payload = {
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.email,
                password: input.password,
            }
            const res = await apiClient.post<{ userId: string; email: string }>(API_ROUTE.AUTH.REGISTER, payload)

            // Đăng nhập tự động ngay sau khi tạo tài khoản thành công
            const loginRes = await signIn('credentials', {
                email: input.email,
                password: input.password,
                redirect: false,
            })

            return { registerData: res.data, loginRes }
        },
        onSuccess: () => {
            const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl')
            const params = new URLSearchParams()
            if (callbackUrl && callbackUrl !== '/') params.set('callbackUrl', callbackUrl)
            const query = params.toString()
            const target = query ? `/api/auth/redirect?${query}` : '/api/auth/redirect'
            window.location.assign(target)
        },
    })
}
