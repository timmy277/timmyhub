'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon, KeyRoundIcon, Loader2Icon, ShieldCheckIcon, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import type { UserDetail } from '@timmyhub/contracts'
import { FloatInput, ON_CARD_LABEL_CLASS } from '@/components'
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui'
import { ChangePasswordFormSchema, type ChangePasswordFormValues } from '@/schemas'

interface SecurityTabProps {
    user: UserDetail
}

export function SecurityTab({ user }: SecurityTabProps) {
    const t = useTranslations('account.security')
    const tAccount = useTranslations('account')

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting, isValid },
    } = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(ChangePasswordFormSchema),
        mode: 'onChange',
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    const newPassword = useWatch({ control, name: 'newPassword' }) || ''
    const confirmPassword = useWatch({ control, name: 'confirmPassword' }) || ''

    // Password criteria checks
    const hasMinLength = newPassword.length >= 8
    const hasLetter = /[a-zA-Z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const isMatching = newPassword === confirmPassword && confirmPassword.length > 0

    const getErrorText = (key?: string): string | undefined => {
        if (!key) return undefined
        const lookupKey = key.startsWith('account.') ? key.slice('account.'.length) : key
        const translator = tAccount as unknown as { has: (k: string) => boolean; (k: string): string }
        if (translator.has(lookupKey)) {
            return translator(lookupKey)
        }
        return key
    }

    const onSubmit = async () => {
        try {
            // Simulated change password action until dedicated backend route is ready
            await new Promise((resolve) => setTimeout(resolve, 800))
            toast.success(t('updateSuccess'))
            reset()
        } catch {
            toast.error(t('updateFailed'))
        }
    }

    return (
        <div className="space-y-6">
            {/* Đổi mật khẩu */}
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="border border-border/80 shadow-xs">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <KeyRoundIcon className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{t('title')}</CardTitle>
                        </div>
                        <CardDescription>{t('description')}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <FloatInput
                            type="password"
                            label={t('currentPassword')}
                            required
                            labelClassName={ON_CARD_LABEL_CLASS}
                            error={getErrorText(errors.currentPassword?.message)}
                            {...register('currentPassword')}
                        />

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <FloatInput
                                type="password"
                                label={t('newPassword')}
                                required
                                labelClassName={ON_CARD_LABEL_CLASS}
                                error={getErrorText(errors.newPassword?.message)}
                                {...register('newPassword')}
                            />

                            <FloatInput
                                type="password"
                                label={t('confirmPassword')}
                                required
                                labelClassName={ON_CARD_LABEL_CLASS}
                                error={getErrorText(errors.confirmPassword?.message)}
                                {...register('confirmPassword')}
                            />
                        </div>

                        {/* Tiêu chí mật khẩu */}
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 space-y-2">
                            <p className="text-xs font-medium text-foreground">{t('checklistTitle')}</p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                    {hasMinLength ? (
                                        <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span
                                        className={
                                            hasMinLength ? 'text-foreground font-medium' : 'text-muted-foreground'
                                        }
                                    >
                                        {t('reqLength')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {hasLetter ? (
                                        <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span
                                        className={hasLetter ? 'text-foreground font-medium' : 'text-muted-foreground'}
                                    >
                                        {t('reqLetter')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {hasNumber ? (
                                        <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span
                                        className={hasNumber ? 'text-foreground font-medium' : 'text-muted-foreground'}
                                    >
                                        {t('reqNumber')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {isMatching ? (
                                        <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span
                                        className={isMatching ? 'text-foreground font-medium' : 'text-muted-foreground'}
                                    >
                                        {t('reqMatch')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-end border-t border-border/50 bg-muted/20 px-6 py-4">
                        <Button type="submit" size="sm" disabled={!isValid || isSubmitting} className="gap-1.5">
                            {isSubmitting ? (
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                            ) : (
                                <ShieldCheckIcon className="h-4 w-4" />
                            )}
                            {t('submit')}
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            {/* Thông tin bảo mật bổ sung */}
            <Card className="border border-border/80 shadow-xs">
                <CardHeader>
                    <CardTitle className="text-lg">{t('twoFactorTitle')}</CardTitle>
                    <CardDescription>{t('twoFactorDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{t('twoFactorTitle')}</p>
                        <p className="text-xs text-muted-foreground">
                            {user.twoFactorEnabled ? 'TOTP' : t('statusNotEnabled')}
                        </p>
                    </div>
                    <Badge variant={user.twoFactorEnabled ? 'default' : 'outline'} className="text-xs">
                        {user.twoFactorEnabled ? 'Active' : t('statusNotEnabled')}
                    </Badge>
                </CardContent>
            </Card>
        </div>
    )
}
