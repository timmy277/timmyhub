import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import {
    CheckCircle2Icon,
    EyeIcon,
    PackageIcon,
    PhoneIcon,
    PrinterIcon,
    TruckIcon,
    UserIcon,
    XCircleIcon,
} from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { OrderDetail, OrderStatusType } from '@timmyhub/contracts'
import { RowActions, StatusBadge, type RowAction } from '@/components'
import { AG_GRID_NO_EXPORT, StatusTone } from '@/constants'
import { formatCurrencyVND, formatTimestamp, rowActionsColumnWidth } from '@/utils'

export type SellerOrdersTranslator = ReturnType<typeof useTranslations<'sellerOrders'>>

export interface SellerOrderColumnActions {
    onDetail: (order: OrderDetail) => void
    onUpdateStatus: (order: OrderDetail, status: OrderStatusType) => void
    onCancel: (order: OrderDetail) => void
    onPrint: (order: OrderDetail) => void
}

interface CreateSellerOrderColumnsOptions {
    t?: SellerOrdersTranslator
    actions: SellerOrderColumnActions
}

export const ORDER_STATUS_LABEL_MAP: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PROCESSING: 'Đang đóng gói',
    PACKED: 'Đã đóng gói',
    SHIPPING: 'Đang giao hàng',
    DELIVERED: 'Đã hoàn thành',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã huỷ',
}

export const ORDER_STATUS_TONE_MAP: Record<string, StatusTone> = {
    PENDING: StatusTone.NEUTRAL,
    CONFIRMED: StatusTone.NEUTRAL,
    PROCESSING: StatusTone.NEUTRAL,
    PACKED: StatusTone.NEUTRAL,
    SHIPPING: StatusTone.NEUTRAL,
    DELIVERED: StatusTone.SUCCESS,
    COMPLETED: StatusTone.SUCCESS,
    CANCELLED: StatusTone.DANGER,
}

export function getSellerOrderStatusLabel(status: string, t?: SellerOrdersTranslator): string {
    if (t) {
        switch (status) {
            case 'PENDING':
                return t('statusPending')
            case 'CONFIRMED':
                return t('statusConfirmed')
            case 'PROCESSING':
                return t('statusProcessing')
            case 'PACKED':
                return t('statusPacked')
            case 'SHIPPING':
                return t('statusShipping')
            case 'DELIVERED':
                return t('statusDelivered')
            case 'COMPLETED':
                return t('statusCompleted')
            case 'CANCELLED':
                return t('statusCancelled')
        }
    }
    return ORDER_STATUS_LABEL_MAP[status] ?? status
}

export function createSellerOrderColumns({ t, actions }: CreateSellerOrderColumnsOptions): ColDef<OrderDetail>[] {
    const buildRowActions = (order: OrderDetail): RowAction[] => {
        const rowActions: RowAction[] = [
            {
                key: 'view',
                label: t ? t('actionView') : 'Xem chi tiết',
                ariaLabel: `Xem chi tiết đơn ${order.id}`,
                icon: EyeIcon,
                onClick: () => actions.onDetail(order),
            },
        ]

        if (order.status === 'PENDING') {
            rowActions.push(
                {
                    key: 'confirm',
                    label: t ? t('actionConfirm') : 'Xác nhận đơn',
                    ariaLabel: `Xác nhận đơn ${order.id}`,
                    icon: CheckCircle2Icon,
                    onClick: () => actions.onUpdateStatus(order, 'CONFIRMED'),
                },
                {
                    key: 'cancel',
                    label: t ? t('actionCancel') : 'Huỷ đơn hàng',
                    ariaLabel: `Huỷ đơn ${order.id}`,
                    icon: XCircleIcon,
                    destructive: true,
                    onClick: () => actions.onCancel(order),
                },
            )
        } else if (order.status === 'CONFIRMED') {
            rowActions.push({
                key: 'process',
                label: t ? t('actionProcess') : 'Chuẩn bị hàng',
                ariaLabel: `Chuẩn bị hàng đơn ${order.id}`,
                icon: PackageIcon,
                onClick: () => actions.onUpdateStatus(order, 'PROCESSING'),
            })
        } else if (order.status === 'PROCESSING' || order.status === 'PACKED') {
            rowActions.push({
                key: 'ship',
                label: t ? t('actionShip') : 'Giao cho ĐVVC',
                ariaLabel: `Bàn giao vận chuyển đơn ${order.id}`,
                icon: TruckIcon,
                onClick: () => actions.onUpdateStatus(order, 'SHIPPING'),
            })
        } else if (order.status === 'SHIPPING') {
            rowActions.push({
                key: 'deliver',
                label: t ? t('actionDeliver') : 'Xác nhận Đã giao',
                ariaLabel: `Xác nhận đã giao đơn ${order.id}`,
                icon: CheckCircle2Icon,
                onClick: () => actions.onUpdateStatus(order, 'DELIVERED'),
            })
        }

        rowActions.push({
            key: 'print',
            label: t ? t('actionPrint') : 'In phiếu đóng gói',
            ariaLabel: `In phiếu đơn ${order.id}`,
            icon: PrinterIcon,
            onClick: () => actions.onPrint(order),
        })

        return rowActions
    }

    return [
        {
            headerName: t ? t('columnOrderId') : 'Mã đơn',
            field: 'id',
            width: 150,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                const order = params.data
                const shortId = order.id.slice(-8).toUpperCase()
                return (
                    <button
                        type="button"
                        onClick={() => actions.onDetail(order)}
                        className="font-mono font-bold text-xs text-primary hover:underline block text-left truncate cursor-pointer py-2"
                        title={order.id}
                    >
                        #{shortId}
                    </button>
                )
            },
        },
        {
            headerName: t ? t('columnCreatedAt') : 'Ngày đặt',
            field: 'createdAt',
            width: 155,
            flex: 0,
            valueFormatter: (params) => (params.value ? formatTimestamp(params.value as string) : '—'),
        },
        {
            headerName: t ? t('columnCustomer') : 'Khách hàng',
            field: 'shippingFullName',
            width: 160,
            flex: 1,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                return (
                    <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5 py-2">
                        <UserIcon className="size-3 text-muted-foreground shrink-0" />
                        {params.data.shippingFullName}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnPhone') : 'Số điện thoại',
            field: 'shippingPhone',
            width: 130,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                return (
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 py-2">
                        <PhoneIcon className="size-3 text-muted-foreground/70 shrink-0" />
                        {params.data.shippingPhone}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnShippingAddress') : 'Địa chỉ giao hàng',
            field: 'shippingAddress',
            flex: 1.5,
            minWidth: 200,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                return (
                    <span
                        className="text-xs text-muted-foreground truncate block py-2"
                        title={params.data.shippingAddress}
                    >
                        {params.data.shippingAddress}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnItemCount') : 'Số SP',
            colId: 'itemCount',
            width: 90,
            flex: 0,
            valueGetter: (params) => params.data?.items?.length ?? 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                const count = params.data?.items?.length ?? 0
                return (
                    <span className="text-xs font-medium text-foreground">
                        {t ? t('itemsCount', { count }) : `${count} món`}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnTotal') : 'Tổng tiền',
            field: 'totalAmount',
            width: 150,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                const order = params.data
                const hasVouchers = order.vouchers && order.vouchers.length > 0
                const hasDiscount = Number(order.voucherDiscount) > 0
                return (
                    <div className="py-1">
                        <span className="text-xs font-bold text-foreground block">
                            {formatCurrencyVND(order.totalAmount)}
                        </span>
                        {hasVouchers ? (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {order.vouchers!.map((vc) => (
                                    <span
                                        key={vc.id || vc.code}
                                        className="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                                        title={`${vc.code}: -${formatCurrencyVND(vc.discount)}`}
                                    >
                                        {vc.code}
                                    </span>
                                ))}
                            </div>
                        ) : hasDiscount ? (
                            <span
                                className="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold inline-block mt-0.5"
                                title={`-${formatCurrencyVND(order.voucherDiscount || 0)}`}
                            >
                                {order.voucherCode || 'Voucher'}
                            </span>
                        ) : null}
                    </div>
                )
            },
        },
        {
            headerName: t ? t('columnPaymentMethod') : 'Phương thức TT',
            field: 'paymentMethod',
            width: 125,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                return (
                    <span className="text-xs font-mono font-medium uppercase text-muted-foreground">
                        {params.data.paymentMethod}
                    </span>
                )
            },
        },
        {
            headerName: t ? t('columnPaymentStatus') : 'Trạng thái TT',
            field: 'paymentStatus',
            width: 140,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                const isPaid = params.data.paymentStatus === 'PAID' || params.data.paymentStatus === 'COMPLETED'
                const isFailed = params.data.paymentStatus === 'FAILED'
                const tone = isPaid ? StatusTone.SUCCESS : isFailed ? StatusTone.DANGER : StatusTone.NEUTRAL
                const label = isPaid
                    ? t
                        ? t('paymentPaid')
                        : 'Đã thanh toán'
                    : isFailed
                      ? t
                          ? t('paymentFailed')
                          : 'Thanh toán lỗi'
                      : t
                        ? t('paymentUnpaid')
                        : 'Chưa thanh toán'
                return (
                    <div className="flex items-center py-2">
                        <StatusBadge tone={tone} label={label} />
                    </div>
                )
            },
        },
        {
            headerName: t ? t('columnOrderStatus') : 'Trạng thái đơn',
            field: 'status',
            width: 145,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                const status = params.data.status
                const tone = ORDER_STATUS_TONE_MAP[status] ?? StatusTone.NEUTRAL
                const label = getSellerOrderStatusLabel(status, t)
                return (
                    <div className="flex items-center py-2">
                        <StatusBadge tone={tone} label={label} />
                    </div>
                )
            },
        },
        {
            headerName: t ? t('columnActions') : 'Thao tác',
            colId: 'actions',
            pinned: 'right',
            width: rowActionsColumnWidth(3),
            flex: 0,
            sortable: false,
            filter: false,
            resizable: false,
            suppressHeaderMenuButton: true,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) =>
                params.data ? <RowActions actions={buildRowActions(params.data)} /> : null,
        },
    ]
}
