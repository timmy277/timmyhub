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
import { useChatStore } from '@/stores/use-chat-store'

export function useChat() {
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const userId = session?.user?.id
    const isAuthenticated = Boolean(userId)
    const socketRef = useRef<Socket | null>(null)

    // WebSocket realtime connection cho namespace /chat
    useEffect(() => {
        if (!isAuthenticated || !userId) return

        const socketUrl = `${WS_BASE_URL}${REALTIME_NAMESPACE.CHAT}`
        const socket = io(socketUrl, {
            auth: { userId },
            query: { userId },
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnectionAttempts: 5,
        })
        socketRef.current = socket

        // Khi có tin nhắn mới gửi đến
        socket.on(CHAT_REALTIME_EVENT.MESSAGE_CREATED, (message: ChatMessageDto) => {
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEY.CHAT.CONVERSATIONS,
            })
            if (message?.conversationId) {
                void queryClient.invalidateQueries({
                    queryKey: QUERY_KEY.CHAT.MESSAGES(message.conversationId),
                })
            }
        })

        // Khi danh sách hội thoại có biến động (lastMessage / unread)
        socket.on(CHAT_REALTIME_EVENT.CONVERSATION_UPDATED, () => {
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEY.CHAT.CONVERSATIONS,
            })
        })

        // Khi có sự kiện đã đọc
        socket.on(CHAT_REALTIME_EVENT.READ_CHANGED, (payload: { conversationId: string }) => {
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEY.CHAT.CONVERSATIONS,
            })
            if (payload?.conversationId) {
                void queryClient.invalidateQueries({
                    queryKey: QUERY_KEY.CHAT.MESSAGES(payload.conversationId),
                })
            }
        })

        return () => {
            socket.disconnect()
            socketRef.current = null
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

    // Đánh dấu hội thoại đã đọc
    const markReadMutation = useMutation({
        mutationFn: async (conversationId: string) => {
            const res = await apiClient.patch<{ success: boolean }>(API_ROUTE.CHAT.READ(conversationId))
            return res.data
        },
        onSuccess: (_data, conversationId) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CHAT.CONVERSATIONS })
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
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CHAT.CONVERSATIONS })
            if (data?.conversationId) {
                void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CHAT.MESSAGES(data.conversationId) })
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

    return {
        isAuthenticated,
        userId,
        socket: socketRef.current,
        conversations: conversationsQuery.data?.items ?? [],
        totalUnreadCount: conversationsQuery.data?.totalUnreadCount ?? 0,
        isLoading: conversationsQuery.isLoading,
        markConversationRead: markReadMutation.mutate,
        sendMessage: sendMessageMutation.mutateAsync,
        isSending: sendMessageMutation.isPending,
        openChatWithUser,
        isCreatingConversation: createConversationMutation.isPending,
        refetchConversations: conversationsQuery.refetch,
    }
}

// Hook lấy danh sách tin nhắn của 1 cuộc hội thoại
export function useConversationMessages(conversationId: string | null | undefined) {
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const isAuthenticated = Boolean(session?.user?.id)

    const messagesQuery = useQuery({
        queryKey: QUERY_KEY.CHAT.MESSAGES(conversationId ?? ''),
        queryFn: async () => {
            if (!conversationId) return { items: [], hasMore: false }
            const res = await apiClient.get<ChatMessageListResponseDto>(
                API_ROUTE.CHAT.MESSAGES(conversationId),
                { params: { limit: 50 } },
            )
            return res.data
        },
        enabled: isAuthenticated && Boolean(conversationId),
        refetchInterval: 15_000,
        staleTime: 5_000,
    })

    // Subscribe socket room cho conversation này
    useEffect(() => {
        if (!conversationId) return
        const socketUrl = `${WS_BASE_URL}${REALTIME_NAMESPACE.CHAT}`
        const socket = io(socketUrl, {
            auth: { userId: session?.user?.id },
            transports: ['websocket', 'polling'],
        })

        socket.emit(CHAT_REALTIME_EVENT.CONVERSATION_SUBSCRIBE, { conversationId })

        return () => {
            socket.emit(CHAT_REALTIME_EVENT.CONVERSATION_UNSUBSCRIBE, { conversationId })
            socket.disconnect()
        }
    }, [conversationId, session?.user?.id])

    return {
        messages: messagesQuery.data?.items ?? [],
        hasMore: messagesQuery.data?.hasMore ?? false,
        isLoading: messagesQuery.isLoading,
        refetch: messagesQuery.refetch,
    }
}
