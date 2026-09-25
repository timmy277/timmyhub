import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { UserManagementPage } from '@/features/users'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('userManagement')
    return { title: t('pageTitle') }
}

export default function Page() {
    return <UserManagementPage />
}
