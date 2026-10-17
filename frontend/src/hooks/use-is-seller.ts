'use client'

import { SELLER_SHOP_ANY_PERMISSION, SELLER_SHOP_PERMISSION } from '@/constants'
import { useMyShop } from './use-my-shop'
import { usePermissions } from './use-permissions'

/**
 * Kiểm tra xem người dùng hiện tại có vai trò người bán (Seller) hay không.
 * Kết hợp kiểm tra quyền (RBAC permissions) và dữ liệu cửa hàng thực tế (myShop).
 */
export function useIsSeller() {
    const { hasPermission, isLoading: isLoadingPermissions } = usePermissions()

    const isSellerByPermission =
        hasPermission(SELLER_SHOP_PERMISSION) ||
        hasPermission(SELLER_SHOP_ANY_PERMISSION) ||
        hasPermission('orders:orders:list:shop')

    const { data: myShop, isLoading: isLoadingShop } = useMyShop({
        enabled: !isSellerByPermission,
    })

    const isSeller = isSellerByPermission || Boolean(myShop)

    return {
        isSeller,
        isLoading: !isSellerByPermission && (isLoadingPermissions || isLoadingShop),
    }
}
