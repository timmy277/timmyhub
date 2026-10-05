import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { NavLayout } from '@/components/layout'
import { ROUTE, SELLER_SHOP_ANY_PERMISSION, SELLER_SHOP_PERMISSION } from '@/constants'
import { getMyShopAction } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

interface SellerPortalLayoutProps {
    children: ReactNode
}

// Layout cho Kênh Người Bán (Seller Portal):
// Khi đã là người bán, sử dụng NavLayout (có thanh sidebar bên trái để điều hướng).
export default async function SellerPortalLayout({ children }: SellerPortalLayoutProps) {
    const actor = await getActor()
    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    const isSellerByPermission =
        actor.permissions.has(SELLER_SHOP_PERMISSION) || actor.permissions.has(SELLER_SHOP_ANY_PERMISSION)
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
