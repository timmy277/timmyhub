import { useTranslations } from 'next-intl'

import { AuthCard } from '@/components'

import { LoginForm } from './login-form'
import { RedirectIfAuthenticated } from './redirect-if-authenticated'

export function LoginPage() {
    const t = useTranslations('login')

    return (
        <AuthCard title={t('title')} description={t('description')}>
            <RedirectIfAuthenticated />
            <LoginForm />
        </AuthCard>
    )
}
