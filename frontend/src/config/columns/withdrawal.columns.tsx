import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { CheckCircle2Icon, CopyIcon, EyeIcon, XCircleIcon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { WithdrawalDetail } from '@timmyhub/contracts'

import { Button, RowActions, StatusBadge, type RowAction } from '@/components'
import { AG_GRID_NO_EXPORT, StatusTone, WITHDRAWAL_STATUS_TONE } from '@/constants'
import { formatCurrencyVND, formatTimestamp, rowActionsColumnWidth } from '@/utils'

export type AdminWithdrawalRow = WithdrawalDetail & { shopName?: string }

export interface WithdrawalColumnActions {
    onDetail?: (item: AdminWithdrawalRow) => void
    onApprove: (item: AdminWithdrawalRow) => void
    onReject: (item: AdminWithdrawalRow) => void
    onCopyAccount: (account: string, id: string) => void
}

type WithdrawalTranslator = ReturnType<typeof useTranslations<'adminWithdrawals'>>

interface CreateWithdrawalColumnsOptions {
    t: WithdrawalTranslator
    actions: WithdrawalColumnActions
}

export function createWithdrawalColumns({ t, actions }: CreateWithdrawalColumnsOptions): ColDef<AdminWithdrawalRow>[] {
    const buildRowActions = (item: AdminWithdrawalRow): RowAction[] => {
        const rowActions: RowAction[] = []

        if (actions.onDetail) {
            rowActions.push({
                key: 'detail',
                label: t('viewDetail'),
                ariaLabel: `${t('viewDetail')} ${item.shopName || item.bankAccountName}`,
                icon: EyeIcon,
                onClick: () => actions.onDetail?.(item),
            })
        }

        if (item.status === 'REQUESTED') {
            rowActions.push(
                {
                    key: 'approve',
                    label: t('approveBtn'),
                    ariaLabel: `${t('approveBtn')} ${item.shopName || item.bankAccountName}`,
                    icon: CheckCircle2Icon,
                    onClick: () => actions.onApprove(item),
                },
                {
                    key: 'reject',
                    label: t('rejectBtn'),
                    ariaLabel: `${t('rejectBtn')} ${item.shopName || item.bankAccountName}`,
                    icon: XCircleIcon,
                    destructive: true,
                    onClick: () => actions.onReject(item),
                },
            )
        }

        return rowActions
    }

    const rowActionWidth = rowActionsColumnWidth(3)

    return [
        {
            field: 'shopName',
            headerName: t('colShop'),
            minWidth: 200,
            flex: 1.2,
            cellRenderer: (params: ICellRendererParams<AdminWithdrawalRow>) => {
                const item = params.data
                if (!item) return null

                return (
                    <div className="flex flex-col justify-center py-1">
                        <span className="font-semibold text-foreground text-sm truncate">
                            {item.shopName || item.bankAccountName}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">ID: {item.id.slice(0, 8)}</span>
                    </div>
                )
            },
        },
        {
            field: 'amount',
            headerName: t('colAmount'),
            minWidth: 150,
            flex: 0.9,
            cellRenderer: (params: ICellRendererParams<AdminWithdrawalRow>) => {
                const item = params.data
                if (!item) return null

                return (
                    <div className="flex items-center h-full">
                        <span className="font-bold text-foreground font-mono text-sm">
                            {formatCurrencyVND(Number(item.amount))}
                        </span>
                    </div>
                )
            },
        },
        {
            field: 'bankName',
            headerName: t('colBank'),
            minWidth: 220,
            flex: 1.4,
            cellRenderer: (params: ICellRendererParams<AdminWithdrawalRow>) => {
                const item = params.data
                if (!item) return null

                return (
                    <div className="flex flex-col justify-center py-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-foreground">{item.bankAccountNumber}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    actions.onCopyAccount(item.bankAccountNumber, item.id)
                                }}
                                className="size-5 text-muted-foreground hover:text-foreground"
                                aria-label="Copy account number"
                            >
                                <CopyIcon className="size-3" />
                            </Button>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{item.bankName}</span>
                        <span className="text-xs text-muted-foreground/80 truncate">
                            {t('accountHolder', { name: item.bankAccountName })}
                        </span>
                    </div>
                )
            },
        },
        {
            field: 'createdAt',
            headerName: t('colDate'),
            minWidth: 160,
            flex: 1,
            cellRenderer: (params: ICellRendererParams<AdminWithdrawalRow>) => {
                const item = params.data
                if (!item) return null

                return (
                    <div className="flex items-center h-full text-xs text-muted-foreground">
                        {formatTimestamp(item.createdAt)}
                    </div>
                )
            },
        },
        {
            field: 'status',
            headerName: t('colStatus'),
            minWidth: 130,
            flex: 0.8,
            cellRenderer: (params: ICellRendererParams<AdminWithdrawalRow>) => {
                const item = params.data
                if (!item) return null

                const tone = WITHDRAWAL_STATUS_TONE[item.status] ?? StatusTone.NEUTRAL
                const labelKey = `status${item.status.charAt(0) + item.status.slice(1).toLowerCase()}` as
                    'statusRequested' | 'statusApproved' | 'statusPaid' | 'statusRejected'
                const label = t(labelKey) || item.status

                return (
                    <div className="flex items-center h-full">
                        <StatusBadge tone={tone} label={label} />
                    </div>
                )
            },
        },
        {
            colId: 'actions',
            headerName: t('colActions'),
            width: rowActionWidth,
            minWidth: rowActionWidth,
            maxWidth: rowActionWidth,
            pinned: 'right',
            sortable: false,
            filter: false,
            suppressHeaderMenuButton: true,
            suppressMovable: true,
            ...AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<AdminWithdrawalRow>) => {
                const item = params.data
                if (!item) return null

                const rowActions = buildRowActions(item)
                if (rowActions.length === 0) return null

                return <RowActions actions={rowActions} />
            },
        },
    ]
}
