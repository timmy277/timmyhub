import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ForgotPasswordPage } from '@/features/forgot-password'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('forgotPassword')
    return { title: t('metaTitle') }
}

export default function Page() {
    return <ForgotPasswordPage />
}
