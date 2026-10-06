import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { NavLayout } from '@/components/layout'
import { ADMIN_PRODUCT_PERMISSION, ROUTE, SELLER_PRODUCT_PERMISSION, SELLER_SHOP_PERMISSION } from '@/constants'
import { getMyShopAction } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

interface ProductsLayoutProps {
    children: ReactNode
}

// Layout quản lý sản phẩm đa vai trò (cho cả Admin duyệt sản phẩm toàn sàn và Seller quản lý sản phẩm shop)
// Bọc trong NavLayout để hiển thị thanh Sidebar bên trái và Header bên trên.
export default async function ProductsLayout({ children }: ProductsLayoutProps) {
    const actor = await getActor()
    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    // Người dùng phải có quyền quản trị sản phẩm hoặc là người bán quản lý sản phẩm
    const hasAdminAccess = actor.permissions.has(ADMIN_PRODUCT_PERMISSION.LIST)
    let hasSellerAccess =
        actor.permissions.has(SELLER_PRODUCT_PERMISSION.READ) ||
        actor.permissions.has(SELLER_PRODUCT_PERMISSION.CREATE) ||
        actor.permissions.has(SELLER_SHOP_PERMISSION)

    if (!hasAdminAccess && !hasSellerAccess) {
        const shopRes = await getMyShopAction()
        if (shopRes.ok && Boolean(shopRes.data)) {
            hasSellerAccess = true
        }
    }

    if (!hasAdminAccess && !hasSellerAccess) {
        redirect(ROUTE.HOME)
    }

    return <NavLayout>{children}</NavLayout>
}
