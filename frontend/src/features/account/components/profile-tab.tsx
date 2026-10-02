'use client'

import { useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2Icon, Loader2Icon, RotateCcwIcon, SaveIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import type { UserDetail } from '@timmyhub/contracts'
import { FloatInput, ON_CARD_LABEL_CLASS, UploadSection } from '@/components'
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Label,
} from '@/components/ui'
import { QUERY_KEY } from '@/constants'
import { updateUserAction } from '@/features/users'
import { ProfileFormSchema, type ProfileFormValues } from '@/schemas'
import { useUserProfileStore } from '@/stores'

interface ProfileTabProps {
    user: UserDetail
    onProfileUpdated?: () => void
}

export function ProfileTab({ user, onProfileUpdated }: ProfileTabProps) {
    const t = useTranslations('account.profile')
    const tAccount = useTranslations('account')
    const queryClient = useQueryClient()
    const setOverride = useUserProfileStore((state) => state.setOverride)
    const [isPending, startTransition] = useTransition()

    const defaultValues: ProfileFormValues = {
        firstName: user.profile?.firstName ?? '',
        lastName: user.profile?.lastName ?? '',
        displayName: user.profile?.displayName ?? '',
        phone: user.phone ?? '',
        avatar: user.profile?.avatar ?? null,
    }

    const {
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors, isDirty },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(ProfileFormSchema),
        defaultValues,
    })

    const avatar = useWatch({ control, name: 'avatar' })
    const displayName = useWatch({ control, name: 'displayName' })
    const firstName = useWatch({ control, name: 'firstName' })
    const lastName = useWatch({ control, name: 'lastName' })

    const handleAvatarChange = (val: unknown) => {
        const nextAvatar = typeof val === 'string' || val === null ? val : null
        setValue('avatar', nextAvatar, { shouldDirty: true, shouldValidate: true })
    }

    const handleReset = () => {
        reset(defaultValues)
        toast.info(t('resetNotice'))
    }

    const getErrorText = (key?: string): string | undefined => {
        if (!key) return undefined
        const lookupKey = key.startsWith('account.') ? key.slice('account.'.length) : key
        const translator = tAccount as unknown as { has: (k: string) => boolean; (k: string): string }
        if (translator.has(lookupKey)) {
            return translator(lookupKey)
        }
        return key
    }

    const onSubmit = (data: ProfileFormValues) => {
        startTransition(async () => {
            try {
                const result = await updateUserAction(user.id, {
                    firstName: data.firstName.trim(),
                    lastName: data.lastName.trim(),
                    displayName: data.displayName?.trim() || undefined,
                    phone: data.phone?.trim() ? data.phone.trim() : null,
                    avatar: data.avatar || null,
                })

                if (!result.ok) {
                    toast.error(t('updateFailed', { error: result.code }))
                    return
                }

                // Sync Zustand override for instant header update
                setOverride({
                    displayName: data.displayName?.trim() || `${data.firstName.trim()} ${data.lastName.trim()}`,
                    avatar: data.avatar || null,
                })

                // Invalidate queries so all screens refresh
                await queryClient.invalidateQueries({ queryKey: QUERY_KEY.USERS.NAVBAR_PROFILE })
                await queryClient.invalidateQueries({ queryKey: QUERY_KEY.USERS.ME })
                await queryClient.invalidateQueries({ queryKey: QUERY_KEY.USERS.DETAIL(user.id) })

                toast.success(t('updateSuccess'))
                onProfileUpdated?.()
            } catch {
                toast.error(t('updateFailed', { error: 'INTERNAL' }))
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border border-border/80 shadow-xs">
                <CardHeader>
                    <CardTitle className="text-lg">{t('title')}</CardTitle>
                    <CardDescription>{t('description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar Upload Banner */}
                    <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-muted/30 border border-border/60">
                        <UploadSection
                            variant="avatar"
                            align="center"
                            acceptType="image"
                            name={displayName || `${lastName} ${firstName}` || user.email}
                            value={avatar}
                            onChange={handleAvatarChange}
                            ownerType="AVATAR"
                            ownerId={user.id}
                            disabled={isPending}
                        />
                        <div className="space-y-0.5 text-center">
                            <h4 className="text-sm font-semibold text-foreground">{t('avatarTitle')}</h4>
                            <p className="text-xs text-muted-foreground max-w-xs">{t('avatarHint')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <FloatInput
                            label={t('lastName')}
                            required
                            labelClassName={ON_CARD_LABEL_CLASS}
                            disabled={isPending}
                            error={getErrorText(errors.lastName?.message)}
                            {...register('lastName')}
                        />

                        <FloatInput
                            label={t('firstName')}
                            required
                            labelClassName={ON_CARD_LABEL_CLASS}
                            disabled={isPending}
                            error={getErrorText(errors.firstName?.message)}
                            {...register('firstName')}
                        />
                    </div>

                    <FloatInput
                        label={t('displayName')}
                        labelClassName={ON_CARD_LABEL_CLASS}
                        helperText={t('displayNameHint')}
                        disabled={isPending}
                        error={getErrorText(errors.displayName?.message)}
                        {...register('displayName')}
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="relative">
                            <FloatInput
                                label={t('email')}
                                value={user.email}
                                readOnly
                                disabled
                                labelClassName={ON_CARD_LABEL_CLASS}
                                helperText={t('emailHint')}
                            />
                            <div className="absolute right-3 top-3.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2Icon className="h-4 w-4" />
                                <span>{user.isEmailVerified ? t('emailVerified') : t('emailSystem')}</span>
                            </div>
                        </div>

                        <FloatInput
                            label={t('phone')}
                            labelClassName={ON_CARD_LABEL_CLASS}
                            helperText={t('phoneHint')}
                            disabled={isPending}
                            error={getErrorText(errors.phone?.message)}
                            {...register('phone')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{t('roles')}</Label>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {(user.roles ?? []).map((role) => (
                                <Badge key={role} variant="secondary" className="px-2.5 py-1 text-xs font-medium">
                                    {role}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-6 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={isPending || !isDirty}
                        className="gap-1.5"
                    >
                        <RotateCcwIcon className="h-4 w-4" />
                        {t('reset')}
                    </Button>
                    <Button type="submit" size="sm" disabled={isPending || !isDirty} className="gap-1.5">
                        {isPending ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                            <SaveIcon className="h-4 w-4" />
                        )}
                        {t('save')}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}
