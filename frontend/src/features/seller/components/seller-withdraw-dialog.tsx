'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CreditCard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { CreateWithdrawalInput } from '@timmyhub/contracts'
import { CreateWithdrawalInputSchema } from '@timmyhub/contracts'
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
import { QUERY_KEY } from '@/constants'
import { formatCurrencyVND } from '@/utils'
import { requestWithdrawalAction } from '../actions'

const POPULAR_BANKS = ['Vietcombank', 'Techcombank', 'MB Bank', 'BIDV', 'VietinBank', 'ACB', 'VPBank', 'TPBank']

interface SellerWithdrawDialogProps {
    isOpen: boolean
    availableBalance: number
    initialBank?: {
        name: string
        accountNumber: string
        accountName: string
    }
    onClose: () => void
}

export function SellerWithdrawDialog({ isOpen, availableBalance, initialBank, onClose }: SellerWithdrawDialogProps) {
    const t = useTranslations('sellerWallet')
    const queryClient = useQueryClient()

    const [amount, setAmount] = useState('')
    const [bankName, setBankName] = useState(initialBank?.name || '')
    const [bankAccountNumber, setBankAccountNumber] = useState(initialBank?.accountNumber || '')
    const [bankAccountName, setBankAccountName] = useState(initialBank?.accountName || '')
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const withdrawMutation = useMutation({
        mutationFn: async (input: CreateWithdrawalInput) => {
            const res = await requestWithdrawalAction(input)
            if (!res.ok) throw new Error(res.code || 'WITHDRAW_FAILED')
            return res.data
        },
        onSuccess: () => {
            toast.success(t('withdrawSuccess'))
            setAmount('')
            onClose()
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.WALLET })
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.WITHDRAWALS })
        },
        onError: (err: Error) => {
            toast.error(t('withdrawError', { error: err.message }))
        },
    })

    const handleSubmit = () => {
        setFormErrors({})
        const parsedAmount = Number(amount)

        if (!parsedAmount || parsedAmount < 50000) {
            setFormErrors({ amount: t('errorMinAmount') })
            return
        }
        if (parsedAmount > availableBalance) {
            setFormErrors({ amount: t('errorMaxAmount') })
            return
        }

        const input: CreateWithdrawalInput = {
            amount: parsedAmount,
            bankName: bankName.trim(),
            bankAccountNumber: bankAccountNumber.trim(),
            bankAccountName: bankAccountName.trim(),
        }

        const validation = CreateWithdrawalInputSchema.safeParse(input)
        if (!validation.success) {
            const errs: Record<string, string> = {}
            for (const issue of validation.error.issues) {
                const path = issue.path[0]?.toString() || 'general'
                errs[path] = issue.message
            }
            setFormErrors(errs)
            return
        }

        withdrawMutation.mutate(input)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <CreditCard className="size-5 text-primary" />
                        <span>{t('withdrawModalTitle')}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">{t('withdrawModalDesc')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <FloatInput
                            id="withdraw-amount"
                            label={t('withdrawAmount')}
                            type="number"
                            min={50000}
                            max={availableBalance}
                            step={10000}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-1 px-1 text-[11px] text-muted-foreground">
                            <span>{t('withdrawMinHint', { max: formatCurrencyVND(availableBalance) })}</span>
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                onClick={() => setAmount(String(availableBalance))}
                                className="h-auto p-0 text-primary font-bold text-[11px]"
                            >
                                {t('withdrawAll')}
                            </Button>
                        </div>
                        {formErrors.amount && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle className="size-3" />
                                {formErrors.amount}
                            </p>
                        )}
                    </div>

                    <div>
                        <FloatInput
                            id="withdraw-bank-name"
                            label={t('bankName')}
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                        />
                        <div className="flex gap-1.5 flex-wrap mt-1.5">
                            {POPULAR_BANKS.slice(0, 5).map((b) => (
                                <Button
                                    key={b}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setBankName(b)}
                                    className="text-[11px] h-6 px-2.5 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors border-border/60"
                                >
                                    {b}
                                </Button>
                            ))}
                        </div>
                        {formErrors.bankName && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle className="size-3" />
                                {formErrors.bankName}
                            </p>
                        )}
                    </div>

                    <div>
                        <FloatInput
                            id="withdraw-account-number"
                            label={t('accountNumber')}
                            value={bankAccountNumber}
                            onChange={(e) => setBankAccountNumber(e.target.value)}
                        />
                        {formErrors.bankAccountNumber && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle className="size-3" />
                                {formErrors.bankAccountNumber}
                            </p>
                        )}
                    </div>

                    <div>
                        <FloatInput
                            id="withdraw-account-name"
                            label={t('accountName')}
                            value={bankAccountName}
                            onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                        />
                        {formErrors.bankAccountName && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle className="size-3" />
                                {formErrors.bankAccountName}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={withdrawMutation.isPending}
                        className="rounded-xl text-xs"
                        onClick={onClose}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        type="button"
                        disabled={withdrawMutation.isPending || !amount || Number(amount) < 50000}
                        onClick={handleSubmit}
                        className="rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90"
                    >
                        {withdrawMutation.isPending ? <Spinner className="size-4 mr-2" /> : null}
                        {t('confirmWithdraw')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
