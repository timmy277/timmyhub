'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

import type { NotificationPreferencesDto, UpdateNotificationPreferencesInput } from '@timmyhub/contracts'

import { API_ROUTE, QUERY_KEY } from '@/constants'
import { apiClient } from '@/services'

export function useNotificationPreferences() {
    const { data: session } = useSession()
    const isAuthenticated = Boolean(session?.user?.id)

    return useQuery({
        queryKey: QUERY_KEY.NOTIFICATION.PREFERENCES,
        queryFn: async () => {
            const res = await apiClient.get<NotificationPreferencesDto>(API_ROUTE.NOTIFICATION.PREFERENCES)
            return res.data
        },
        enabled: isAuthenticated,
        staleTime: 60_000,
    })
}

export function useUpdateNotificationPreferences() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UpdateNotificationPreferencesInput) => {
            const res = await apiClient.patch<NotificationPreferencesDto>(API_ROUTE.NOTIFICATION.PREFERENCES, input)
            return res.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(QUERY_KEY.NOTIFICATION.PREFERENCES, data)
        },
    })
}
