'use client'

import { useQuery } from '@tanstack/react-query'
import type { ProductQueryInput } from '@timmyhub/contracts'

import { QUERY_KEY } from '@/constants'
import { listPublicProductsAction } from '@/features/products'

interface UsePublicProductsOptions {
    enabled?: boolean
    staleTime?: number
}

// Hook tải danh sách sản phẩm công khai đã duyệt cho trang chủ và catalog người mua.
export function usePublicProducts(query?: ProductQueryInput, options?: UsePublicProductsOptions) {
    return useQuery({
        queryKey: QUERY_KEY.PRODUCTS.PUBLIC_LIST(query as Record<string, unknown>),
        queryFn: async () => {
            const res = await listPublicProductsAction(query)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể tải danh sách sản phẩm')
            }
            return res.data
        },
        enabled: options?.enabled ?? true,
        staleTime: options?.staleTime ?? 30_000,
    })
}
