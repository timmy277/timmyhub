'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import type { WithdrawalDetail } from '@timmyhub/contracts'
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    FloatInput,
    Spinner,
} from '@/components'
import { formatCurrencyVND } from '@/utils'

interface WithdrawalRejectDialogProps {
    item: WithdrawalDetail | null
    isOpen: boolean
    isSubmitting: boolean
    onClose: () => void
    onConfirm: (item: WithdrawalDetail, reason: string) => void
}

export function WithdrawalRejectDialog({
    item,
    isOpen,
    isSubmitting,
    onClose,
    onConfirm,
}: WithdrawalRejectDialogProps) {
    const t = useTranslations('adminWithdrawals')
    const [reason, setReason] = useState('')
    const [error, setError] = useState<string | null>(null)

    if (!item) return null

    const quickReasons = [t('quickReason1'), t('quickReason2'), t('quickReason3'), t('quickReason4')]

    const handleConfirm = () => {
        const trimmed = reason.trim()
        if (!trimmed) {
            setError(t('rejectReasonRequired'))
            return
        }
        setError(null)
        onConfirm(item, trimmed)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-destructive">{t('rejectModalTitle')}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        {t('rejectModalDesc', {
                            amount: formatCurrencyVND(Number(item.amount)),
                            shop: item.shopName || item.bankAccountName,
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-1">
                    <FloatInput
                        id="reject-reason"
                        label={t('rejectReasonLabel')}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value)
                            if (error) setError(null)
                        }}
                    />
                    {error && <p className="text-xs text-destructive font-medium">{error}</p>}

                    <div className="flex flex-wrap gap-1.5">
                        {quickReasons.map((r) => (
                            <Button
                                key={r}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setReason(r)
                                    if (error) setError(null)
                                }}
                                className="h-6 text-[11px] px-2 py-0 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                            >
                                {r}
                            </Button>
                        ))}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        className="rounded-xl text-xs"
                        onClick={onClose}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={isSubmitting}
                        onClick={handleConfirm}
                        className="rounded-xl text-xs font-bold"
                    >
                        {isSubmitting ? <Spinner className="size-4 mr-2" /> : null}
                        {t('rejectConfirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
