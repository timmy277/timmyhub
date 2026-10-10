'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { OrderDetail, OrderStatusType, UpdateOrderStatusInput } from '@timmyhub/contracts'
import {
    AgGridTable,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    FloatCombobox,
    Textarea,
} from '@/components'
import { SELLER_ORDER_STATUS_ALL, SELLER_ORDER_TAB, USER_TABLE_ROW_HEIGHT_PX } from '@/constants'
import { useDebouncedValue } from '@/hooks'
import { updateSellerOrderStatusAction } from '../actions'
import { buildSellerOrderTabsHref, type SellerOrderTabState } from '../seller-order-tab-query'
import { createSellerOrderColumns } from './seller-order.columns'
import { AlertTriangleIcon, Loader2Icon, XCircleIcon } from 'lucide-react'

interface SellerOrderTableProps {
    rows: OrderDetail[]
    totalItems?: number
    onRefresh?: () => void
    error?: string
}

const STATUS_FILTER_OPTIONS = [
    { value: SELLER_ORDER_STATUS_ALL, label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'Chờ xác nhận' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'PROCESSING', label: 'Đang đóng gói' },
    { value: 'SHIPPING', label: 'Đang giao hàng' },
    { value: 'DELIVERED', label: 'Đã hoàn thành' },
    { value: 'CANCELLED', label: 'Đã huỷ' },
]

const SELLER_CANCEL_REASONS = [
    'Hết hàng trong kho',
    'Khách hàng yêu cầu huỷ đơn',
    'Không thể liên hệ với người mua để xác nhận',
    'Sai sót về thông tin giá hoặc sản phẩm',
    'Địa chỉ giao hàng nằm ngoài khu vực hỗ trợ',
    'Khác',
]

export function SellerOrderTable({ rows, onRefresh, error }: SellerOrderTableProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [searchInput, setSearchInput] = useState('')
    const debouncedSearch = useDebouncedValue(searchInput, 300)
    const [statusFilter, setStatusFilter] = useState<string>(SELLER_ORDER_STATUS_ALL)

    // Cancel Dialog State
    const [cancellingOrder, setCancellingOrder] = useState<OrderDetail | null>(null)
    const [selectedReason, setSelectedReason] = useState<string>(SELLER_CANCEL_REASONS[0]!)
    const [customReason, setCustomReason] = useState('')
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

    const hrefFor = useCallback(
        (target: SellerOrderTabState) => buildSellerOrderTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const handleDetail = useCallback(
        (order: OrderDetail) => {
            router.push(
                hrefFor({
                    tab: SELLER_ORDER_TAB.DETAIL,
                    id: order.id,
                    label: order.id.slice(-8).toUpperCase(),
                }),
            )
        },
        [hrefFor, router],
    )

    const handleUpdateStatus = useCallback(
        async (order: OrderDetail, nextStatus: OrderStatusType) => {
            try {
                const res = await updateSellerOrderStatusAction(order.id, {
                    status: nextStatus as UpdateOrderStatusInput['status'],
                })
                if (!res.ok) {
                    toast.error(res.message || 'Cập nhật trạng thái đơn hàng thất bại')
                    return
                }
                toast.success(`Đã cập nhật đơn #${order.id.slice(-8).toUpperCase()} sang ${nextStatus}`)
                if (onRefresh) onRefresh()
                router.refresh()
            } catch {
                toast.error('Có lỗi xảy ra khi cập nhật đơn hàng')
            }
        },
        [onRefresh, router],
    )

    const handleConfirmCancel = async () => {
        if (!cancellingOrder) return
        const reason = selectedReason === 'Khác' ? customReason.trim() : selectedReason
        if (selectedReason === 'Khác' && !reason) {
            toast.error('Vui lòng nhập lý do huỷ đơn hàng')
            return
        }

        setIsSubmittingCancel(true)
        try {
            const res = await updateSellerOrderStatusAction(cancellingOrder.id, {
                status: 'CANCELLED',
                note: reason,
            })
            if (!res.ok) {
                toast.error(res.message || 'Huỷ đơn hàng thất bại')
                return
            }
            toast.success('Đã huỷ đơn hàng thành công')
            setCancellingOrder(null)
            if (onRefresh) onRefresh()
            router.refresh()
        } catch {
            toast.error('Có lỗi xảy ra khi huỷ đơn hàng')
        } finally {
            setIsSubmittingCancel(false)
        }
    }

    const handlePrint = useCallback((order: OrderDetail) => {
        toast.info(`Chuẩn bị in phiếu đóng gói cho đơn #${order.id.slice(-8).toUpperCase()}`)
        window.print()
    }, [])

    const columns = useMemo(() => {
        return createSellerOrderColumns({
            actions: {
                onDetail: handleDetail,
                onUpdateStatus: handleUpdateStatus,
                onCancel: (order) => {
                    setCancellingOrder(order)
                    setSelectedReason(SELLER_CANCEL_REASONS[0]!)
                    setCustomReason('')
                },
                onPrint: handlePrint,
            },
        })
    }, [handleDetail, handleUpdateStatus, handlePrint])

    // Filter rows based on search and status
    const filteredRows = useMemo(() => {
        return rows.filter((order) => {
            if (statusFilter !== SELLER_ORDER_STATUS_ALL) {
                if (statusFilter === 'DELIVERED') {
                    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') return false
                } else if (order.status !== statusFilter) {
                    return false
                }
            }

            if (debouncedSearch.trim()) {
                const q = debouncedSearch.toLowerCase().trim()
                const matchesId = order.id.toLowerCase().includes(q)
                const matchesBuyer = order.shippingFullName.toLowerCase().includes(q)
                const matchesPhone = order.shippingPhone.includes(q)
                const matchesItem = order.items.some(
                    (it) => it.productName.toLowerCase().includes(q) || (it.sku && it.sku.toLowerCase().includes(q)),
                )
                return matchesId || matchesBuyer || matchesPhone || matchesItem
            }

            return true
        })
    }, [rows, statusFilter, debouncedSearch])

    return (
        <>
            <div className="flex flex-col gap-4">
                <AgGridTable<OrderDetail>
                    rowData={filteredRows}
                    columnDefs={columns}
                    getRowId={(params) => params.data.id}
                    error={error}
                    onRefresh={onRefresh}
                    searchValue={searchInput}
                    onSearchChange={setSearchInput}
                    onReset={() => {
                        setSearchInput('')
                        setStatusFilter(SELLER_ORDER_STATUS_ALL)
                        return true
                    }}
                    searchLabel="Tìm đơn hàng..."
                    exportFileName="danh-sach-don-hang-timmyhub"
                    pagination={true}
                    gridProps={{
                        rowHeight: USER_TABLE_ROW_HEIGHT_PX,
                        onRowDoubleClicked: (e) => {
                            if (e.data) {
                                router.push(
                                    hrefFor({
                                        tab: SELLER_ORDER_TAB.DETAIL,
                                        id: e.data.id,
                                        label: e.data.id.slice(-8).toUpperCase(),
                                    }),
                                )
                            }
                        },
                    }}
                    toolbarFilters={
                        <FloatCombobox
                            label="Trạng thái"
                            options={STATUS_FILTER_OPTIONS}
                            value={statusFilter}
                            onValueChange={(val) => setStatusFilter(val || SELLER_ORDER_STATUS_ALL)}
                            size="sm"
                            className="w-full sm:w-48"
                        />
                    }
                />
            </div>

            {/* Cancel Dialog */}
            <Dialog open={!!cancellingOrder} onOpenChange={(open) => !open && setCancellingOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-rose-600">
                            <AlertTriangleIcon className="h-5 w-5" />
                            <DialogTitle className="text-lg font-bold">Huỷ đơn hàng</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground pt-1">
                            Huỷ đơn #{cancellingOrder?.id.slice(-8).toUpperCase()}. Tồn kho sẽ được tự động hoàn lại.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <label className="text-xs font-semibold text-foreground block">Chọn lý do huỷ đơn hàng:</label>
                        <div className="space-y-2">
                            {SELLER_CANCEL_REASONS.map((reason) => (
                                <label
                                    key={reason}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        selectedReason === reason
                                            ? 'border-primary bg-primary/5 font-medium text-foreground'
                                            : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="seller_cancel_reason"
                                        value={reason}
                                        checked={selectedReason === reason}
                                        onChange={() => setSelectedReason(reason)}
                                        className="h-3.5 w-3.5 accent-primary"
                                    />
                                    <span>{reason}</span>
                                </label>
                            ))}
                        </div>

                        {selectedReason === 'Khác' && (
                            <div className="pt-2">
                                <label className="text-xs text-muted-foreground mb-1 block">Chi tiết lý do khác:</label>
                                <Textarea
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder="Nhập lý do huỷ đơn hàng..."
                                    rows={3}
                                    className="text-xs"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancellingOrder(null)}
                            disabled={isSubmittingCancel}
                        >
                            Đóng
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleConfirmCancel}
                            disabled={isSubmittingCancel}
                        >
                            {isSubmittingCancel ? (
                                <Loader2Icon className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                                <XCircleIcon className="h-4 w-4 mr-1.5" />
                            )}
                            Xác nhận huỷ đơn
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
