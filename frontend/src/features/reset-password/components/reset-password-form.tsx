'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { ResetPasswordInput } from '@timmyhub/contracts'
import { ResetPasswordSchema } from '@timmyhub/contracts'

import { Button, FloatInput } from '@/components'
import { ROUTE } from '@/constants'
import { useResetPassword } from '@/hooks'
import { toFieldErrorMessage } from '@/utils'

const ON_CARD_LABEL = 'bg-card peer-focus:bg-card peer-autofill:bg-card'

export function ResetPasswordForm() {
    const t = useTranslations('resetPassword')
    const tApi = useTranslations('api')
    const router = useRouter()
    const resetMutation = useResetPassword()
    const [isSuccess, setIsSuccess] = useState(false)

    const [token] = useState(() =>
        typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('token') ?? '') : '',
    )

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordInput>({
        resolver: zodResolver(ResetPasswordSchema),
        mode: 'onChange',
        defaultValues: {
            token,
            newPassword: '',
            confirmPassword: '',
        },
    })

    const onSubmit = (data: ResetPasswordInput) => {
        resetMutation.mutate(
            { ...data, token },
            {
                onSuccess: () => {
                    setIsSuccess(true)
                    toast.success(t('successTitle'))
                    setTimeout(() => {
                        router.push(ROUTE.LOGIN)
                    }, 2000)
                },
                onError: (error) => {
                    const errAny = error as { response?: { data?: { error?: { code?: string } } } }
                    const code = errAny.response?.data?.error?.code
                    if (code) {
                        const key = `error.${code}`
                        if (tApi.has(key)) {
                            toast.error(tApi(key as 'error.RESET_TOKEN_INVALID'))
                            return
                        }
                    }
                    toast.error(t('failed'))
                },
            },
        )
    }

    if (!token) {
        return (
            <div className="flex flex-col items-center text-center space-y-4 py-2">
                <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-base">{t('invalidToken')}</h3>
                </div>
                <div className="pt-2 w-full space-y-2">
                    <Button variant="default" className="w-full text-xs font-semibold" asChild>
                        <Link href={ROUTE.FORGOT_PASSWORD}>{t('backToLogin')}</Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center text-center space-y-4 py-2">
                <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-base">{t('successTitle')}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t('successDescription')}</p>
                </div>
                <div className="pt-2 w-full">
                    <Button variant="outline" className="w-full text-xs font-semibold" asChild>
                        <Link href={ROUTE.LOGIN}>{t('backToLogin')}</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FloatInput
                type="password"
                label={t('newPassword')}
                autoComplete="new-password"
                labelClassName={ON_CARD_LABEL}
                error={toFieldErrorMessage(errors.newPassword?.message, tApi)}
                reserveErrorSpace
                disabled={resetMutation.isPending}
                {...register('newPassword')}
            />

            <FloatInput
                type="password"
                label={t('confirmPassword')}
                autoComplete="new-password"
                labelClassName={ON_CARD_LABEL}
                error={toFieldErrorMessage(errors.confirmPassword?.message, tApi)}
                reserveErrorSpace
                disabled={resetMutation.isPending}
                {...register('confirmPassword')}
            />

            <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={resetMutation.isPending}>
                {resetMutation.isPending ? (
                    t('submitting')
                ) : (
                    <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t('submit')}
                    </>
                )}
            </Button>

            <div className="pt-2 text-center text-xs">
                <Link href={ROUTE.LOGIN} className="font-semibold text-primary hover:underline underline-offset-4">
                    {t('backToLogin')}
                </Link>
            </div>
        </form>
    )
}
