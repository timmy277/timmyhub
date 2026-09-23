import { useTranslations } from 'next-intl'

import { AuthCard } from '@/components'
import { LoginForm } from './login-form'

export function LoginPage() {
    const t = useTranslations('login')

    return (
        <AuthCard title={t('title')} description={t('description')}>
            <LoginForm />
        </AuthCard>
    )
}
