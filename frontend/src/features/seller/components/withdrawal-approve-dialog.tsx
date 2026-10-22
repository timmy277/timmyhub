'use client'

import { useTranslations } from 'next-intl'

import type { WithdrawalDetail } from '@timmyhub/contracts'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Spinner,
} from '@/components'
import { formatCurrencyVND } from '@/utils'

interface WithdrawalApproveDialogProps {
    item: WithdrawalDetail | null
    isOpen: boolean
    isSubmitting: boolean
    onClose: () => void
    onConfirm: (item: WithdrawalDetail) => void
}

export function WithdrawalApproveDialog({
    item,
    isOpen,
    isSubmitting,
    onClose,
    onConfirm,
}: WithdrawalApproveDialogProps) {
    const t = useTranslations('adminWithdrawals')

    if (!item) return null

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="max-w-md rounded-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-bold">{t('approveModalTitle')}</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        {t('approveModalDesc', {
                            amount: formatCurrencyVND(Number(item.amount)),
                            shop: item.shopName || item.bankAccountName,
                        })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="bg-muted/50 p-3 rounded-xl border border-border/60 text-xs space-y-1.5 font-mono">
                    <p className="flex justify-between">
                        <span className="text-muted-foreground">{t('colBank')}:</span>
                        <span className="font-bold text-foreground">{item.bankName}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-muted-foreground">{t('searchPlaceholder')}:</span>
                        <span className="font-bold text-foreground">{item.bankAccountNumber}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-muted-foreground">{t('colShop')}:</span>
                        <span className="font-bold text-foreground">{item.bankAccountName}</span>
                    </p>
                </div>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel disabled={isSubmitting} className="rounded-xl text-xs">
                        {t('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isSubmitting}
                        onClick={(e) => {
                            e.preventDefault()
                            onConfirm(item)
                        }}
                        className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                        {isSubmitting ? <Spinner className="size-4 mr-2" /> : null}
                        {t('approveConfirm')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
