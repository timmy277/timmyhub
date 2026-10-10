import type { Metadata } from 'next'
import { getMyOrdersAction } from '@/features/checkout'
import { OrderListView } from '@/features/orders'

export const metadata: Metadata = {
    title: 'Đơn hàng của tôi · TimmyHub',
    description: 'Danh sách và trạng thái các đơn hàng của bạn trên sàn thương mại điện tử TimmyHub',
}

export default async function OrdersPage() {
    const result = await getMyOrdersAction()
    const initialOrders = result.ok ? result.data : []

    return <OrderListView initialOrders={initialOrders} />
}
