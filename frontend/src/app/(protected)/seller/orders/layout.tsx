import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { NavLayout } from '@/components/layout'
import { DASHBOARD_PERMISSION, ROUTE, SELLER_SHOP_PERMISSION } from '@/constants'
import { getMyShopAction } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

interface SellerOrdersLayoutProps {
    children: ReactNode
}

// Layout cho Quản lý đơn hàng người bán:
// Sử dụng NavLayout với sidebar điều hướng kênh người bán.
export default async function SellerOrdersLayout({ children }: SellerOrdersLayoutProps) {
    const actor = await getActor()
    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    // Quản trị viên (Admin) không vào Kênh Người Bán
    if (actor.permissions.has(DASHBOARD_PERMISSION)) {
        redirect(ROUTE.DASHBOARD)
    }

    const isSellerByPermission = actor.permissions.has(SELLER_SHOP_PERMISSION)
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
