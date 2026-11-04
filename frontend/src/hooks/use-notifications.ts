'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import type { NotificationItemDto, NotificationListResponseDto, UnreadCountResponseDto } from '@timmyhub/contracts'
import { NOTIFICATION_REALTIME_EVENT, REALTIME_NAMESPACE } from '@timmyhub/contracts'

import { API_ROUTE, QUERY_KEY, WS_BASE_URL } from '@/constants'
import { apiClient } from '@/services'
import { resolveNotificationContent, resolveTargetHref } from '@/utils'

let sharedNotificationSocket: Socket | null = null
let sharedSocketUserId: string | null = null
let socketSubscribersCount = 0

export function getOrCreateNotificationSocket(userId: string): Socket {
    if (sharedNotificationSocket && sharedSocketUserId === userId && sharedNotificationSocket.connected) {
        return sharedNotificationSocket
    }

    if (sharedNotificationSocket && sharedSocketUserId !== userId) {
        sharedNotificationSocket.disconnect()
        sharedNotificationSocket = null
    }

    if (!sharedNotificationSocket) {
        const socketUrl = `${WS_BASE_URL}${REALTIME_NAMESPACE.NOTIFICATIONS}`
        sharedNotificationSocket = io(socketUrl, {
            auth: { userId },
            query: { userId },
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnectionAttempts: 5,
        })
        sharedSocketUserId = userId
    }

    return sharedNotificationSocket
}

export function useNotifications() {
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const userId = session?.user?.id
    const isAuthenticated = Boolean(userId)
    const processedNotificationIdsRef = useRef<Set<string>>(new Set())

    // 1. Unread count query
    const unreadCountQuery = useQuery({
        queryKey: QUERY_KEY.NOTIFICATION.UNREAD_COUNT,
        queryFn: async () => {
            const res = await apiClient.get<UnreadCountResponseDto>(API_ROUTE.NOTIFICATION.UNREAD_COUNT)
            return res.data.count
        },
        enabled: isAuthenticated,
        staleTime: 60_000,
    })

    // 2. Notification list query
    const notificationsQuery = useQuery({
        queryKey: QUERY_KEY.NOTIFICATION.LIST,
        queryFn: async () => {
            const res = await apiClient.get<NotificationListResponseDto>(API_ROUTE.NOTIFICATION.LIST, {
                params: { limit: 30 },
            })
            return res.data.items
        },
        enabled: isAuthenticated,
        staleTime: 60_000,
    })

    // 3. Realtime WebSocket listener
    useEffect(() => {
        if (!isAuthenticated || !userId) return

        socketSubscribersCount += 1
        const socket = getOrCreateNotificationSocket(userId)

        const handleNewNotification = (notification: NotificationItemDto) => {
            if (!notification?.id) return

            if (processedNotificationIdsRef.current.has(notification.id)) {
                return
            }
            processedNotificationIdsRef.current.add(notification.id)

            // Cập nhật danh sách notification
            queryClient.setQueryData<NotificationItemDto[]>(QUERY_KEY.NOTIFICATION.LIST, (old = []) => {
                const exists = old.some((item) => item.id === notification.id)
                if (exists) return old
                return [notification, ...old]
            })

            // Tăng unread count nếu chưa đọc
            if (!notification.isRead) {
                queryClient.setQueryData<number>(QUERY_KEY.NOTIFICATION.UNREAD_COUNT, (old = 0) => old + 1)
            }

            // Hiển thị toast thông báo realtime
            const { title, message } = resolveNotificationContent(notification)
            const targetHref = resolveTargetHref(notification)

            toast.info(title, {
                description: message,
                duration: 5000,
                action: targetHref
                    ? {
                          label: 'Xem ngay',
                          onClick: () => {
                              window.location.href = targetHref
                          },
                      }
                    : undefined,
            })
        }

        const handleNotificationRead = (data: { id: string }) => {
            if (!data?.id) return

            queryClient.setQueryData<NotificationItemDto[]>(QUERY_KEY.NOTIFICATION.LIST, (old = []) => {
                return old.map((item) => (item.id === data.id ? { ...item, isRead: true } : item))
            })

            queryClient.setQueryData<number>(QUERY_KEY.NOTIFICATION.UNREAD_COUNT, (old = 0) => Math.max(0, old - 1))
        }

        const handleNotificationReadAll = () => {
            queryClient.setQueryData<NotificationItemDto[]>(QUERY_KEY.NOTIFICATION.LIST, (old = []) => {
                return old.map((item) => ({ ...item, isRead: true }))
            })

            queryClient.setQueryData<number>(QUERY_KEY.NOTIFICATION.UNREAD_COUNT, 0)
        }

        socket.on(NOTIFICATION_REALTIME_EVENT.NEW, handleNewNotification)
        socket.on(NOTIFICATION_REALTIME_EVENT.READ, handleNotificationRead)
        socket.on(NOTIFICATION_REALTIME_EVENT.READ_ALL, handleNotificationReadAll)

        return () => {
            socket.off(NOTIFICATION_REALTIME_EVENT.NEW, handleNewNotification)
            socket.off(NOTIFICATION_REALTIME_EVENT.READ, handleNotificationRead)
            socket.off(NOTIFICATION_REALTIME_EVENT.READ_ALL, handleNotificationReadAll)

            socketSubscribersCount = Math.max(0, socketSubscribersCount - 1)
            if (socketSubscribersCount === 0 && sharedNotificationSocket) {
                sharedNotificationSocket.disconnect()
                sharedNotificationSocket = null
                sharedSocketUserId = null
            }
        }
    }, [isAuthenticated, userId, queryClient])

    // 4. Mark single as read mutation
    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.patch<{ success: boolean }>(API_ROUTE.NOTIFICATION.MARK_READ(id))
            return res.data
        },
        onMutate: async (id: string) => {
            queryClient.setQueryData<NotificationItemDto[]>(QUERY_KEY.NOTIFICATION.LIST, (old = []) =>
                old.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
            )
            queryClient.setQueryData<number>(QUERY_KEY.NOTIFICATION.UNREAD_COUNT, (old = 0) => Math.max(0, old - 1))
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.NOTIFICATION.ALL })
        },
    })

    // 5. Mark all as read mutation
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.patch<{ success: boolean }>(API_ROUTE.NOTIFICATION.MARK_ALL_READ)
            return res.data
        },
        onMutate: async () => {
            queryClient.setQueryData<NotificationItemDto[]>(QUERY_KEY.NOTIFICATION.LIST, (old = []) =>
                old.map((item) => ({ ...item, isRead: true })),
            )
            queryClient.setQueryData<number>(QUERY_KEY.NOTIFICATION.UNREAD_COUNT, 0)
        },
        onSettled: () => {
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
