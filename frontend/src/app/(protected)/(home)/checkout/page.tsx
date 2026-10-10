import type { Metadata } from 'next'

import { CheckoutView, getAddressesAction } from '@/features/checkout'
import { getCartAction } from '@/features/cart'

export const metadata: Metadata = {
    title: 'Thanh toán đơn hàng · TimmyHub',
    description: 'Xác nhận thông tin giao hàng và đặt hàng trên sàn thương mại điện tử TimmyHub',
}

export default async function CheckoutPage() {
    const [addressesRes, cartRes] = await Promise.all([getAddressesAction(), getCartAction()])

    const initialAddresses = addressesRes.ok ? addressesRes.data : []
    const initialCart = cartRes.ok ? cartRes.data : null

    return <CheckoutView initialAddresses={initialAddresses} initialCart={initialCart} />
}
