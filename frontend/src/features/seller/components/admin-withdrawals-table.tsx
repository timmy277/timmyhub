'use client'

import { useState } from 'react'
import { Check, CheckCircle2, Copy, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { WithdrawalDetail } from '@timmyhub/contracts'
import { Badge, Button } from '@/components'
import { formatCurrencyVND } from '@/utils'

interface AdminWithdrawalsTableProps {
    items: WithdrawalDetail[]
    onApproveClick: (item: WithdrawalDetail) => void
    onRejectClick: (item: WithdrawalDetail) => void
}

export function AdminWithdrawalsTable({ items, onApproveClick, onRejectClick }: AdminWithdrawalsTableProps) {
    const t = useTranslations('adminWithdrawals')
    const tw = useTranslations('sellerWallet')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedId(id)
            toast.success(t('copiedAccount'))
            setTimeout(() => setCopiedId(null), 2000)
        } catch {
            toast.error('Copy failed')
        }
    }

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return (
                    <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-bold"
                    >
                        <CheckCircle2 className="size-3 mr-1" />
                        {tw('statusPaid')}
                    </Badge>
                )
            case 'REJECTED':
                return (
                    <Badge
                        variant="outline"
                        className="border-destructive/30 text-destructive bg-destructive/10 font-bold"
                    >
                        <XCircle className="size-3 mr-1" />
                        {tw('statusRejected')}
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 font-bold">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5" />
                        {tw('statusRequested')}
                    </Badge>
                )
        }
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold">
                        <th className="py-3 px-4">{t('colShop')}</th>
                        <th className="py-3 px-4">{t('colAmount')}</th>
                        <th className="py-3 px-4">{t('colBank')}</th>
                        <th className="py-3 px-4">{t('colDate')}</th>
                        <th className="py-3 px-4">{t('colStatus')}</th>
                        <th className="py-3 px-4 text-right">{t('colActions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {items.map((item) => {
                        const isPending = item.status === 'REQUESTED'
                        const formattedDate = new Date(item.createdAt).toLocaleString('vi-VN')

                        return (
                            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                <td className="py-4 px-4">
                                    <div className="font-bold text-foreground text-sm">
                                        {item.shopName || item.bankAccountName}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground font-mono">
                                        ID: {item.id.slice(0, 8)}
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <p className="text-sm font-extrabold text-foreground">
                                        {formatCurrencyVND(Number(item.amount))}
                                    </p>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="space-y-1">
                                        <p className="font-bold text-foreground flex items-center gap-1.5">
                                            <span>{item.bankName}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(item.bankAccountNumber, item.id)}
                                                className="h-5 px-1.5 py-0 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 bg-muted/60 rounded text-[11px] font-mono"
                                                title={t('copiedAccount')}
                                            >
                                                {copiedId === item.id ? (
                                                    <Check className="size-3 text-emerald-500" />
                                                ) : (
                                                    <Copy className="size-3" />
                                                )}
                                                <span>{item.bankAccountNumber}</span>
                                            </Button>
                                        </p>
                                        <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                                            {t('accountHolder', { name: item.bankAccountName })}
                                        </p>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-muted-foreground">
                                    <p>{formattedDate}</p>
                                    {item.processedAt && (
                                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                                            {tw('statusPaid')}: {new Date(item.processedAt).toLocaleString('vi-VN')}
                                        </p>
                                    )}
                                </td>
                                <td className="py-4 px-4">
                                    {renderStatusBadge(item.status)}
                                    {item.rejectReason && (
                                        <p
                                            className="text-[11px] text-destructive mt-1 max-w-xs truncate"
                                            title={item.rejectReason}
                                        >
                                            {tw('rejectReason', { reason: item.rejectReason })}
                                        </p>
                                    )}
                                </td>
                                <td className="py-4 px-4 text-right">
                                    {isPending ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => onApproveClick(item)}
                                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                                            >
                                                {t('approveBtn')}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onRejectClick(item)}
                                                className="h-7 px-2.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 font-semibold rounded-lg"
                                            >
                                                {t('rejectBtn')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground/60 text-[11px] italic">—</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
