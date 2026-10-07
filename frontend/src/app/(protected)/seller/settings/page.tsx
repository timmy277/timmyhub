import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { getMyShopAction, SellerSettingsView } from '@/features/seller'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('seller')
    return { title: t('settingsMetaTitle') }
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
