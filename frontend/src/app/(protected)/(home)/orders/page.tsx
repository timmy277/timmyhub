import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DASHBOARD_PERMISSION, ROUTE, SELLER_SHOP_PERMISSION } from '@/constants'
import { getMyOrdersAction } from '@/features/checkout'
import { getMyShopAction } from '@/features/seller'
import { OrderListView } from '@/features/orders'
import { getActor } from '@/lib/actor-permissions'

export const metadata: Metadata = {
    title: 'Đơn hàng của tôi · TimmyHub',
    description: 'Danh sách và trạng thái các đơn hàng của bạn trên sàn thương mại điện tử TimmyHub',
}

interface OrdersPageProps {
    searchParams?: Promise<{ role?: string; view?: string }>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
    const params = await searchParams
    const actor = await getActor()

    // Nếu là Admin / Super Admin (có quyền Dashboard), không sử dụng trang đơn hàng cá nhân mà chuyển về Dashboard
    if (actor && actor.permissions.has(DASHBOARD_PERMISSION)) {
        redirect(ROUTE.DASHBOARD)
    }

    // Nếu người dùng là người bán và không chỉ định xem đơn mua cá nhân (?view=buyer / ?role=buyer),
    // tự động điều hướng sang trang Quản lý đơn hàng Kênh Người Bán.
    if (actor && params?.view !== 'buyer' && params?.role !== 'buyer') {
        const isSellerByPermission =
            actor.permissions.has(SELLER_SHOP_PERMISSION) || actor.permissions.has('orders:orders:list:shop')
        let isSeller = isSellerByPermission
        if (!isSeller) {
            const shopRes = await getMyShopAction()
            if (shopRes.ok && Boolean(shopRes.data)) {
                isSeller = true
            }
        }
        if (isSeller) {
            redirect(ROUTE.SELLER_ORDERS)
        }
    }

    const result = await getMyOrdersAction()
    const initialOrders = result.ok ? result.data : []

    return <OrderListView initialOrders={initialOrders} />
}
