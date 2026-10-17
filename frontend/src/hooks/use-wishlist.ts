'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import type { ToggleWishlistResponseDto, WishlistListResponseDto } from '@timmyhub/contracts'

import { API_ROUTE, QUERY_KEY, ROUTE } from '@/constants'
import { apiClient } from '@/services'

export function useWishlist() {
    const t = useTranslations('productDetail')
    const tCommon = useTranslations('common')
    const queryClient = useQueryClient()
    const router = useRouter()
    const { data: session } = useSession()
    const isAuthenticated = Boolean(session?.user?.id)

    // ===== 1. Query danh sách Product IDs đã thích (nhẹ, dùng để hiển thị icon tim) =====
    const idsQuery = useQuery({
        queryKey: QUERY_KEY.WISHLIST.IDS,
        queryFn: async () => {
            const res = await apiClient.get<string[]>(API_ROUTE.WISHLIST.IDS)
            return res.data
        },
        enabled: isAuthenticated,
        staleTime: 60_000,
    })

    const wishlistIds = useMemo(() => new Set<string>(idsQuery.data ?? []), [idsQuery.data])

    // ===== 2. Query danh sách chi tiết các sản phẩm trong Wishlist (dành cho Tab Wishlist) =====
    const itemsQuery = useQuery({
        queryKey: QUERY_KEY.WISHLIST.LIST,
        queryFn: async () => {
            const res = await apiClient.get<WishlistListResponseDto>(API_ROUTE.WISHLIST.LIST)
            return res.data
        },
        enabled: isAuthenticated,
        staleTime: 30_000,
    })

    // ===== 3. Mutation Toggle Wishlist (Thêm / Bỏ yêu thích) với Optimistic Update =====
    const toggleMutation = useMutation({
        mutationFn: async ({ productId }: { productId: string; productName?: string }) => {
            const res = await apiClient.post<ToggleWishlistResponseDto>(API_ROUTE.WISHLIST.TOGGLE(productId))
            return res.data
        },
        onMutate: async ({ productId }) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.WISHLIST.IDS })

            const previousIds = queryClient.getQueryData<string[]>(QUERY_KEY.WISHLIST.IDS) ?? []
            const isCurrentlyIn = previousIds.includes(productId)
            const nextIds = isCurrentlyIn
                ? previousIds.filter((id) => id !== productId)
                : [...previousIds, productId]

            queryClient.setQueryData<string[]>(QUERY_KEY.WISHLIST.IDS, nextIds)

            return { previousIds, wasInWishlist: isCurrentlyIn }
        },
        onSuccess: (data, variables) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.WISHLIST.ALL })

            const name = variables.productName || 'Sản phẩm'
            if (data.inWishlist) {
                toast.success(t('wishlistAdd', { name }))
            } else {
                toast.info(t('wishlistRemove', { name }))
            }
        },
        onError: (err: unknown, _variables, context) => {
            if (context?.previousIds) {
                queryClient.setQueryData<string[]>(QUERY_KEY.WISHLIST.IDS, context.previousIds)
            }
            const errAny = err as { response?: { data?: { details?: string; message?: string } }; message?: string }
            const message =
                errAny?.response?.data?.details ||
                errAny?.response?.data?.message ||
                errAny?.message ||
                tCommon('errorGeneric') ||
                'Có lỗi xảy ra, vui lòng thử lại sau.'
            toast.error(message)
        },
    })

    // ===== 4. Mutation Remove from Wishlist =====
    const removeMutation = useMutation({
        mutationFn: async ({ productId }: { productId: string; productName?: string }) => {
            const res = await apiClient.delete<{ success: boolean }>(API_ROUTE.WISHLIST.REMOVE(productId))
            return res.data
        },
        onMutate: async ({ productId }) => {
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.WISHLIST.IDS })
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.WISHLIST.LIST })

            const previousIds = queryClient.getQueryData<string[]>(QUERY_KEY.WISHLIST.IDS) ?? []
            const previousList = queryClient.getQueryData<WishlistListResponseDto>(QUERY_KEY.WISHLIST.LIST)

            queryClient.setQueryData<string[]>(
                QUERY_KEY.WISHLIST.IDS,
                previousIds.filter((id) => id !== productId),
            )

            if (previousList) {
                queryClient.setQueryData<WishlistListResponseDto>(QUERY_KEY.WISHLIST.LIST, {
                    items: previousList.items.filter((item) => item.productId !== productId),
                    total: Math.max(0, previousList.total - 1),
                })
            }

            return { previousIds, previousList }
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.WISHLIST.ALL })
            const name = variables.productName || 'Sản phẩm'
            toast.info(t('wishlistRemove', { name }))
        },
        onError: (err: unknown, _variables, context) => {
            if (context?.previousIds) {
                queryClient.setQueryData<string[]>(QUERY_KEY.WISHLIST.IDS, context.previousIds)
            }
            if (context?.previousList) {
                queryClient.setQueryData<WishlistListResponseDto>(QUERY_KEY.WISHLIST.LIST, context.previousList)
            }
            const errAny = err as { response?: { data?: { details?: string; message?: string } }; message?: string }
            const message =
                errAny?.response?.data?.details ||
                errAny?.response?.data?.message ||
                errAny?.message ||
                tCommon('errorGeneric') ||
                'Có lỗi xảy ra, vui lòng thử lại sau.'
            toast.error(message)
        },
    })

    const toggleWishlist = (productId: string, productName?: string) => {
        if (!isAuthenticated) {
            toast.info(t('wishlistLoginRequired') || 'Vui lòng đăng nhập để lưu sản phẩm yêu thích.')
            router.push(ROUTE.LOGIN)
            return
        }
        toggleMutation.mutate({ productId, productName })
    }

    const removeFromWishlist = (productId: string, productName?: string) => {
        if (!isAuthenticated) return
        removeMutation.mutate({ productId, productName })
    }

    const isInWishlist = (productId: string): boolean => {
        return wishlistIds.has(productId)
    }

    return {
        isAuthenticated,
        wishlistIds,
        isInWishlist,
        items: itemsQuery.data?.items ?? [],
        total: itemsQuery.data?.total ?? 0,
        isLoading: itemsQuery.isLoading,
        isIdsLoading: idsQuery.isLoading,
        toggleWishlist,
        removeFromWishlist,
        isToggling: toggleMutation.isPending,
        isRemoving: removeMutation.isPending,
    }
}
