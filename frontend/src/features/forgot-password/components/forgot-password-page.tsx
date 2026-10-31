import { useTranslations } from 'next-intl'

import { AuthCard } from '@/components'
import { RedirectIfAuthenticated } from '@/features/login'

import { ForgotPasswordForm } from './forgot-password-form'

export function ForgotPasswordPage() {
    const t = useTranslations('forgotPassword')

    return (
        <AuthCard title={t('title')} description={t('description')}>
            <RedirectIfAuthenticated />
            <ForgotPasswordForm />
        </AuthCard>
    )
}
