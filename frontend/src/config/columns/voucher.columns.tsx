import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BanIcon, CheckCircle2Icon, EyeIcon, Trash2Icon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { VoucherItem } from '@timmyhub/contracts'
import { RowActions, StatusBadge, type RowAction } from '@/components'
import { AG_GRID_NO_EXPORT, StatusTone } from '@/constants'
import { formatCurrencyVND, formatTimestamp, rowActionsColumnWidth } from '@/utils'

export type VouchersTranslator = ReturnType<typeof useTranslations<'vouchers'>>

export interface VoucherColumnActions {
    onDetail: (voucher: VoucherItem) => void
    onToggleStatus: (voucher: VoucherItem) => void
    onDelete: (voucher: VoucherItem) => void
}

interface CreateVoucherColumnsOptions {
    t?: VouchersTranslator
    actions: VoucherColumnActions
}

export function createVoucherColumns({ t, actions }: CreateVoucherColumnsOptions): ColDef<VoucherItem>[] {
    const isExpired = (item: VoucherItem): boolean => {
        return new Date(item.endDate).getTime() < Date.now()
    }

    const isUpcoming = (item: VoucherItem): boolean => {
        return new Date(item.startDate).getTime() > Date.now()
    }

    return [
        {
            headerName: t ? t('columnCode') : 'Mã voucher',
            field: 'code',
            minWidth: 140,
            flex: 1,
            cellRenderer: (params: ICellRendererParams<VoucherItem>) => {
                if (!params.data) return null
                return (
                    <span className="font-mono font-bold text-xs text-primary tracking-wide">{params.data.code}</span>
                )
            },
        },
        {
            headerName: t ? t('columnCampaign') : 'Chiến dịch',
            field: 'campaignName',
            width: 150,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<VoucherItem>) => {
                const name = params.data?.campaignName
                if (!name) return <span className="text-xs text-muted-foreground">—</span>
                return (
                    <span className="text-xs font-medium text-foreground truncate max-w-[140px] block" title={name}>
                        {name}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnType') : 'Loại',
            field: 'type',
            width: 140,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<VoucherItem>) => {
                if (!params.data) return null
                const type = params.data.type
                let label: string = type
                const tone = StatusTone.NEUTRAL

                if (type === 'PERCENTAGE') {
                    label = t ? t('typePercentage') : 'Giảm theo %'
                } else if (type === 'FIXED_AMOUNT') {
                    label = t ? t('typeFixedAmount') : 'Giảm số tiền'
                } else if (type === 'FREE_SHIPPING') {
                    label = t ? t('typeFreeShipping') : 'Miễn phí ship'
                }

                return (
                    <div className="flex items-center py-2">
                        <StatusBadge tone={tone} label={label} />
                    </div>
                )
            },
        },
        {
            headerName: t ? t('columnValue') : 'Mức giảm',
            field: 'value',
            width: 130,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<VoucherItem>) => {
                if (!params.data) return null
                const { type, value } = params.data
                if (type === 'PERCENTAGE') {
                    return <span className="font-semibold text-xs text-foreground">Giảm {value}%</span>
                }
                return <span className="font-semibold text-xs text-foreground">{formatCurrencyVND(value)}</span>
            },
        },
        {
            headerName: t ? t('columnMinOrder') : 'Đơn tối thiểu',
            field: 'minOrderValue',
            width: 130,
            flex: 0,
            valueFormatter: (params) => (params.value ? formatCurrencyVND(params.value as number) : '0 ₫'),
        },
        {
            headerName: t ? t('columnMaxDiscount') : 'Giảm tối đa',
            field: 'maxDiscount',
            width: 130,
            flex: 0,
            valueFormatter: (params) => (params.value ? formatCurrencyVND(params.value as number) : '—'),
        },
        {
            headerName: t ? t('columnUsage') : 'Lượt dùng',
            width: 110,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<VoucherItem>) => {
                if (!params.data) return null
                const { usedCount, usageLimit } = params.data
                const limitText = usageLimit != null ? String(usageLimit) : '∞'
                return (
                    <span className="text-xs font-medium text-foreground">
                        {usedCount} / {limitText}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnStartDate') : 'Bắt đầu',
            field: 'startDate',
            width: 155,
            flex: 0,
            valueFormatter: (params) => (params.value ? formatTimestamp(params.value as string) : '—'),
        },
        {
            headerName: t ? t('columnEndDate') : 'Kết thúc',
            field: 'endDate',
            width: 155,
            flex: 0,
            valueFormatter: (params) => (params.value ? formatTimestamp(params.value as string) : '—'),
        },
        {
            headerName: t ? t('columnStatus') : 'Trạng thái',
            field: 'isActive',
            width: 130,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<VoucherItem>) => {
                if (!params.data) return null
                const item = params.data

                if (!item.isActive) {
                    return (
                        <div className="flex items-center py-2">
                            <StatusBadge tone={StatusTone.DANGER} label={t ? t('statusDisabled') : 'Tạm tắt'} />
                        </div>
                    )
                }

                if (isExpired(item)) {
                    return (
                        <div className="flex items-center py-2">
                            <StatusBadge tone={StatusTone.NEUTRAL} label={t ? t('statusExpired') : 'Hết hạn'} />
                        </div>
                    )
                }

                if (isUpcoming(item)) {
                    return (
                        <div className="flex items-center py-2">
                            <StatusBadge tone={StatusTone.NEUTRAL} label={t ? t('statusUpcoming') : 'Sắp diễn ra'} />
                        </div>
                    )
                }

                return (
                    <div className="flex items-center py-2">
                        <StatusBadge tone={StatusTone.SUCCESS} label={t ? t('statusActive') : 'Đang bật'} />
                    </div>
                )
            },
        },
        {
            headerName: t ? t('columnActions') : 'Thao tác',
            colId: 'actions',
            pinned: 'right',
            width: rowActionsColumnWidth(3),
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<VoucherItem>) => {
                if (!params.data) return null
                const item = params.data

                const rowActions: RowAction[] = [
                    {
                        key: 'detail',
                        label: t ? t('actionDetail') : 'Xem chi tiết',
                        ariaLabel: `Xem chi tiết ${item.code}`,
                        icon: EyeIcon,
                        onClick: () => actions.onDetail(item),
                    },
                    {
                        key: 'toggleStatus',
                        label: item.isActive
                            ? t
                                ? t('actionDisable')
                                : 'Tắt kích hoạt'
                            : t
                              ? t('actionEnable')
                              : 'Bật kích hoạt',
                        ariaLabel: `Đổi trạng thái ${item.code}`,
                        icon: item.isActive ? BanIcon : CheckCircle2Icon,
                        onClick: () => actions.onToggleStatus(item),
                    },
                    {
                        key: 'delete',
                        label: t ? t('actionDelete') : 'Xoá voucher',
                        ariaLabel: `Xoá voucher ${item.code}`,
                        icon: Trash2Icon,
                        destructive: true,
                        onClick: () => actions.onDelete(item),
                    },
                ]

                return <RowActions actions={rowActions} />
            },
        },
    ]
}
