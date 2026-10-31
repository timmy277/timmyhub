import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { RegisterPage } from '@/features/register'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('register')
    return { title: t('metaTitle') }
}

export default function Page() {
    return <RegisterPage />
}
