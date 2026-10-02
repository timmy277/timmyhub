'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LockIcon, LockOpenIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { UserSummary } from '@timmyhub/contracts'
import { LockUserSchema, UserStatus } from '@timmyhub/contracts'

import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    FloatInput,
} from '@/components'
import { useSetUserLock } from '@/hooks'
import { toFieldErrorMessage } from '@/utils'

interface UserLockDialogProps {
    user: UserSummary
    onOpenChange: (open: boolean) => void
}

interface LockFormValues {
    reason: string
}

// Khoá / mở khoá tài khoản (REQ-USR-012). Lý do bắt buộc khi khoá nên không dùng `ConfirmDialog` (nó chỉ nhận mô tả
// dạng chữ); hộp thoại này dựng trên primitive `Dialog` + `FloatInput` của dự án.
export function UserLockDialog({ user, onOpenChange }: UserLockDialogProps) {
    const isLocking = user.status === UserStatus.ACTIVE

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const tApi = useTranslations('api')
    const setLock = useSetUserLock({ onSucceeded: () => onOpenChange(false) })

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<LockFormValues>({
        resolver: zodResolver(LockUserSchema),
        mode: 'onChange',
        defaultValues: { reason: '' },
    })

    // ===== Derived =====
    const canConfirm = !isLocking || isValid
    const actionLabel = isLocking ? t('lockAccount') : t('unlockAccount')

    // ===== Handlers =====
    const onConfirmSubmit = (data: LockFormValues) => {
        setLock.mutate({
            userId: user.id,
            locked: isLocking,
            ...(isLocking ? { reason: data.reason.trim() } : {}),
        })
    }

    const handleUnlockDirect = () => {
        setLock.mutate({ userId: user.id, locked: false })
    }

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onOpenChange(false))}>
            <DialogContent className="sm:max-w-md">
                <form
                    onSubmit={
                        isLocking
                            ? handleSubmit(onConfirmSubmit)
                            : (e) => {
                                  e.preventDefault()
                                  handleUnlockDirect()
                              }
                    }
                    noValidate
                >
                    <DialogHeader>
                        <DialogTitle>{actionLabel}</DialogTitle>
                        <DialogDescription>
                            {isLocking
                                ? t('confirmLock', { email: user.email })
                                : t('confirmUnlock', { email: user.email })}
                        </DialogDescription>
                    </DialogHeader>

                    {isLocking && (
                        <div className="py-4">
                            <FloatInput
                                label={t('lockReason')}
                                helperText={t('lockReasonHint')}
                                error={toFieldErrorMessage(errors.reason?.message, tApi)}
                                reserveErrorSpace
                                disabled={setLock.isPending}
                                {...register('reason')}
                            />
                        </div>
                    )}

                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={setLock.isPending}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant={isLocking ? 'destructive' : 'default'}
                            disabled={!canConfirm || setLock.isPending}
                        >
                            {isLocking ? (
                                <LockIcon data-icon="inline-start" />
                            ) : (
                                <LockOpenIcon data-icon="inline-start" />
                            )}
                            {setLock.isPending ? t('saving') : actionLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
