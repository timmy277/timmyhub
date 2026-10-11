import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DASHBOARD_PERMISSION, ROUTE } from '@/constants'
import { getMyOrdersAction } from '@/features/checkout'
import { OrderListView } from '@/features/orders'
import { getActor } from '@/lib/actor-permissions'

export const metadata: Metadata = {
    title: 'Đơn hàng của tôi · TimmyHub',
    description: 'Danh sách và trạng thái các đơn hàng của bạn trên sàn thương mại điện tử TimmyHub',
}

export default async function OrdersPage() {
    const actor = await getActor()

    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    // Nếu là Admin / Super Admin (có quyền Dashboard), chuyển về Dashboard nếu không có đơn mua
    if (actor.permissions.has(DASHBOARD_PERMISSION)) {
        redirect(ROUTE.DASHBOARD)
    }

    const result = await getMyOrdersAction()
    const initialOrders = result.ok ? result.data : []

    return <OrderListView initialOrders={initialOrders} />
}
