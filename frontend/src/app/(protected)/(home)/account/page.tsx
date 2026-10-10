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
    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <AccountShell initialUser={user} />
        </div>
    )
}
