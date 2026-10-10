'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddToCartInput, CartDetail, UpdateCartItemInput } from '@timmyhub/contracts'
import { toast } from 'sonner'

import { QUERY_KEY } from '@/constants'
import {
    addToCartAction,
    clearCartAction,
    getCartAction,
    removeCartItemAction,
    updateCartItemAction,
} from '@/features/cart'

export function useCart(options?: { enabled?: boolean }) {
    return useQuery<CartDetail | null>({
        queryKey: QUERY_KEY.CART.DETAIL,
        queryFn: async () => {
            const res = await getCartAction()
            if (!res.ok) {
                if (res.code === 'UNAUTHORIZED') return null
                throw new Error(res.message || 'Không thể tải giỏ hàng')
            }
            return res.data
        },
        enabled: options?.enabled ?? true,
        staleTime: 30_000,
    })
}

export function useAddToCart() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: AddToCartInput) => {
            const res = await addToCartAction(input)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể thêm sản phẩm vào giỏ hàng')
            }
            return res.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(QUERY_KEY.CART.DETAIL, data)
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CART.ALL })
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Thêm vào giỏ hàng thất bại')
        },
    })
}

export function useUpdateCartItem() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ itemId, input }: { itemId: string; input: UpdateCartItemInput }) => {
            const res = await updateCartItemAction(itemId, input)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể cập nhật số lượng')
            }
            return res.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(QUERY_KEY.CART.DETAIL, data)
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CART.ALL })
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Cập nhật số lượng thất bại')
        },
    })
}

export function useRemoveCartItem() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (itemId: string) => {
            const res = await removeCartItemAction(itemId)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể xoá sản phẩm')
            }
            return res.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(QUERY_KEY.CART.DETAIL, data)
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CART.ALL })
            toast.success('Đã xoá sản phẩm khỏi giỏ hàng')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Xoá sản phẩm thất bại')
        },
    })
}

export function useClearCart() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const res = await clearCartAction()
            if (!res.ok) {
                throw new Error(res.message || 'Không thể làm trống giỏ hàng')
            }
            return res.data
        },
        onSuccess: () => {
            queryClient.setQueryData(QUERY_KEY.CART.DETAIL, null)
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CART.ALL })
            toast.success('Đã làm trống giỏ hàng')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể làm trống giỏ hàng')
        },
    })
}
