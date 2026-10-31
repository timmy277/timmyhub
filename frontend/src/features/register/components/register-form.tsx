'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { RegisterFormInput } from '@timmyhub/contracts'
import { RegisterFormSchema } from '@timmyhub/contracts'

import { Button, FloatInput, IconPath } from '@/components'
import { ROUTE } from '@/constants'
import { useRegister } from '@/hooks'
import { toFieldErrorMessage } from '@/utils'

// Label nổi của field nằm trên card nên phần "cắt viền" phải cùng màu card, không phải màu nền trang.
const ON_CARD_LABEL = 'bg-card peer-focus:bg-card peer-autofill:bg-card'

export function RegisterForm() {
    // ===== Hooks =====
    const t = useTranslations('register')
    const tApi = useTranslations('api')
    const registerMutation = useRegister()
    const [ssoPending, setSsoPending] = useState<'google' | 'facebook' | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormInput>({
        resolver: zodResolver(RegisterFormSchema),
        mode: 'onChange',
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    })

    // ===== Handlers =====
    const handleSso = async (provider: 'google' | 'facebook') => {
        try {
            setSsoPending(provider)
            const callbackUrlParam = new URLSearchParams(window.location.search).get('callbackUrl')
            const callbackUrl = callbackUrlParam
                ? `/api/auth/redirect?callbackUrl=${encodeURIComponent(callbackUrlParam)}`
                : '/api/auth/redirect'
            await signIn(provider, { callbackUrl })
        } catch {
            setSsoPending(null)
            toast.error(t('registerFailed'))
        }
    }

    const registerErrorMessage = (error: unknown): string => {
        const errAny = error as { response?: { data?: { error?: { code?: string } } }; message?: string }
        const code = errAny.response?.data?.error?.code
        if (code) {
            const key = `error.${code}`
            if (tApi.has(key)) return tApi(key as 'error.ACCOUNT_LOCKED')
        }
        if (errAny.message?.includes('Network') || !errAny.response) {
            return t('registerUnavailable')
        }
        return t('registerFailed')
    }

    const onSubmit = (data: RegisterFormInput) => {
        registerMutation.mutate(data, {
            onSuccess: () => {
                toast.success(t('registerSuccess'))
            },
            onError: (error) => {
                toast.error(registerErrorMessage(error))
            },
        })
    }

    const isPending = registerMutation.isPending || ssoPending !== null

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2" noValidate>
            <div className="grid grid-cols-2 gap-3">
                <FloatInput
                    type="text"
                    label={t('lastName')}
                    autoComplete="family-name"
                    labelClassName={ON_CARD_LABEL}
                    error={toFieldErrorMessage(errors.lastName?.message, tApi)}
                    reserveErrorSpace
                    disabled={isPending}
                    {...register('lastName')}
                />
                <FloatInput
                    type="text"
                    label={t('firstName')}
                    autoComplete="given-name"
                    labelClassName={ON_CARD_LABEL}
                    error={toFieldErrorMessage(errors.firstName?.message, tApi)}
                    reserveErrorSpace
                    disabled={isPending}
                    {...register('firstName')}
                />
            </div>

            <FloatInput
                type="email"
                label={t('email')}
                autoComplete="email"
                labelClassName={ON_CARD_LABEL}
                error={toFieldErrorMessage(errors.email?.message, tApi)}
                reserveErrorSpace
                disabled={isPending}
                {...register('email')}
            />

            <FloatInput
                type="password"
                label={t('password')}
                autoComplete="new-password"
                labelClassName={ON_CARD_LABEL}
                error={toFieldErrorMessage(errors.password?.message, tApi)}
                reserveErrorSpace
                disabled={isPending}
                {...register('password')}
            />

            <FloatInput
                type="password"
                label={t('confirmPassword')}
                autoComplete="new-password"
                labelClassName={ON_CARD_LABEL}
                error={toFieldErrorMessage(errors.confirmPassword?.message, tApi)}
                reserveErrorSpace
                disabled={isPending}
                {...register('confirmPassword')}
            />

            <Button type="submit" className="h-11 w-full text-sm font-semibold mt-1" disabled={isPending}>
                {registerMutation.isPending ? t('submitting') : t('submit')}
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
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={isPending}
                    onClick={() => handleSso('google')}
                >
                    <IconPath name="google" className="size-4.5" />
                    {ssoPending === 'google' ? t('submitting') : t('google')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={isPending}
                    onClick={() => handleSso('facebook')}
                >
                    <IconPath name="facebook" className="size-4.5" />
                    {ssoPending === 'facebook' ? t('submitting') : t('facebook')}
                </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-3">
                {t('hasAccount')}{' '}
                <Link href={ROUTE.LOGIN} className="font-semibold text-primary hover:underline">
                    {t('loginNow')}
                </Link>
            </p>
        </form>
    )
}
