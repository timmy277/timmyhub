'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { io, type Socket } from 'socket.io-client'
import {
    CHAT_REALTIME_EVENT,
    REALTIME_NAMESPACE,
    type ChatMessageDto,
    type ChatMessageListResponseDto,
    type ConversationDto,
    type ConversationListResponseDto,
    type CreateConversationInput,
    type SendChatMessageInput,
} from '@timmyhub/contracts'

import { API_ROUTE, QUERY_KEY, WS_BASE_URL } from '@/constants'
import { apiClient } from '@/services'
import { useChatStore } from '@/stores'

// Singleton socket instance để tái sử dụng xuyên suốt toàn bộ ứng dụng, tránh mở nhiều socket song song
let sharedChatSocket: Socket | null = null
let sharedSocketUserId: string | null = null
let socketSubscribersCount = 0

export function getOrCreateChatSocket(userId: string): Socket {
    if (sharedChatSocket && sharedSocketUserId === userId && sharedChatSocket.connected) {
        return sharedChatSocket
    }

    if (sharedChatSocket && sharedSocketUserId !== userId) {
        sharedChatSocket.disconnect()
        sharedChatSocket = null
    }

    if (!sharedChatSocket) {
        const socketUrl = `${WS_BASE_URL}${REALTIME_NAMESPACE.CHAT}`
        sharedChatSocket = io(socketUrl, {
            auth: { userId },
            query: { userId },
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnectionAttempts: 5,
        })
        sharedSocketUserId = userId
    }

    return sharedChatSocket
}

export function useChat() {
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const userId = session?.user?.id
    const isAuthenticated = Boolean(userId)
    const socketRef = useRef<Socket | null>(null)
    const onlineUsers = useChatStore((s) => s.onlineUsers)

    // Đăng ký và quản lý WebSocket realtime
    useEffect(() => {
        if (!isAuthenticated || !userId) return

        socketSubscribersCount += 1
        const socket = getOrCreateChatSocket(userId)
        socketRef.current = socket

        // 1. Khi có tin nhắn mới (do đối tác gửi hoặc do mình gửi ở tab khác)
        const handleMessageCreated = (message: ChatMessageDto) => {
            if (!message?.conversationId) return

            const { isChatOpenAndActive } = useChatStore.getState()
            const isCurrentlyActive = isChatOpenAndActive(message.conversationId)

            // Cập nhật cache hội thoại ngay lập tức trong 0ms (Optimistic Cache Update)
            queryClient.setQueryData<ConversationListResponseDto>(QUERY_KEY.CHAT.CONVERSATIONS, (old) => {
                if (!old) return old

                let totalDelta = 0
                const items = old.items.map((conv) => {
                    if (conv.id !== message.conversationId) return conv

                    // Nếu tin do người khác gửi và hội thoại không đang mở trước mắt -> unread + 1
                    const isFromPeer = message.senderId !== userId
                    const shouldIncreaseUnread = isFromPeer && !isCurrentlyActive
                    if (shouldIncreaseUnread) {
                        totalDelta += 1
                    }

                    return {
                        ...conv,
                        lastMessage: message.content ?? (message.imageUrls?.length ? '[Hình ảnh/Video]' : null),
                        lastMessageAt: message.createdAt,
                        lastSenderId: message.senderId,
                        unreadCount: shouldIncreaseUnread ? conv.unreadCount + 1 : conv.unreadCount,
                    }
                })

                // Đưa hội thoại có tin mới nhất lên đầu danh sách
                items.sort(
                    (a, b) =>
                        new Date(b.lastMessageAt || b.createdAt).getTime() -
                        new Date(a.lastMessageAt || a.createdAt).getTime(),
                )

                return {
                    items,
                    totalUnreadCount: Math.max(0, old.totalUnreadCount + totalDelta),
                }
            })

            // Cập nhật cache danh sách tin nhắn của hội thoại đó nếu đã có trong React Query cache
            queryClient.setQueryData<ChatMessageListResponseDto>(
                QUERY_KEY.CHAT.MESSAGES(message.conversationId),
                (old) => {
                    if (!old) return old
                    // Tránh trùng lặp id
                    if (old.items.some((m) => m.id === message.id)) return old
                    return {
                        ...old,
                        items: [...old.items, message],
                    }
                },
            )

            // Nếu người dùng đang mở hội thoại này trước mắt, tự động gửi mark read lên server
            if (isCurrentlyActive && message.senderId !== userId) {
                void apiClient.patch(API_ROUTE.CHAT.READ(message.conversationId))
            }
        }

        // 2. Khi danh sách hội thoại cập nhật (từ server)
        const handleConversationUpdated = (payload?: { conversationId: string; lastMessage?: ChatMessageDto }) => {
            if (payload?.lastMessage) {
                handleMessageCreated(payload.lastMessage)
            } else {
                void queryClient.invalidateQueries({
                    queryKey: QUERY_KEY.CHAT.CONVERSATIONS,
                })
            }
        }

        // 3. Khi có sự kiện đọc tin nhắn (READ_CHANGED)
        const handleReadChanged = (payload: { conversationId: string; userId: string }) => {
            if (!payload?.conversationId) return

            const isSelf = payload.userId === userId

            if (isSelf) {
                // Người đọc là chính mình (đọc trên tab khác hoặc trên thiết bị khác)
                // -> Xoá unread count của hội thoại đó trên tab này về 0 ngay lập tức!
                queryClient.setQueryData<ConversationListResponseDto>(QUERY_KEY.CHAT.CONVERSATIONS, (old) => {
                    if (!old) return old
                    const conv = old.items.find((c) => c.id === payload.conversationId)
                    const unreadToSubtract = conv?.unreadCount ?? 0
                    if (unreadToSubtract === 0) return old

                    return {
                        items: old.items.map((c) => (c.id === payload.conversationId ? { ...c, unreadCount: 0 } : c)),
                        totalUnreadCount: Math.max(0, old.totalUnreadCount - unreadToSubtract),
                    }
                })
            } else {
                // Người đọc là đối tác -> Cập nhật trạng thái "Đã xem" (isRead = true) cho các tin nhắn của mình
                queryClient.setQueryData<ChatMessageListResponseDto>(
                    QUERY_KEY.CHAT.MESSAGES(payload.conversationId),
                    (old) => {
                        if (!old) return old
                        return {
                            ...old,
                            items: old.items.map((m) => (m.senderId === userId ? { ...m, isRead: true } : m)),
                        }
                    },
                )
            }
        }

        // 4. Khi trạng thái online của một user thay đổi (PRESENCE_CHANGED)
        const handlePresenceChanged = (payload: { userId: string; isOnline: boolean; lastSeenAt?: string }) => {
            if (!payload?.userId) return
            useChatStore.getState().setUserPresence(payload.userId, payload.isOnline, payload.lastSeenAt)

            queryClient.setQueryData<ConversationListResponseDto>(QUERY_KEY.CHAT.CONVERSATIONS, (old) => {
                if (!old) return old
                return {
                    ...old,
                    items: old.items.map((c) =>
                        c.peer.id === payload.userId ? { ...c, peer: { ...c.peer, isOnline: payload.isOnline } } : c,
                    ),
                }
            })
        }

        // 5. Khi nhận toàn bộ danh sách snapshot online (PRESENCE_STATE)
        const handlePresenceState = (state: Record<string, { isOnline: boolean; lastSeenAt?: string }>) => {
            if (!state) return
            useChatStore.getState().setPresenceState(state)

            queryClient.setQueryData<ConversationListResponseDto>(QUERY_KEY.CHAT.CONVERSATIONS, (old) => {
                if (!old) return old
                return {
                    ...old,
                    items: old.items.map((c) => {
                        const presence = state[c.peer.id]
                        return presence ? { ...c, peer: { ...c.peer, isOnline: presence.isOnline } } : c
                    }),
                }
            })
        }

        socket.on(CHAT_REALTIME_EVENT.MESSAGE_CREATED, handleMessageCreated)
        socket.on(CHAT_REALTIME_EVENT.CONVERSATION_UPDATED, handleConversationUpdated)
        socket.on(CHAT_REALTIME_EVENT.READ_CHANGED, handleReadChanged)
        socket.on(CHAT_REALTIME_EVENT.PRESENCE_CHANGED, handlePresenceChanged)
        socket.on(CHAT_REALTIME_EVENT.PRESENCE_STATE, handlePresenceState)

        // Gửi yêu cầu lấy trạng thái online ban đầu
        socket.emit(CHAT_REALTIME_EVENT.PRESENCE_QUERY, {})

        return () => {
            socket.off(CHAT_REALTIME_EVENT.MESSAGE_CREATED, handleMessageCreated)
            socket.off(CHAT_REALTIME_EVENT.CONVERSATION_UPDATED, handleConversationUpdated)
            socket.off(CHAT_REALTIME_EVENT.READ_CHANGED, handleReadChanged)
            socket.off(CHAT_REALTIME_EVENT.PRESENCE_CHANGED, handlePresenceChanged)
            socket.off(CHAT_REALTIME_EVENT.PRESENCE_STATE, handlePresenceState)

            socketSubscribersCount = Math.max(0, socketSubscribersCount - 1)
            if (socketSubscribersCount === 0 && sharedChatSocket) {
                sharedChatSocket.disconnect()
                sharedChatSocket = null
                sharedSocketUserId = null
            }
        }
    }, [isAuthenticated, userId, queryClient])

    // Danh sách các cuộc trò chuyện
    const conversationsQuery = useQuery({
        queryKey: QUERY_KEY.CHAT.CONVERSATIONS,
        queryFn: async () => {
            const res = await apiClient.get<ConversationListResponseDto>(API_ROUTE.CHAT.CONVERSATIONS)
            return res.data
        },
        enabled: isAuthenticated,
        refetchInterval: 30_000,
        staleTime: 10_000,
    })

    // Đánh dấu hội thoại đã đọc với Optimistic Update tức thì (0ms lag)
    const markReadMutation = useMutation({
        mutationFn: async (conversationId: string) => {
            const res = await apiClient.patch<{ success: boolean }>(API_ROUTE.CHAT.READ(conversationId))
            return res.data
        },
        onMutate: async (conversationId: string) => {
            // Cancel bất kỳ refetch nào đang diễn ra để tránh race condition
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.CHAT.CONVERSATIONS })

            // Snapshot cache trước đó để rollback nếu lỗi
            const previousConversations = queryClient.getQueryData<ConversationListResponseDto>(
                QUERY_KEY.CHAT.CONVERSATIONS,
            )

            // Optimistic update: đặt unreadCount = 0 và trừ totalUnreadCount ngay lập tức
            queryClient.setQueryData<ConversationListResponseDto>(QUERY_KEY.CHAT.CONVERSATIONS, (old) => {
                if (!old) return old
                const targetConv = old.items.find((c) => c.id === conversationId)
                const countToRemove = targetConv?.unreadCount ?? 0
                if (countToRemove === 0) return old

                return {
                    items: old.items.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
                    totalUnreadCount: Math.max(0, old.totalUnreadCount - countToRemove),
                }
            })

            return { previousConversations }
        },
        onError: (_err, _conversationId, context) => {
            if (context?.previousConversations) {
                queryClient.setQueryData(QUERY_KEY.CHAT.CONVERSATIONS, context.previousConversations)
            }
        },
        onSettled: (_data, _err, conversationId) => {
            // Đồng bộ lại tin nhắn để cập nhật isRead
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CHAT.MESSAGES(conversationId) })
        },
    })

    // Gửi tin nhắn
    const sendMessageMutation = useMutation({
        mutationFn: async (payload: SendChatMessageInput) => {
            const res = await apiClient.post<ChatMessageDto>(API_ROUTE.CHAT.SEND, payload)
            return res.data
        },
        onSuccess: (data) => {
            if (data?.conversationId) {
                // Đẩy tin vừa gửi vào cache tin nhắn
                queryClient.setQueryData<ChatMessageListResponseDto>(
                    QUERY_KEY.CHAT.MESSAGES(data.conversationId),
                    (old) => {
                        if (!old) return old
                        if (old.items.some((m) => m.id === data.id)) return old
                        return {
                            ...old,
                            items: [...old.items, data],
                        }
                    },
                )
                // Cập nhật lastMessage trong danh sách hội thoại
                queryClient.setQueryData<ConversationListResponseDto>(QUERY_KEY.CHAT.CONVERSATIONS, (old) => {
                    if (!old) return old
                    const items = old.items.map((conv) =>
                        conv.id === data.conversationId
                            ? {
                                  ...conv,
                                  lastMessage: data.content ?? (data.imageUrls?.length ? '[Hình ảnh/Video]' : null),
                                  lastMessageAt: data.createdAt,
                                  lastSenderId: data.senderId,
                              }
                            : conv,
                    )
                    items.sort(
                        (a, b) =>
                            new Date(b.lastMessageAt || b.createdAt).getTime() -
                            new Date(a.lastMessageAt || a.createdAt).getTime(),
                    )
                    return { ...old, items }
                })
            }
        },
    })

    // Mở hoặc tạo mới cuộc trò chuyện với user khác
    const createConversationMutation = useMutation({
        mutationFn: async (payload: CreateConversationInput) => {
            const res = await apiClient.post<ConversationDto>(API_ROUTE.CHAT.CONVERSATIONS, payload)
            return res.data
        },
        onSuccess: (conversation) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CHAT.CONVERSATIONS })
            if (conversation) {
                useChatStore.getState().openChat(conversation)
            }
        },
    })

    const openChatWithUser = async (targetUserId: string, initialMessage?: string) => {
        const conversations = conversationsQuery.data?.items ?? []
        const existing = conversations.find(
            (c) => c.peer.id === targetUserId || c.buyerId === targetUserId || c.sellerId === targetUserId,
        )
        if (existing) {
            useChatStore.getState().openChat(existing)
            return existing
        }

        const newConv = await createConversationMutation.mutateAsync({
            targetUserId,
            ...(initialMessage ? { initialMessage } : {}),
        })
        useChatStore.getState().openChat(newConv)
        return newConv
    }

    const isUserOnline = (targetUserId?: string | null) => {
        if (!targetUserId) return false
        return Boolean(onlineUsers[targetUserId]?.isOnline)
    }

    const getUserLastSeen = (targetUserId?: string | null) => {
        if (!targetUserId) return undefined
        return onlineUsers[targetUserId]?.lastSeenAt
    }

    return {
        isAuthenticated,
        userId,
        conversations: conversationsQuery.data?.items ?? [],
        totalUnreadCount: conversationsQuery.data?.totalUnreadCount ?? 0,
        isLoading: conversationsQuery.isLoading,
        markConversationRead: markReadMutation.mutate,
        sendMessage: sendMessageMutation.mutateAsync,
        isSending: sendMessageMutation.isPending,
        openChatWithUser,
        isCreatingConversation: createConversationMutation.isPending,
        refetchConversations: conversationsQuery.refetch,
        isUserOnline,
        getUserLastSeen,
        onlineUsers,
    }
}

// Hook lấy danh sách tin nhắn của 1 cuộc hội thoại
export function useConversationMessages(conversationId: string | null | undefined) {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const isAuthenticated = Boolean(userId)

    const messagesQuery = useQuery({
        queryKey: QUERY_KEY.CHAT.MESSAGES(conversationId ?? ''),
        queryFn: async () => {
            if (!conversationId) return { items: [], hasMore: false }
            const res = await apiClient.get<ChatMessageListResponseDto>(API_ROUTE.CHAT.MESSAGES(conversationId), {
                params: { limit: 50 },
            })
            return res.data
        },
        enabled: isAuthenticated && Boolean(conversationId),
        refetchInterval: 15_000,
        staleTime: 5_000,
    })

    // Subscribe vào socket room của cuộc trò chuyện bằng shared socket (tránh mở kết nối mới)
    useEffect(() => {
        if (!conversationId || !isAuthenticated || !userId) return
        const socket = getOrCreateChatSocket(userId)

        socket.emit(CHAT_REALTIME_EVENT.CONVERSATION_SUBSCRIBE, { conversationId })

        return () => {
            socket.emit(CHAT_REALTIME_EVENT.CONVERSATION_UNSUBSCRIBE, { conversationId })
        }
    }, [conversationId, isAuthenticated, userId])

    return {
        messages: messagesQuery.data?.items ?? [],
        hasMore: messagesQuery.data?.hasMore ?? false,
        isLoading: messagesQuery.isLoading,
        refetch: messagesQuery.refetch,
    }
}
