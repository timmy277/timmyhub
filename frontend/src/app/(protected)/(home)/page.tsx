import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { DASHBOARD_PERMISSION, ROUTE } from '@/constants'
import { HomePage } from '@/features/home'
import { getActor } from '@/lib/actor-permissions'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('home')
    return { title: t('title') }
}

export default async function Page() {
    const actor = await getActor()
    if (actor?.permissions.has(DASHBOARD_PERMISSION)) {
        redirect(ROUTE.DASHBOARD)
    }

    return <HomePage />
}
