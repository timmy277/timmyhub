import type { Metadata } from 'next'

import { getMyShopAction, SellerPortalView } from '@/features/seller'

export const metadata: Metadata = {
    title: 'Kênh Người Bán · TimmyHub',
}

interface SellerPortalPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SellerPortalPage({ searchParams }: SellerPortalPageProps) {
    const params = await searchParams
    const initialTab = typeof params.tab === 'string' ? params.tab : 'overview'
    const res = await getMyShopAction()
    const shop = res.ok && res.data ? res.data : null

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <SellerPortalView initialShop={shop} initialTab={initialTab} />
        </div>
    )
}
