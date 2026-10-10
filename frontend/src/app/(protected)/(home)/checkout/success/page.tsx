import type { Metadata } from 'next'

import { CheckoutSuccessView, getOrderByIdAction } from '@/features/checkout'

export const metadata: Metadata = {
    title: 'Đặt hàng thành công · TimmyHub',
    description: 'Xác nhận đặt hàng thành công trên sàn thương mại điện tử TimmyHub',
}

interface SuccessPageProps {
    searchParams: Promise<{ orderId?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
    const params = await searchParams
    const orderId = params.orderId || ''

    let initialOrder = null
    if (orderId) {
        const orderRes = await getOrderByIdAction(orderId)
        if (orderRes.ok) {
            initialOrder = orderRes.data
        }
    }

    return <CheckoutSuccessView orderId={orderId} initialOrder={initialOrder} />
}
