'use client'

import { useState } from 'react'
import { LockIcon, LockOpenIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { UserSummary } from '@timmyhub/contracts'
import { UserStatus } from '@timmyhub/contracts'

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

interface UserLockDialogProps {
    user: UserSummary
    onOpenChange: (open: boolean) => void
}

// Khoá / mở khoá tài khoản (REQ-USR-012). Lý do bắt buộc khi khoá nên không dùng `ConfirmDialog` (nó chỉ nhận mô tả
// dạng chữ); hộp thoại này dựng trên primitive `Dialog` + `FloatInput` của dự án.
// 7 trạng thái: mặc định · đang tải (nút xác nhận quay, input khoá) · rỗng (N/A) · lỗi (toast ở hook, hộp thoại giữ mở
// để nhập lại) · không có quyền (nút mở hộp thoại không hiện) · vô hiệu hoá (lý do rỗng → không bấm được) ·
// thành công (toast + đóng + bảng dựng lại).
export function UserLockDialog({ user, onOpenChange }: UserLockDialogProps) {
    const isLocking = user.status === UserStatus.ACTIVE

    // ===== State =====
    const [reason, setReason] = useState('')

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const setLock = useSetUserLock({ onSucceeded: () => onOpenChange(false) })

    // ===== Derived =====
    const canConfirm = !isLocking || reason.trim().length > 0
    const actionLabel = isLocking ? t('lockAccount') : t('unlockAccount')

    // ===== Handlers =====
    const handleConfirm = () => {
        if (!canConfirm) return
        setLock.mutate({ userId: user.id, locked: isLocking, ...(isLocking ? { reason: reason.trim() } : {}) })
    }

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onOpenChange(false))}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{actionLabel}</DialogTitle>
                    <DialogDescription>
                        {isLocking
                            ? t('confirmLock', { email: user.email })
                            : t('confirmUnlock', { email: user.email })}
                    </DialogDescription>
                </DialogHeader>

                {isLocking && (
                    <FloatInput
                        label={t('lockReason')}
                        helperText={t('lockReasonHint')}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        disabled={setLock.isPending}
                    />
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={setLock.isPending}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant={isLocking ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={!canConfirm || setLock.isPending}
                    >
                        {isLocking ? <LockIcon data-icon="inline-start" /> : <LockOpenIcon data-icon="inline-start" />}
                        {setLock.isPending ? t('saving') : actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
