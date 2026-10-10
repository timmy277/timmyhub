'use client'

import { useQuery } from '@tanstack/react-query'
import type { ProductDetail } from '@timmyhub/contracts'

import { QUERY_KEY } from '@/constants'
import { getPublicProductDetailAction } from '@/features/products'

interface UsePublicProductDetailOptions {
    enabled?: boolean
    initialData?: ProductDetail
}

// Hook tải chi tiết một sản phẩm công khai bằng ID hoặc Slug.
export function usePublicProductDetail(idOrSlug: string, options?: UsePublicProductDetailOptions) {
    return useQuery({
        queryKey: QUERY_KEY.PRODUCTS.PUBLIC_DETAIL(idOrSlug),
        queryFn: async () => {
            const res = await getPublicProductDetailAction(idOrSlug)
            if (!res.ok) {
                throw new Error(res.message || 'Không tìm thấy sản phẩm')
            }
            return res.data
        },
        enabled: (options?.enabled ?? true) && Boolean(idOrSlug),
        initialData: options?.initialData,
        staleTime: 60_000,
    })
}
