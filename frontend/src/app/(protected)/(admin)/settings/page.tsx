import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageContainer } from '@/components'
import { NotificationsTab } from '@/features/account'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('nav')
    return { title: t('adminSettings') }
}

export default async function AdminSettingsPage() {
    const t = await getTranslations('nav')
    const tNotif = await getTranslations('account.notifications')

    return (
        <PageContainer title={t('adminSettings')} description={tNotif('description')}>
            <div className="max-w-3xl">
                <NotificationsTab mode="admin" />
            </div>
        </PageContainer>
    )
}
