'use client'

import type { FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button, FloatInput } from '@/components'
import { FacebookLogo, GoogleLogo } from './social-logos'

// Label nổi của field nằm trên card nên phần "cắt viền" phải cùng màu card, không phải màu nền trang.
const ON_CARD_LABEL = 'bg-card peer-focus:bg-card peer-autofill:bg-card'

// Mới là UI: chưa có validate (react-hook-form + schema `@timmyhub/contracts`) và chưa nối API đăng nhập.
export function LoginForm() {
    const t = useTranslations('login')

    const notConnected = () => {
        toast.info(t('notConnected'))
    }
    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        notConnected()
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FloatInput
                type="email"
                name="email"
                label={t('email')}
                autoComplete="email"
                labelClassName={ON_CARD_LABEL}
            />
            <FloatInput
                type="password"
                name="password"
                label={t('password')}
                autoComplete="current-password"
                labelClassName={ON_CARD_LABEL}
            />

            <Button type="submit" className="h-11 w-full text-sm font-semibold">
                {t('submit')}
            </Button>

            <div className="relative pt-2">
                <div aria-hidden className="absolute inset-0 top-2 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <p className="relative flex justify-center text-xs">
                    <span className="bg-card px-4 text-muted-foreground">{t('orContinueWith')}</span>
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="outline" className="h-11 w-full" onClick={notConnected}>
                    <GoogleLogo className="size-4.5" />
                    {t('google')}
                </Button>
                <Button type="button" variant="outline" className="h-11 w-full" onClick={notConnected}>
                    <FacebookLogo className="size-4.5" />
                    {t('facebook')}
                </Button>
            </div>
        </form>
    )
}
