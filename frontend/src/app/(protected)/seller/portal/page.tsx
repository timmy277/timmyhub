import type { Metadata } from 'next'

import { getMyShopAction, SellerPortalView } from '@/features/seller'

export const metadata: Metadata = {
    title: 'Tổng quan Kênh Người Bán · TimmyHub',
}

export default async function SellerPortalPage() {
    const res = await getMyShopAction()
    const shop = res.ok && res.data ? res.data : null

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <SellerPortalView initialShop={shop} />
        </div>
    )
}
