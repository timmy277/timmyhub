'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

import { CHAT_REALTIME_EVENT } from '@timmyhub/contracts'

import { getOrCreateChatSocket } from './use-chat'

export function useTypingIndicator(conversationId: string | null | undefined) {
    // ===== State =====
    const [isPeerTyping, setIsPeerTyping] = useState(false)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isCurrentlyTypingRef = useRef(false)

    // ===== Hooks =====
    const { data: session } = useSession()

    // ===== Derived =====
    const userId = session?.user?.id
    const isAuthenticated = Boolean(userId)

    // ===== Handlers =====
    const stopTyping = useCallback(() => {
        if (!conversationId || !userId || !isCurrentlyTypingRef.current) return

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = null
        }
        isCurrentlyTypingRef.current = false

        const socket = getOrCreateChatSocket(userId)
        socket.emit(CHAT_REALTIME_EVENT.TYPING, {
            conversationId,
            userId,
            isTyping: false,
        })
    }, [conversationId, userId])

    const startTyping = useCallback(() => {
        if (!conversationId || !userId) return

        const socket = getOrCreateChatSocket(userId)

        // Nếu trước đó chưa phát trạng thái typing thì phát ngay lập tức
        if (!isCurrentlyTypingRef.current) {
            isCurrentlyTypingRef.current = true
            socket.emit(CHAT_REALTIME_EVENT.TYPING, {
                conversationId,
                userId,
                isTyping: true,
            })
        }

        // Debounce: Sau 2.5s không gõ thêm phím nào thì tự động kết thúc typing
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping()
        }, 2500)
    }, [conversationId, stopTyping, userId])

    const stopTypingRef = useRef(stopTyping)
    useEffect(() => {
        stopTypingRef.current = stopTyping
    })

    // ===== Effects =====
    useEffect(() => {
        if (!conversationId || !isAuthenticated || !userId) return

        const socket = getOrCreateChatSocket(userId)

        const handleTypingChanged = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
            if (payload.conversationId !== conversationId) return
            // Chỉ hiển thị trạng thái của đối phương, bỏ qua sự kiện từ chính mình
            if (payload.userId === userId) return

            setIsPeerTyping(payload.isTyping)

            // Safety timeout: tự động tắt sau 4s nếu sự kiện stop bị trễ hoặc rớt mạng
            if (safetyTimeoutRef.current) {
                clearTimeout(safetyTimeoutRef.current)
            }
            if (payload.isTyping) {
                safetyTimeoutRef.current = setTimeout(() => {
                    setIsPeerTyping(false)
                }, 4000)
            }
        }

        socket.on(CHAT_REALTIME_EVENT.TYPING_CHANGED, handleTypingChanged)

        return () => {
            socket.off(CHAT_REALTIME_EVENT.TYPING_CHANGED, handleTypingChanged)
            if (safetyTimeoutRef.current) {
                clearTimeout(safetyTimeoutRef.current)
                safetyTimeoutRef.current = null
            }
            stopTypingRef.current()
        }
    }, [conversationId, isAuthenticated, userId])

    return {
        isPeerTyping,
        startTyping,
        stopTyping,
    }
}
