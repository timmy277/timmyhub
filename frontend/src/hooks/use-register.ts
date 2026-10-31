'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import type { RegisterFormInput } from '@timmyhub/contracts'

import { API_ROUTE, ROUTE } from '@/constants'
import { apiClient } from '@/services'

export function useRegister() {
    const router = useRouter()

    return useMutation({
        mutationFn: async (input: RegisterFormInput) => {
            const payload = {
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.email,
                password: input.password,
            }
            const res = await apiClient.post<{ userId: string; email: string }>(API_ROUTE.AUTH.REGISTER, payload)
            return res.data
        },
        onSuccess: (_data, variables) => {
            const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl')
            const params = new URLSearchParams()
            if (callbackUrl && callbackUrl !== '/') params.set('callbackUrl', callbackUrl)
            if (variables.email) params.set('email', variables.email)
            const query = params.toString()
            const target = query ? `${ROUTE.LOGIN}?${query}` : ROUTE.LOGIN
            router.push(target)
        },
    })
}
