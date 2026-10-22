import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageContainer } from '@/components'
import { AdminWithdrawalsView, listAdminWithdrawalsAction } from '@/features/seller'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('adminWithdrawals')
    return { title: t('metaTitle') }
}

export default async function AdminWithdrawalsPage() {
    const res = await listAdminWithdrawalsAction(undefined, 1, 50)
    const initialItems = res.ok && res.data ? res.data.items : []
    const initialTotal = res.ok && res.data ? res.data.total : 0

    return (
        <PageContainer>
            <AdminWithdrawalsView initialItems={initialItems} initialTotal={initialTotal} />
        </PageContainer>
    )
}
