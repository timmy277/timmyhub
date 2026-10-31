'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, ArrowLeft, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { ForgotPasswordInput } from '@timmyhub/contracts'
import { ForgotPasswordSchema } from '@timmyhub/contracts'

import { Button, FloatInput } from '@/components'
import { ROUTE } from '@/constants'
import { useForgotPassword } from '@/hooks'
import { toFieldErrorMessage } from '@/utils'

const ON_CARD_LABEL = 'bg-card peer-focus:bg-card peer-autofill:bg-card'

export function ForgotPasswordForm() {
    const t = useTranslations('forgotPassword')
    const tApi = useTranslations('api')
    const forgotPasswordMutation = useForgotPassword()
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(ForgotPasswordSchema),
        mode: 'onChange',
        defaultValues: {
            email: '',
        },
    })

    const onSubmit = (data: ForgotPasswordInput) => {
        forgotPasswordMutation.mutate(data, {
            onSuccess: () => {
                setSubmittedEmail(data.email)
            },
            onError: () => {
                toast.error(t('failed'))
            },
        })
    }

    if (submittedEmail) {
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
                        <Link href={ROUTE.LOGIN}>
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                            {t('backToLogin')}
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FloatInput
                type="email"
                label={t('email')}
                autoComplete="email"
                labelClassName={ON_CARD_LABEL}
                error={toFieldErrorMessage(errors.email?.message, tApi)}
                reserveErrorSpace
                disabled={forgotPasswordMutation.isPending}
                {...register('email')}
            />

            <Button
                type="submit"
                className="h-11 w-full text-sm font-semibold"
                disabled={forgotPasswordMutation.isPending}
            >
                {forgotPasswordMutation.isPending ? (
                    t('submitting')
                ) : (
                    <>
                        <Mail className="mr-2 h-4 w-4" />
                        {t('submit')}
                    </>
                )}
            </Button>

            <div className="pt-2 text-center text-xs">
                <Link
                    href={ROUTE.LOGIN}
                    className="font-semibold text-primary hover:underline underline-offset-4 inline-flex items-center"
                >
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                    {t('backToLogin')}
                </Link>
            </div>
        </form>
    )
}
