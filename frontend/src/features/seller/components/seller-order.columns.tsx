import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { CheckCircle2Icon, EyeIcon, PackageIcon, PrinterIcon, TruckIcon, UserIcon, XCircleIcon } from 'lucide-react'

import type { OrderDetail, OrderStatusType } from '@timmyhub/contracts'
import { RowActions, StatusBadge, type RowAction } from '@/components'
import { AG_GRID_NO_EXPORT, StatusTone } from '@/constants'
import { formatCurrencyVND, formatTimestamp, rowActionsColumnWidth } from '@/utils'

export interface SellerOrderColumnActions {
    onDetail: (order: OrderDetail) => void
    onUpdateStatus: (order: OrderDetail, status: OrderStatusType) => void
    onCancel: (order: OrderDetail) => void
    onPrint: (order: OrderDetail) => void
}

interface CreateSellerOrderColumnsOptions {
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

export function createSellerOrderColumns({ actions }: CreateSellerOrderColumnsOptions): ColDef<OrderDetail>[] {
    const buildRowActions = (order: OrderDetail): RowAction[] => {
        const rowActions: RowAction[] = [
            {
                key: 'view',
                label: 'Xem chi tiết',
                ariaLabel: `Xem chi tiết đơn ${order.id}`,
                icon: EyeIcon,
                onClick: () => actions.onDetail(order),
            },
        ]

        if (order.status === 'PENDING') {
            rowActions.push(
                {
                    key: 'confirm',
                    label: 'Xác nhận đơn',
                    ariaLabel: `Xác nhận đơn ${order.id}`,
                    icon: CheckCircle2Icon,
                    onClick: () => actions.onUpdateStatus(order, 'CONFIRMED'),
                },
                {
                    key: 'cancel',
                    label: 'Huỷ đơn hàng',
                    ariaLabel: `Huỷ đơn ${order.id}`,
                    icon: XCircleIcon,
                    destructive: true,
                    onClick: () => actions.onCancel(order),
                },
            )
        } else if (order.status === 'CONFIRMED') {
            rowActions.push({
                key: 'process',
                label: 'Chuẩn bị hàng',
                ariaLabel: `Chuẩn bị hàng đơn ${order.id}`,
                icon: PackageIcon,
                onClick: () => actions.onUpdateStatus(order, 'PROCESSING'),
            })
        } else if (order.status === 'PROCESSING' || order.status === 'PACKED') {
            rowActions.push({
                key: 'ship',
                label: 'Giao cho ĐVVC',
                ariaLabel: `Bàn giao vận chuyển đơn ${order.id}`,
                icon: TruckIcon,
                onClick: () => actions.onUpdateStatus(order, 'SHIPPING'),
            })
        } else if (order.status === 'SHIPPING') {
            rowActions.push({
                key: 'deliver',
                label: 'Xác nhận Đã giao',
                ariaLabel: `Xác nhận đã giao đơn ${order.id}`,
                icon: CheckCircle2Icon,
                onClick: () => actions.onUpdateStatus(order, 'DELIVERED'),
            })
        }

        rowActions.push({
            key: 'print',
            label: 'In phiếu đóng gói',
            ariaLabel: `In phiếu đơn ${order.id}`,
            icon: PrinterIcon,
            onClick: () => actions.onPrint(order),
        })

        return rowActions
    }

    return [
        {
            headerName: 'Mã đơn',
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
            headerName: 'Ngày đặt',
            field: 'createdAt',
            width: 155,
            flex: 0,
            valueFormatter: (params) => (params.value ? formatTimestamp(params.value as string) : '—'),
        },
        {
            headerName: 'Khách hàng',
            field: 'shippingFullName',
            flex: 1.2,
            minWidth: 180,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                const order = params.data
                return (
                    <div className="flex flex-col justify-center py-1 min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                            <UserIcon className="size-3 text-muted-foreground shrink-0" />
                            {order.shippingFullName}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">{order.shippingPhone}</span>
                    </div>
                )
            },
        },
        {
            headerName: 'Địa chỉ giao hàng',
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
            headerName: 'Số SP',
            colId: 'itemCount',
            width: 90,
            flex: 0,
            valueGetter: (params) => params.data?.items?.length ?? 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                const count = params.data?.items?.length ?? 0
                return <span className="text-xs font-medium text-foreground">{count} món</span>
            },
        },
        {
            headerName: 'Tổng tiền',
            field: 'totalAmount',
            width: 140,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                return (
                    <span className="text-xs font-bold text-foreground block py-2">
                        {formatCurrencyVND(params.data.totalAmount)}
                    </span>
                )
            },
        },
        {
            headerName: 'Phương thức TT',
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
            headerName: 'Trạng thái TT',
            field: 'paymentStatus',
            width: 130,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                const isPaid = params.data.paymentStatus === 'PAID'
                return (
                    <div className="flex items-center py-2">
                        <StatusBadge
                            tone={isPaid ? StatusTone.SUCCESS : StatusTone.NEUTRAL}
                            label={isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        />
                    </div>
                )
            },
        },
        {
            headerName: 'Trạng thái đơn',
            field: 'status',
            width: 145,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<OrderDetail>) => {
                if (!params.data) return null
                const status = params.data.status
                const tone = ORDER_STATUS_TONE_MAP[status] ?? StatusTone.NEUTRAL
                const label = ORDER_STATUS_LABEL_MAP[status] ?? status
                return (
                    <div className="flex items-center py-2">
                        <StatusBadge tone={tone} label={label} />
                    </div>
                )
            },
        },
        {
            headerName: 'Thao tác',
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
