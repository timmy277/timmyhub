'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { NotificationListResponseDto, UnreadCountResponseDto } from '@timmyhub/contracts'

import { API_ROUTE, QUERY_KEY } from '@/constants'
import { apiClient } from '@/services'

export function useNotifications() {
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const isAuthenticated = Boolean(session?.user?.id)

    const unreadCountQuery = useQuery({
        queryKey: QUERY_KEY.NOTIFICATION.UNREAD_COUNT,
        queryFn: async () => {
            const res = await apiClient.get<UnreadCountResponseDto>(API_ROUTE.NOTIFICATION.UNREAD_COUNT)
            return res.data.count
        },
        enabled: isAuthenticated,
        refetchInterval: 30_000,
        staleTime: 15_000,
    })

    const notificationsQuery = useQuery({
        queryKey: QUERY_KEY.NOTIFICATION.LIST,
        queryFn: async () => {
            const res = await apiClient.get<NotificationListResponseDto>(API_ROUTE.NOTIFICATION.LIST, {
                params: { limit: 20 },
            })
            return res.data.items
        },
        enabled: isAuthenticated,
        staleTime: 10_000,
    })

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.patch<{ success: boolean }>(API_ROUTE.NOTIFICATION.MARK_READ(id))
            return res.data
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.NOTIFICATION.ALL })
        },
    })

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.patch<{ success: boolean }>(API_ROUTE.NOTIFICATION.MARK_ALL_READ)
            return res.data
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.NOTIFICATION.ALL })
        },
    })

    return {
        isAuthenticated,
        unreadCount: unreadCountQuery.data ?? 0,
        notifications: notificationsQuery.data ?? [],
        isLoading: notificationsQuery.isLoading,
        refetch: notificationsQuery.refetch,
        markAsRead: markReadMutation.mutate,
        markAllAsRead: markAllReadMutation.mutate,
        isMarkingAllRead: markAllReadMutation.isPending,
    }
}
