'use client'

import { type FormEvent, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { LoginSchema } from '@timmyhub/contracts'

import { Button, FloatInput, IconPath } from '@/components'
import { BACKEND_UNAVAILABLE_CODE } from '@/constants'
import { useLogin } from '@/hooks'
import { toFieldErrors } from '@/utils'

import { LoginError } from '../errors'

// Label nổi của field nằm trên card nên phần "cắt viền" phải cùng màu card, không phải màu nền trang.
const ON_CARD_LABEL = 'bg-card peer-focus:bg-card peer-autofill:bg-card'

// Zod message là khoá i18n (`validation.*`) — BE trả qua catalog `api` (i18n/request.ts gắn sẵn).
export function LoginForm() {
    // ===== State =====
    const [errors, setErrors] = useState<Record<string, string>>({})

    // ===== Hooks =====
    const t = useTranslations('login')
    // Zod message là khoá thông điệp (`validation.*`) — dịch qua catalog `api` gắn sẵn trong i18n/request.ts.
    const tApi = useTranslations('api')
    const login = useLogin()

    // ===== Handlers =====
    const notConnected = () => {
        toast.info(t('notConnected'))
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

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const raw = { email: formData.get('email') as string, password: formData.get('password') as string }

        const result = LoginSchema.safeParse(raw)
        if (!result.success) {
            // issue.message là khoá `validation.*` (không phải câu) — dịch qua catalog `api`.
            setErrors(toFieldErrors(result.error.issues, tApi))
            return
        }

        setErrors({})
        login.mutate(result.data, {
            onError: (error) => {
                toast.error(loginErrorMessage(error))
            },
        })
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
                <FloatInput
                    type="email"
                    name="email"
                    label={t('email')}
                    autoComplete="email"
                    labelClassName={ON_CARD_LABEL}
                    aria-invalid={!!errors.email}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
            <div>
                <FloatInput
                    type="password"
                    name="password"
                    label={t('password')}
                    autoComplete="current-password"
                    labelClassName={ON_CARD_LABEL}
                    aria-invalid={!!errors.password}
                />
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="link"
                    className="h-auto min-h-6 p-0 text-xs font-semibold"
                    onClick={notConnected}
                >
                    {t('forgotPassword')}
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
                <Button type="button" variant="outline" className="h-11 w-full" onClick={notConnected}>
                    <IconPath name="google" className="size-4.5" />
                    {t('google')}
                </Button>
                <Button type="button" variant="outline" className="h-11 w-full" onClick={notConnected}>
                    <IconPath name="facebook" className="size-4.5" />
                    {t('facebook')}
                </Button>
            </div>
        </form>
    )
}
