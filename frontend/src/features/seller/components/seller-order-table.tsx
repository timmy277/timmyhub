'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { AlertTriangleIcon, Loader2Icon, XCircleIcon } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
import { createSellerOrderColumns, getSellerOrderStatusLabel } from './seller-order.columns'

interface SellerOrderTableProps {
    rows: OrderDetail[]
    totalItems?: number
    onRefresh?: () => void
    error?: string
}

export function SellerOrderTable({ rows, onRefresh, error }: SellerOrderTableProps) {
    const t = useTranslations('sellerOrders')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [searchInput, setSearchInput] = useState('')
    const debouncedSearch = useDebouncedValue(searchInput, 300)
    const [statusFilter, setStatusFilter] = useState<string>(SELLER_ORDER_STATUS_ALL)

    const cancelReasons = useMemo(
        () => [
            { key: 'reasonOutOfStock', label: t('reasonOutOfStock') },
            { key: 'reasonBuyerRequest', label: t('reasonBuyerRequest') },
            { key: 'reasonCannotContact', label: t('reasonCannotContact') },
            { key: 'reasonWrongPrice', label: t('reasonWrongPrice') },
            { key: 'reasonOutsideArea', label: t('reasonOutsideArea') },
            { key: 'reasonOther', label: t('reasonOther') },
        ],
        [t],
    )

    const statusFilterOptions = useMemo(
        () => [
            { value: SELLER_ORDER_STATUS_ALL, label: t('allStatuses') },
            { value: 'PENDING', label: t('statusPending') },
            { value: 'CONFIRMED', label: t('statusConfirmed') },
            { value: 'PROCESSING', label: t('statusProcessing') },
            { value: 'SHIPPING', label: t('statusShipping') },
            { value: 'DELIVERED', label: t('statusDelivered') },
            { value: 'CANCELLED', label: t('statusCancelled') },
        ],
        [t],
    )

    // Cancel Dialog State
    const [cancellingOrder, setCancellingOrder] = useState<OrderDetail | null>(null)
    const [selectedReason, setSelectedReason] = useState<string>('')
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
                    toast.error(res.message || t('updateFailed'))
                    return
                }
                toast.success(
                    t('updateSuccess', {
                        code: order.id.slice(-8).toUpperCase(),
                        status: getSellerOrderStatusLabel(nextStatus, t),
                    }),
                )
                if (onRefresh) onRefresh()
                router.refresh()
            } catch {
                toast.error(t('updateError'))
            }
        },
        [onRefresh, router, t],
    )

    const handleConfirmCancel = async () => {
        if (!cancellingOrder) return
        const isOther = selectedReason === t('reasonOther') || selectedReason === 'Khác'
        const reason = isOther ? customReason.trim() : selectedReason
        if (isOther && !reason) {
            toast.error(t('cancelReasonRequired'))
            return
        }

        setIsSubmittingCancel(true)
        try {
            const res = await updateSellerOrderStatusAction(cancellingOrder.id, {
                status: 'CANCELLED',
                note: reason,
            })
            if (!res.ok) {
                toast.error(res.message || t('cancelFailed'))
                return
            }
            toast.success(t('cancelSuccess'))
            setCancellingOrder(null)
            if (onRefresh) onRefresh()
            router.refresh()
        } catch {
            toast.error(t('cancelError'))
        } finally {
            setIsSubmittingCancel(false)
        }
    }

    const handlePrint = useCallback(
        (order: OrderDetail) => {
            toast.info(t('printPreparing', { code: order.id.slice(-8).toUpperCase() }))
            window.print()
        },
        [t],
    )

    const columns = useMemo(() => {
        return createSellerOrderColumns({
            t,
            actions: {
                onDetail: handleDetail,
                onUpdateStatus: handleUpdateStatus,
                onCancel: (order) => {
                    setCancellingOrder(order)
                    setSelectedReason(cancelReasons[0]?.label || '')
                    setCustomReason('')
                },
                onPrint: handlePrint,
            },
        })
    }, [cancelReasons, handleDetail, handlePrint, handleUpdateStatus, t])

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
                const matchesId = order.id?.toLowerCase().includes(q) ?? false
                const matchesBuyer = order.shippingFullName?.toLowerCase().includes(q) ?? false
                const matchesPhone = order.shippingPhone?.includes(q) ?? false
                const matchesItem = (order.items ?? []).some(
                    (it) => it.productName?.toLowerCase().includes(q) || (it.sku && it.sku.toLowerCase().includes(q)),
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
                    searchLabel={t('searchPlaceholder')}
                    exportFileName={t('exportFileName')}
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
                            label={t('statusFilterLabel')}
                            options={statusFilterOptions}
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
                            <DialogTitle className="text-lg font-bold">{t('cancelDialogTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground pt-1">
                            {t('cancelDialogDesc', { code: cancellingOrder?.id.slice(-8).toUpperCase() ?? '' })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <label className="text-xs font-semibold text-foreground block">{t('cancelReasonPrompt')}</label>
                        <div className="space-y-2">
                            {cancelReasons.map((item) => (
                                <label
                                    key={item.key}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        selectedReason === item.label
                                            ? 'border-primary bg-primary/5 font-medium text-foreground'
                                            : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="seller_cancel_reason"
                                        value={item.label}
                                        checked={selectedReason === item.label}
                                        onChange={() => setSelectedReason(item.label)}
                                        className="h-3.5 w-3.5 accent-primary"
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>

                        {(selectedReason === t('reasonOther') || selectedReason === 'Khác') && (
                            <div className="pt-2">
                                <label className="text-xs text-muted-foreground mb-1 block">
                                    {t('cancelReasonOtherDetail')}
                                </label>
                                <Textarea
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder={t('cancelReasonOtherPlaceholder')}
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
                            {t('close')}
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
                            {t('cancelConfirmBtn')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
