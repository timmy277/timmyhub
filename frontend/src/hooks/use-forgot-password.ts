'use client'

import { useMutation } from '@tanstack/react-query'

import type { ForgotPasswordInput } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import { apiClient } from '@/services'

export function useForgotPassword() {
    return useMutation({
        mutationFn: async (input: ForgotPasswordInput) => {
            const res = await apiClient.post<{ success: true }>(API_ROUTE.AUTH.FORGOT_PASSWORD, input)
            return res.data
        },
    })
}
