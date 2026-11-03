'use client'

import { CheckCircle2Icon, CopyIcon, CreditCardIcon, LandmarkIcon, XCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button, StatusBadge } from '@/components'
import type { AdminWithdrawalRow } from '@/config'
import { StatusTone, WITHDRAWAL_STATUS_TONE } from '@/constants'
import { formatCurrencyVND, formatTimestamp } from '@/utils'

interface WithdrawalDetailPanelProps {
    withdrawal: AdminWithdrawalRow
    onApprove: (item: AdminWithdrawalRow) => void
    onReject: (item: AdminWithdrawalRow) => void
}

export function WithdrawalDetailPanel({ withdrawal, onApprove, onReject }: WithdrawalDetailPanelProps) {
    // ===== Hooks =====
    const t = useTranslations('adminWithdrawals')

    // ===== Derived =====
    const tone = WITHDRAWAL_STATUS_TONE[withdrawal.status] ?? StatusTone.NEUTRAL
    const labelKey = `status${withdrawal.status.charAt(0) + withdrawal.status.slice(1).toLowerCase()}` as
        'statusRequested' | 'statusApproved' | 'statusPaid' | 'statusRejected'
    const statusLabel = t(labelKey) || withdrawal.status

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success(t('copiedAccount'))
        } catch {
            toast.error('Copy failed')
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Top overview card */}
            <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            {formatCurrencyVND(Number(withdrawal.amount))}
                        </span>
                        <StatusBadge tone={tone} label={statusLabel} />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">ID: {withdrawal.id}</span>
                </div>

                {withdrawal.status === 'REQUESTED' && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => onReject(withdrawal)}
                            className="gap-1.5 text-xs font-semibold"
                        >
                            <XCircleIcon className="size-4" />
                            {t('rejectBtn')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => onApprove(withdrawal)}
                            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <CheckCircle2Icon className="size-4" />
                            {t('approveBtn')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Details Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Bank Account Info */}
                <div className="rounded-xl border p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3">
                        <LandmarkIcon className="size-4 text-primary" />
                        <h2 className="text-sm font-semibold">{t('colBank')}</h2>
                    </div>
                    <dl className="grid gap-y-3 text-xs">
                        <div>
                            <dt className="text-muted-foreground">{t('colBank')}</dt>
                            <dd className="mt-0.5 font-medium text-foreground text-sm">{withdrawal.bankName}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Số tài khoản</dt>
                            <dd className="mt-0.5 flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold text-foreground">
                                    {withdrawal.bankAccountNumber}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCopy(withdrawal.bankAccountNumber)}
                                    className="size-5 text-muted-foreground hover:text-foreground"
                                >
                                    <CopyIcon className="size-3" />
                                </Button>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Chủ tài khoản</dt>
                            <dd className="mt-0.5 font-medium text-foreground text-sm">{withdrawal.bankAccountName}</dd>
                        </div>
                    </dl>
                </div>

                {/* Shop & Request Info */}
                <div className="rounded-xl border p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3">
                        <CreditCardIcon className="size-4 text-primary" />
                        <h2 className="text-sm font-semibold">{t('colShop')}</h2>
                    </div>
                    <dl className="grid gap-y-3 text-xs">
                        <div>
                            <dt className="text-muted-foreground">Tên Shop / Người bán</dt>
                            <dd className="mt-0.5 font-medium text-foreground text-sm">
                                {withdrawal.shopName || withdrawal.bankAccountName}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Mã ví (Wallet ID)</dt>
                            <dd className="mt-0.5 font-mono text-muted-foreground break-all">{withdrawal.walletId}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">{t('colDate')}</dt>
                            <dd className="mt-0.5 text-muted-foreground">{formatTimestamp(withdrawal.createdAt)}</dd>
                        </div>
                        {withdrawal.rejectReason && (
                            <div>
                                <dt className="text-destructive font-medium">Lý do từ chối</dt>
                                <dd className="mt-0.5 text-destructive bg-destructive/10 p-2.5 rounded-lg">
                                    {withdrawal.rejectReason}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>
        </div>
    )
}
