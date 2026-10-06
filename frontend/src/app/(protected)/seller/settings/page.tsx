import type { Metadata } from 'next'

import { getMyShopAction, SellerSettingsView } from '@/features/seller'

export const metadata: Metadata = {
    title: 'Cài đặt gian hàng · Kênh Người Bán · TimmyHub',
}

export default async function SellerSettingsPage() {
    const res = await getMyShopAction()
    const shop = res.ok && res.data ? res.data : null

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <SellerSettingsView initialShop={shop} />
        </div>
    )
}
