'use client'

import { useQuery } from '@tanstack/react-query'

import { QUERY_KEY } from '@/constants'
import { getMyShopAction } from '@/features/seller'

// Fetch thông tin shop của user hiện tại. Dùng trên home page để quyết định hiển thị nút
// "Vào shop" hay "Đăng ký bán hàng" — tách ra hook để home-page không phải import trực tiếp
// server action (tránh kéo seller client components qua barrel).
//
// `enabled` mặc định `false` — caller chỉ bật khi thực sự cần (vd: chưa có permission seller).
export function useMyShop(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: QUERY_KEY.SELLER.MY_SHOP,
        queryFn: async () => {
            const res = await getMyShopAction()
            return res.ok && res.data ? res.data : null
        },
        enabled: options?.enabled ?? true,
        staleTime: 60_000,
    })
}
