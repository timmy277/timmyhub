import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { SellerOrdersView } from '@/features/seller'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('seller')
    return { title: t('ordersMetaTitle') }
}

export default function SellerOrdersPage() {
    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <SellerOrdersView />
        </div>
    )
}
