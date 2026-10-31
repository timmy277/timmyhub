'use client'

import { useMutation } from '@tanstack/react-query'

import type { ResetPasswordInput } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import { apiClient } from '@/services'

export function useResetPassword() {
    return useMutation({
        mutationFn: async (input: ResetPasswordInput) => {
            const res = await apiClient.post<{ success: true }>(API_ROUTE.AUTH.RESET_PASSWORD, input)
            return res.data
        },
    })
}
