import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LoginPage } from '@/features/login'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('login')
    return { title: t('metaTitle') }
}

export default function Page() {
    return <LoginPage />
}
