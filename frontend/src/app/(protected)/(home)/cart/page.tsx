import type { Metadata } from 'next'
import { getCartAction } from '@/features/cart'
import { CartView } from '@/features/cart'

export const metadata: Metadata = {
    title: 'Giỏ hàng · TimmyHub',
    description: 'Giỏ hàng mua sắm trực tuyến trên sàn thương mại điện tử TimmyHub',
    robots: { index: false, follow: false },
}

export default async function CartPage() {
    const result = await getCartAction()
    const initialData = result.ok ? result.data : null

    return <CartView initialData={initialData} />
}
