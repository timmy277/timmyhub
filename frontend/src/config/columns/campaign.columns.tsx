import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BanIcon, CheckCircle2Icon, EyeIcon, Trash2Icon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { PromotionCampaignItem } from '@timmyhub/contracts'
import { RowActions, StatusBadge, type RowAction } from '@/components'
import { AG_GRID_NO_EXPORT, StatusTone } from '@/constants'
import { formatTimestamp, rowActionsColumnWidth } from '@/utils'

export type CampaignsTranslator = ReturnType<typeof useTranslations<'campaigns'>>

export interface CampaignColumnActions {
    onDetail: (campaign: PromotionCampaignItem) => void
    onToggleStatus: (campaign: PromotionCampaignItem) => void
    onDelete: (campaign: PromotionCampaignItem) => void
}

interface CreateCampaignColumnsOptions {
    t?: CampaignsTranslator
    actions: CampaignColumnActions
}

export function createCampaignColumns({ t, actions }: CreateCampaignColumnsOptions): ColDef<PromotionCampaignItem>[] {
    const isEnded = (item: PromotionCampaignItem): boolean => {
        return new Date(item.endDate).getTime() < Date.now()
    }

    const isUpcoming = (item: PromotionCampaignItem): boolean => {
        return new Date(item.startDate).getTime() > Date.now()
    }

    return [
        {
            headerName: t ? t('columnName') : 'Tên chiến dịch',
            field: 'name',
            flex: 1.5,
            minWidth: 200,
            cellRenderer: (params: ICellRendererParams<PromotionCampaignItem>) => {
                if (!params.data) return null
                return (
                    <span className="font-semibold text-xs text-foreground truncate" title={params.data.name}>
                        {params.data.name}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnType') : 'Loại chiến dịch',
            field: 'type',
            width: 150,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<PromotionCampaignItem>) => {
                if (!params.data) return null
                const type = params.data.type
                let label: string = type
                const tone = StatusTone.NEUTRAL

                if (type === 'FLASH_SALE') {
                    label = t ? t('typeFlashSale') : 'Flash Sale'
                } else if (type === 'SEASONAL') {
                    label = t ? t('typeSeasonal') : 'Theo mùa / Lễ hội'
                } else if (type === 'CATEGORY_BOOST') {
                    label = t ? t('typeCategoryBoost') : 'Đẩy ngành hàng'
                }

                return (
                    <div className="flex items-center py-2">
                        <StatusBadge tone={tone} label={label} />
                    </div>
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
            headerName: t ? t('columnRequiresApproval') : 'Duyệt SP',
            field: 'requiresApproval',
            width: 110,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<PromotionCampaignItem>) => {
                if (!params.data) return null
                return (
                    <span className="text-xs text-muted-foreground">
                        {params.data.requiresApproval
                            ? t
                                ? t('approvalRequired')
                                : 'Bắt buộc'
                            : t
                              ? t('approvalAuto')
                              : 'Tự động'}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnProductCount') : 'Số SP',
            field: 'productCount',
            width: 90,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<PromotionCampaignItem>) => {
                const count = params.data?.productCount ?? 0
                return <span className="text-xs font-medium text-foreground">{count} SP</span>
            },
        },
        {
            headerName: t ? t('columnVoucherCount') : 'Voucher',
            field: 'voucherCount',
            width: 90,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<PromotionCampaignItem>) => {
                const count = params.data?.voucherCount ?? 0
                return <span className="text-xs font-medium text-foreground">{count} mã</span>
            },
        },
        {
            headerName: t ? t('columnStatus') : 'Trạng thái',
            field: 'isActive',
            width: 130,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<PromotionCampaignItem>) => {
                if (!params.data) return null
                const item = params.data

                if (!item.isActive) {
                    return (
                        <div className="flex items-center py-2">
                            <StatusBadge tone={StatusTone.DANGER} label={t ? t('statusDisabled') : 'Tạm tắt'} />
                        </div>
                    )
                }

                if (isEnded(item)) {
                    return (
                        <div className="flex items-center py-2">
                            <StatusBadge tone={StatusTone.NEUTRAL} label={t ? t('statusEnded') : 'Đã kết thúc'} />
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
                        <StatusBadge tone={StatusTone.SUCCESS} label={t ? t('statusRunning') : 'Đang diễn ra'} />
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
            cellRenderer: (params: ICellRendererParams<PromotionCampaignItem>) => {
                if (!params.data) return null
                const item = params.data

                const rowActions: RowAction[] = [
                    {
                        key: 'detail',
                        label: t ? t('actionDetail') : 'Xem chi tiết',
                        ariaLabel: `Xem chi tiết ${item.name}`,
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
                        ariaLabel: `Đổi trạng thái ${item.name}`,
                        icon: item.isActive ? BanIcon : CheckCircle2Icon,
                        onClick: () => actions.onToggleStatus(item),
                    },
                    {
                        key: 'delete',
                        label: t ? t('actionDelete') : 'Xoá chiến dịch',
                        ariaLabel: `Xoá chiến dịch ${item.name}`,
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
