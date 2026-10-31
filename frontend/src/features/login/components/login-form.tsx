'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { LoginInput } from '@timmyhub/contracts'
import { LoginSchema } from '@timmyhub/contracts'

import { Button, FloatInput, IconPath } from '@/components'
import { BACKEND_UNAVAILABLE_CODE, ROUTE } from '@/constants'
import { useLogin } from '@/hooks'
import { toFieldErrorMessage } from '@/utils'

import { LoginError } from '../errors'

// Label nổi của field nằm trên card nên phần "cắt viền" phải cùng màu card, không phải màu nền trang.
const ON_CARD_LABEL = 'bg-card peer-focus:bg-card peer-autofill:bg-card'

// Zod message là khoá i18n (`validation.*`) — BE trả qua catalog `api` (i18n/request.ts gắn sẵn).
export function LoginForm() {
    // ===== Hooks =====
    const t = useTranslations('login')
    // Zod message là khoá thông điệp (`validation.*`) — dịch qua catalog `api` gắn sẵn trong i18n/request.ts.
    const tApi = useTranslations('api')
    const login = useLogin()
    const [emailParam] = useState(() =>
        typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('email') ?? '') : '',
    )

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(LoginSchema),
        mode: 'onChange',
        defaultValues: {
            email: emailParam,
            password: '',
        },
    })

    const [ssoPending, setSsoPending] = useState<'google' | 'facebook' | null>(null)

    // ===== Effects =====
    // Hiển thị toast lỗi nếu được redirect từ OAuth/SSO callback về kèm ?error=...
    useEffect(() => {
        const errorParam = new URLSearchParams(window.location.search).get('error')
        if (!errorParam) return

        if (errorParam === BACKEND_UNAVAILABLE_CODE) {
            toast.error(t('loginUnavailable'))
            return
        }

        const key = `error.${errorParam}`
        if (tApi.has(key)) {
            toast.error(tApi(key as 'error.ACCOUNT_LOCKED'))
        } else {
            toast.error(t('loginFailed'))
        }
    }, [t, tApi])

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
            toast.error(t('loginFailed'))
        }
    }

    // Mã lỗi trả về từ NextAuth/BE → thông điệp: mã của BE dịch qua catalog `api` (chung với BE), mã riêng
    // của FE (không gọi được backend) có câu riêng, còn lại dùng câu chung. Không phân biệt "email không tồn
    // tại" với "sai mật khẩu" — backend đã trả cùng một mã cho cả hai.
    const loginErrorMessage = (error: unknown): string => {
        const code = error instanceof LoginError ? error.code : null
        if (code === BACKEND_UNAVAILABLE_CODE) return t('loginUnavailable')
        // Mã lỗi của backend dịch qua catalog `api` — khoá là `error.<MÃ>` (cùng catalog BE dùng để dịch), nên
        // ACCOUNT_LOCKED / ACCOUNT_BANNED hiện đúng câu thay vì câu chung.
        const key = `error.${code}`
        if (code && tApi.has(key)) return tApi(key as 'error.ACCOUNT_LOCKED')
        return t('loginFailed')
    }

    const onSubmit = (data: LoginInput) => {
        login.mutate(data, {
            onError: (error) => {
                toast.error(loginErrorMessage(error))
            },
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2" noValidate>
            <FloatInput
                type="email"
                label={t('email')}
                autoComplete="email"
                labelClassName={ON_CARD_LABEL}
                error={toFieldErrorMessage(errors.email?.message, tApi)}
                reserveErrorSpace
                disabled={login.isPending}
                {...register('email')}
            />
            <FloatInput
                type="password"
                label={t('password')}
                autoComplete="current-password"
                labelClassName={ON_CARD_LABEL}
                error={toFieldErrorMessage(errors.password?.message, tApi)}
                reserveErrorSpace
                disabled={login.isPending}
                {...register('password')}
            />

            <div className="flex justify-end">
                <Button type="button" variant="link" className="h-auto min-h-6 p-0 text-xs font-semibold" asChild>
                    <Link href={ROUTE.FORGOT_PASSWORD}>{t('forgotPassword')}</Link>
                </Button>
            </div>

            <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={login.isPending}>
                {login.isPending ? t('loggingIn') : t('submit')}
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
                    disabled={login.isPending || ssoPending !== null}
                    onClick={() => handleSso('google')}
                >
                    <IconPath name="google" className="size-4.5" />
                    {ssoPending === 'google' ? t('loggingIn') : t('google')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={login.isPending || ssoPending !== null}
                    onClick={() => handleSso('facebook')}
                >
                    <IconPath name="facebook" className="size-4.5" />
                    {ssoPending === 'facebook' ? t('loggingIn') : t('facebook')}
                </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-3">
                {t('noAccount')}{' '}
                <Link href={ROUTE.REGISTER} className="font-semibold text-primary hover:underline">
                    {t('registerNow')}
                </Link>
            </p>
        </form>
    )
}
