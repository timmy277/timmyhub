import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import type { ReactNode } from 'react'
import { CheckCircle2Icon, EyeIcon, StoreIcon, XCircleIcon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { SellerApplicationDetail } from '@timmyhub/contracts'
import { ResourceStatus } from '@timmyhub/contracts'

import { Button, RowActions, StatusBadge, UserAvatar, type RowAction } from '@/components'
import { AG_GRID_NO_EXPORT, SELLER_APPLICATION_STATUS_TONE, StatusTone } from '@/constants'
import { formatTimestamp, rowActionsColumnWidth } from '@/utils'

export interface SellerApplicationColumnActions {
    onDetail: (app: SellerApplicationDetail) => void
    onApprove: (app: SellerApplicationDetail) => void
    onReject: (app: SellerApplicationDetail) => void
}

type SellerTranslator = ReturnType<typeof useTranslations<'sellerApplications'>>

interface CreateSellerApplicationColumnsOptions {
    t: SellerTranslator
    actions: SellerApplicationColumnActions
    renderDocument: (application: SellerApplicationDetail) => ReactNode
}

export function createSellerApplicationColumns({
    t,
    actions,
    renderDocument,
}: CreateSellerApplicationColumnsOptions): ColDef<SellerApplicationDetail>[] {
    const buildRowActions = (app: SellerApplicationDetail): RowAction[] => {
        const rowActions: RowAction[] = [
            {
                key: 'view',
                label: t('viewDetail'),
                ariaLabel: `${t('viewDetail')} ${app.shopName}`,
                icon: EyeIcon,
                onClick: () => actions.onDetail(app),
            },
        ]

        if (app.status === ResourceStatus.PENDING) {
            rowActions.push(
                {
                    key: 'approve',
                    label: t('approveAction'),
                    ariaLabel: `${t('approveAction')} ${app.shopName}`,
                    icon: CheckCircle2Icon,
                    onClick: () => actions.onApprove(app),
                },
                {
                    key: 'reject',
                    label: t('rejectAction'),
                    ariaLabel: `${t('rejectAction')} ${app.shopName}`,
                    icon: XCircleIcon,
                    destructive: true,
                    onClick: () => actions.onReject(app),
                },
            )
        }

        return rowActions
    }

    const getStatusLabel = (status: string): string => {
        if (status === ResourceStatus.PENDING) return t('statusPending')
        if (status === ResourceStatus.APPROVED) return t('statusApproved')
        if (status === ResourceStatus.REJECTED) return t('statusRejected')
        return status
    }

    return [
        {
            headerName: t('columnShop'),
            field: 'shopName',
            flex: 1.4,
            minWidth: 200,
            cellRenderer: (params: ICellRendererParams<SellerApplicationDetail>) => {
                if (!params.data) return null
                const app = params.data
                return (
                    <div className="flex items-center gap-2.5 py-1 min-w-0">
                        <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                            <StoreIcon className="size-4" />
                        </div>
                        <Button
                            type="button"
                            onClick={() => actions.onDetail(app)}
                            className="text-left font-semibold text-foreground hover:text-primary hover:underline truncate"
                            variant="ghost"
                        >
                            {app.shopName}
                        </Button>
                    </div>
                )
            },
        },
        {
            headerName: t('columnApplicant'),
            colId: 'applicant',
            flex: 1.1,
            minWidth: 160,
            valueGetter: (params) => params.data?.user?.name ?? '',
            cellRenderer: (params: ICellRendererParams<SellerApplicationDetail>) => {
                if (!params.data) return null
                const user = params.data.user
                const name = user?.name || t('unnamed')
                return (
                    <div className="flex items-center gap-2.5 py-1 min-w-0">
                        <UserAvatar name={name} className="size-7 shrink-0 text-xs" />
                        <span className="text-xs font-medium text-foreground truncate">{name}</span>
                    </div>
                )
            },
        },
        {
            headerName: t('columnEmail'),
            colId: 'email',
            flex: 1.2,
            minWidth: 180,
            valueGetter: (params) => params.data?.user?.email ?? '—',
            cellRenderer: (params: ICellRendererParams<SellerApplicationDetail>) => {
                if (!params.data) return null
                const email = params.data.user?.email
                return <span className="text-xs text-muted-foreground truncate">{email || '—'}</span>
            },
        },
        {
            headerName: t('columnTaxCode'),
            field: 'taxCode',
            width: 140,
            flex: 0,
            valueFormatter: (params) => params.value || '—',
            cellClassRules: {
                'text-muted-foreground italic': (params) => !params.value,
            },
        },
        {
            headerName: t('columnDocument'),
            field: 'idDocumentUrl',
            width: 170,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<SellerApplicationDetail>) => {
                if (!params.data) return null
                return renderDocument(params.data)
            },
        },
        {
            headerName: t('columnStatus'),
            field: 'status',
            width: 135,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<SellerApplicationDetail>) => {
                if (!params.data) return null
                const status = params.data.status
                const tone = SELLER_APPLICATION_STATUS_TONE[status] ?? StatusTone.NEUTRAL
                return (
                    <div className="flex items-center py-2">
                        <StatusBadge tone={tone} label={getStatusLabel(status)} />
                    </div>
                )
            },
        },
        {
            headerName: t('columnCreatedAt'),
            field: 'createdAt',
            width: 160,
            flex: 0,
            valueFormatter: (params) => (params.value ? formatTimestamp(params.value as string) : '—'),
        },
        {
            headerName: t('columnActions'),
            colId: 'actions',
            pinned: 'right',
            width: rowActionsColumnWidth(3),
            flex: 0,
            sortable: false,
            filter: false,
            resizable: false,
            suppressHeaderMenuButton: true,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<SellerApplicationDetail>) =>
                params.data ? <RowActions actions={buildRowActions(params.data)} /> : null,
        },
    ]
}
