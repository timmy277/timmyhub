import { useTranslations } from 'next-intl'

import { AuthCard } from '@/components'
import { RedirectIfAuthenticated } from '@/features/login'

import { ResetPasswordForm } from './reset-password-form'

export function ResetPasswordPage({ token }: { token?: string }) {
    const t = useTranslations('resetPassword')

    return (
        <AuthCard title={t('title')} description={t('description')}>
            <RedirectIfAuthenticated />
            <ResetPasswordForm token={token} />
        </AuthCard>
    )
}
