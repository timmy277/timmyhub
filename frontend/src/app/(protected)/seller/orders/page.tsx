import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { getSellerOrdersAction, SellerOrdersView } from '@/features/seller'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('seller')
    return { title: t('ordersMetaTitle') }
}

export default async function SellerOrdersPage() {
    const res = await getSellerOrdersAction()
    const initialOrders = res.ok ? res.data : []

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <SellerOrdersView initialOrders={initialOrders} />
        </div>
    )
}
