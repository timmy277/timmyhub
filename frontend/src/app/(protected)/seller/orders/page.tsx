import type { Metadata } from 'next'

import { SellerOrdersView } from '@/features/seller'

export const metadata: Metadata = {
    title: 'Quản lý đơn hàng · Kênh Người Bán · TimmyHub',
}

export default function SellerOrdersPage() {
    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <SellerOrdersView />
        </div>
    )
}
