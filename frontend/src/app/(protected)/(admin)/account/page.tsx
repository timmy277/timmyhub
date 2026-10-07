import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AccountShell } from '@/features/account'
import { getCurrentUserDetailAction } from '@/features/users'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('account')
    return {
        title: t('metaTitle'),
        description: t('metaDescription'),
        robots: {
            index: false,
            follow: false,
        },
    }
}

export default async function AccountPage() {
    const user = await getCurrentUserDetailAction()
    return <AccountShell initialUser={user} />
}
