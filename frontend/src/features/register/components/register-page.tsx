import { useTranslations } from 'next-intl'

import { AuthCard } from '@/components'
import { RedirectIfAuthenticated } from '@/features/login'

import { RegisterForm } from './register-form'

export function RegisterPage() {
    const t = useTranslations('register')

    return (
        <AuthCard title={t('title')} description={t('description')}>
            <RedirectIfAuthenticated />
            <RegisterForm />
        </AuthCard>
    )
}
