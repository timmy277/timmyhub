import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageContainer } from '@/components'
import { SellerWalletPanel } from '@/features/seller'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('sellerWallet')
    return { title: t('metaTitle') }
}

export default async function SellerWalletPage() {
    const t = await getTranslations('sellerWallet')

    return (
        <PageContainer>
            <div className="space-y-6 max-w-6xl mx-auto py-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('pageTitle')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('pageDescription')}</p>
                </div>
                <SellerWalletPanel />
            </div>
        </PageContainer>
    )
}
