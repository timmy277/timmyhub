'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { PRODUCT_REALTIME_EVENT, REALTIME_NAMESPACE } from '@timmyhub/contracts'
import { QUERY_KEY, WS_BASE_URL } from '@/constants'

export function useProductRealtime(productId: string | undefined): void {
    const queryClient = useQueryClient()
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => {
        if (!productId) return

        const socketUrl = `${WS_BASE_URL}${REALTIME_NAMESPACE.PRODUCT}`
        const socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnectionAttempts: 5,
        })
        socketRef.current = socket

        socket.on('connect', () => {
            socket.emit(PRODUCT_REALTIME_EVENT.SUBSCRIBE, { productId })
        })

        socket.on(PRODUCT_REALTIME_EVENT.REVIEW_CREATED, (payload: { productId: string }) => {
            if (payload.productId === productId) {
                void queryClient.invalidateQueries({
                    queryKey: QUERY_KEY.ENGAGEMENT.REVIEW_LISTS(productId),
                })
                void queryClient.invalidateQueries({
                    queryKey: QUERY_KEY.ENGAGEMENT.SUMMARY(productId),
                })
                toast.info('Có đánh giá mới cho sản phẩm này', {
                    description: 'Danh sách đánh giá đã được cập nhật theo thời gian thực.',
                })
            }
        })

        socket.on(PRODUCT_REALTIME_EVENT.COMMENT_CREATED, () => {
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEY.ENGAGEMENT.REVIEW_LISTS(productId),
            })
        })

        socket.on(PRODUCT_REALTIME_EVENT.RATING_UPDATED, (payload: { productId: string }) => {
            if (payload.productId === productId) {
                void queryClient.invalidateQueries({
                    queryKey: QUERY_KEY.ENGAGEMENT.SUMMARY(productId),
                })
            }
        })

        return () => {
            socket.emit(PRODUCT_REALTIME_EVENT.UNSUBSCRIBE, { productId })
            socket.disconnect()
            socketRef.current = null
        }
    }, [productId, queryClient])
}
