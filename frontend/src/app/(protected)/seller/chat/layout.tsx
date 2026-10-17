import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { NavLayout } from '@/components/layout'
import { DASHBOARD_PERMISSION, ROUTE, SELLER_SHOP_PERMISSION } from '@/constants'
import { getMyShopAction } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

interface SellerChatLayoutProps {
    children: ReactNode
}

// Layout cho Màn hình Kênh Người Bán /seller/chat:
// Giao diện Chat toàn màn hình chuyên nghiệp dành cho Seller chăm sóc nhiều khách hàng cùng lúc.
export default async function SellerChatLayout({ children }: SellerChatLayoutProps) {
    const actor = await getActor()
    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    if (actor.permissions.has(DASHBOARD_PERMISSION)) {
        redirect(ROUTE.DASHBOARD)
    }

    const isSellerByPermission =
        actor.permissions.has(SELLER_SHOP_PERMISSION) || actor.permissions.has('orders:orders:list:shop')
    let isSeller = isSellerByPermission
    if (!isSeller) {
        const shopRes = await getMyShopAction()
        if (shopRes.ok && Boolean(shopRes.data)) {
            isSeller = true
        }
    }
    if (!isSeller) {
        redirect(ROUTE.SELLER_REGISTER)
    }

    return <NavLayout>{children}</NavLayout>
}
