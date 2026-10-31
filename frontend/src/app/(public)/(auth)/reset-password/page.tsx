import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ResetPasswordPage } from '@/features/reset-password'

type PageProps = {
    searchParams: Promise<{ token?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('resetPassword')
    return { title: t('metaTitle') }
}

export default async function Page({ searchParams }: PageProps) {
    const params = await searchParams
    return <ResetPasswordPage token={params.token} />
}
