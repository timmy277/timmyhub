import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ResetPasswordPage } from '@/features/reset-password'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('resetPassword')
    return { title: t('metaTitle') }
}

export default function Page() {
    return <ResetPasswordPage />
}
