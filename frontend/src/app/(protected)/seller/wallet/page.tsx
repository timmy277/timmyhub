import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageContainer } from '@/components'
import { SellerWalletPanel } from '@/features/seller'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('sellerWallet')
    return { title: t('metaTitle') }
}

export default function SellerWalletPage() {
    return (
        <PageContainer className="w-full">
            <SellerWalletPanel />
        </PageContainer>
    )
}
