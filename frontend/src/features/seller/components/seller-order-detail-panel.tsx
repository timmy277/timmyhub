'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
    AlertTriangleIcon,
    ArrowLeftIcon,
    CheckCircle2Icon,
    CheckIcon,
    ClockIcon,
    CreditCardIcon,
    Loader2Icon,
    MapPinIcon,
    PackageIcon,
    PhoneIcon,
    PrinterIcon,
    ShoppingBagIcon,
    TruckIcon,
    UserIcon,
    XCircleIcon,
    TicketIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { OrderDetail, OrderStatusType, UpdateOrderStatusInput } from '@timmyhub/contracts'
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Textarea,
} from '@/components'
import { ROUTE, SELLER_ORDER_TAB } from '@/constants'
import { formatCurrencyVND, formatTimestamp } from '@/utils'
import { updateSellerOrderStatusAction } from '../actions'
import { buildSellerOrderTabsHref } from '../seller-order-tab-query'
import { getSellerOrderStatusLabel } from './seller-order.columns'

interface SellerOrderDetailPanelProps {
    order: OrderDetail
    onOrderUpdated?: (updated: OrderDetail) => void
}

const STATUS_CONFIG_MAP: Record<string, { className: string; icon: React.ComponentType<{ className?: string }> }> = {
    PENDING: {
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: ClockIcon,
    },
    CONFIRMED: {
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
        icon: CheckCircle2Icon,
    },
    PROCESSING: {
        className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        icon: PackageIcon,
    },
    PACKED: {
        className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
        icon: PackageIcon,
    },
    SHIPPING: {
        className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
        icon: TruckIcon,
    },
    DELIVERED: {
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2Icon,
    },
    COMPLETED: {
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2Icon,
    },
    CANCELLED: {
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: XCircleIcon,
    },
}

export function SellerOrderDetailPanel({ order: initialOrder, onOrderUpdated }: SellerOrderDetailPanelProps) {
    const t = useTranslations('sellerOrders')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [order, setOrder] = useState<OrderDetail>(initialOrder)
    const [prevInitialOrder, setPrevInitialOrder] = useState<OrderDetail>(initialOrder)
    const [isUpdating, setIsUpdating] = useState(false)

    if (prevInitialOrder !== initialOrder) {
        setPrevInitialOrder(initialOrder)
        setOrder(initialOrder)
    }

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

    // Cancel modal state
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [selectedReason, setSelectedReason] = useState<string>(cancelReasons[0]?.label || '')
    const [customReason, setCustomReason] = useState('')
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

    const handleBackToList = () => {
        router.push(buildSellerOrderTabsHref(pathname, searchParams, { tab: SELLER_ORDER_TAB.LIST }))
    }

    const handleUpdateStatus = async (nextStatus: OrderStatusType) => {
        setIsUpdating(true)
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
            setOrder(res.data)
            if (onOrderUpdated) onOrderUpdated(res.data)
            router.refresh()
        } catch {
            toast.error(t('updateError'))
        } finally {
            setIsUpdating(false)
        }
    }

    const handleConfirmCancel = async () => {
        const isOther = selectedReason === t('reasonOther') || selectedReason === 'Khác'
        const reason = isOther ? customReason.trim() : selectedReason
        if (isOther && !reason) {
            toast.error(t('cancelReasonRequired'))
            return
        }

        setIsSubmittingCancel(true)
        try {
            const res = await updateSellerOrderStatusAction(order.id, {
                status: 'CANCELLED',
                note: reason,
            })
            if (!res.ok) {
                toast.error(res.message || t('cancelFailed'))
                return
            }
            toast.success(t('cancelSuccess'))
            setOrder(res.data)
            if (onOrderUpdated) onOrderUpdated(res.data)
            setShowCancelModal(false)
            router.refresh()
        } catch {
            toast.error(t('cancelError'))
        } finally {
            setIsSubmittingCancel(false)
        }
    }

    const statusConfig = STATUS_CONFIG_MAP[order.status] || {
        className: 'bg-muted text-foreground',
        icon: ClockIcon,
    }
    const StatusIcon = statusConfig.icon
    const statusLabel = getSellerOrderStatusLabel(order.status, t)

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToList}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeftIcon className="size-4" />
                    <span>{t('backToList')}</span>
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            toast.info(t('printPreparing', { code: order.id.slice(-8).toUpperCase() }))
                            window.print()
                        }}
                        className="gap-1.5"
                    >
                        <PrinterIcon className="size-4" />
                        <span>{t('printSlip')}</span>
                    </Button>

                    {order.status === 'PENDING' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCancelModal(true)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                                <XCircleIcon className="size-4 mr-1 text-rose-500" />
                                {t('cancelOrder')}
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleUpdateStatus('CONFIRMED')}
                                disabled={isUpdating}
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                            >
                                {isUpdating ? (
                                    <Loader2Icon className="size-4 animate-spin" />
                                ) : (
                                    <CheckIcon className="size-4" />
                                )}
                                {t('confirmOrder')}
                            </Button>
                        </>
                    )}

                    {order.status === 'CONFIRMED' && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpdateStatus('PROCESSING')}
                            disabled={isUpdating}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                        >
                            {isUpdating ? (
                                <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                                <PackageIcon className="size-4" />
                            )}
                            {t('moveToProcessing')}
                        </Button>
                    )}

                    {order.status === 'PROCESSING' && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpdateStatus('SHIPPING')}
                            disabled={isUpdating}
                            className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
                        >
                            {isUpdating ? (
                                <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                                <TruckIcon className="size-4" />
                            )}
                            {t('handoverToCarrier')}
                        </Button>
                    )}

                    {order.status === 'SHIPPING' && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpdateStatus('DELIVERED')}
                            disabled={isUpdating}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                            {isUpdating ? (
                                <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                                <CheckCircle2Icon className="size-4" />
                            )}
                            {t('confirmDelivered')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Order Header Card */}
            <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-3.5 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                    {t('orderCode')}
                                </span>
                                <span className="font-mono font-bold text-base text-foreground">#{order.id}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('orderDate', { date: formatTimestamp(order.createdAt) })}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.className}`}
                            >
                                <StatusIcon className="size-3.5" />
                                <span>{statusLabel}</span>
                            </span>
                            <Badge
                                variant="outline"
                                className={`text-xs ${
                                    order.paymentStatus === 'PAID' || order.paymentStatus === 'COMPLETED'
                                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                                        : order.paymentStatus === 'FAILED'
                                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium'
                                          : 'border-border/60 text-muted-foreground'
                                }`}
                            >
                                {order.paymentMethod} &bull;{' '}
                                {order.paymentStatus === 'PAID' || order.paymentStatus === 'COMPLETED'
                                    ? t('paymentPaidShort')
                                    : order.paymentStatus === 'FAILED'
                                      ? t('paymentFailedShort')
                                      : t('paymentUnpaidShort')}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer & Shipping */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-2.5">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                            <MapPinIcon className="size-3.5 text-primary" />
                            <span>{t('shippingInfoTitle')}</span>
                        </h4>
                        <div className="space-y-1 text-sm pt-1">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                                <UserIcon className="size-3.5 text-muted-foreground" />
                                <span>{order.shippingFullName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <PhoneIcon className="size-3.5 text-muted-foreground" />
                                <span>{order.shippingPhone}</span>
                            </div>
                            <p className="text-xs text-muted-foreground pt-1.5 border-t border-border/40 leading-relaxed">
                                {order.shippingAddress}
                            </p>
                        </div>

                        {order.customerNote && (
                            <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                                <strong>{t('customerNoteTitle')}</strong> &ldquo;{order.customerNote}&rdquo;
                            </div>
                        )}
                    </div>

                    {/* Payment Summary */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-2.5">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                            <CreditCardIcon className="size-3.5 text-primary" />
                            <span>{t('paymentSummaryTitle')}</span>
                        </h4>
                        <div className="space-y-2 text-sm pt-1">
                            <div className="flex justify-between text-muted-foreground text-xs">
                                <span>{t('subtotal')}</span>
                                <span className="font-medium text-foreground">
                                    {formatCurrencyVND(order.items.reduce((sum, it) => sum + Number(it.lineTotal), 0))}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground text-xs">
                                <span>{t('shippingFee')}</span>
                                <span className="font-medium text-foreground">
                                    {Number(order.shippingFee) > 0
                                        ? formatCurrencyVND(order.shippingFee)
                                        : t('freeShipping')}
                                </span>
                            </div>
                            {order.vouchers && order.vouchers.length > 0 ? (
                                <div className="space-y-1.5 py-1 border-t border-border/40">
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1 font-medium">
                                            <TicketIcon className="size-3 text-primary" />
                                            {t('voucherDiscount')} ({order.vouchers.length}):
                                        </span>
                                        {Number(order.voucherDiscount) > 0 && (
                                            <span className="font-bold text-emerald-600">
                                                -{formatCurrencyVND(order.voucherDiscount)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {order.vouchers.map((vc) => (
                                            <div
                                                key={vc.id || vc.code}
                                                className="flex items-center justify-between text-[11px] p-1.5 rounded-md bg-muted/40 border border-border/40"
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[9px] font-mono font-bold py-0 px-1 ${
                                                            vc.type === 'FREE_SHIPPING'
                                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
                                                        }`}
                                                    >
                                                        {vc.code}
                                                    </Badge>
                                                    <span className="text-muted-foreground truncate">
                                                        {vc.description ||
                                                            (vc.type === 'FREE_SHIPPING' ? 'Freeship' : 'Giảm giá')}
                                                    </span>
                                                </div>
                                                <span className="font-semibold text-emerald-600 shrink-0 ml-2">
                                                    -{formatCurrencyVND(vc.discount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : Number(order.voucherDiscount) > 0 || order.voucherCode ? (
                                <div className="flex justify-between text-emerald-600 text-xs">
                                    <span className="flex items-center gap-1">
                                        <TicketIcon className="size-3" />
                                        {t('voucherDiscount')} ({order.voucherCode || 'Áp dụng'}):
                                    </span>
                                    <span className="font-bold">-{formatCurrencyVND(order.voucherDiscount || 0)}</span>
                                </div>
                            ) : null}
                            <div className="pt-2 border-t border-border/50 flex justify-between items-baseline font-bold">
                                <span className="text-sm text-foreground">{t('totalRevenue')}</span>
                                <span className="text-base text-primary font-extrabold">
                                    {formatCurrencyVND(order.totalAmount)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Products in Order */}
            <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-3 sm:px-6">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ShoppingBagIcon className="size-4 text-primary" />
                        <span>{t('productListTitle', { count: order.items.length })}</span>
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 divide-y divide-border/40">
                    {order.items.map((item) => (
                        <div
                            key={item.id}
                            className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                                    <Image
                                        src={
                                            item.imageUrl ||
                                            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'
                                        }
                                        alt={item.productName}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={ROUTE.PRODUCT_DETAIL(item.productId)}
                                        className="font-medium text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                                    >
                                        {item.productName}
                                    </Link>
                                    {item.variantLabel && item.variantLabel !== 'Mặc định' && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {t('variantLabel')} <span className="font-medium">{item.variantLabel}</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {t('unitPrice')} {formatCurrencyVND(item.unitPrice)} &bull; {t('quantity')}{' '}
                                        {item.quantity}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right shrink-0 font-bold text-sm text-foreground">
                                {formatCurrencyVND(item.lineTotal)}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Status History Timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (
                <Card className="border border-border/80 shadow-2xs">
                    <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-3 sm:px-6">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <ClockIcon className="size-4 text-primary" />
                            <span>{t('statusHistoryTitle')}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-3">
                        {order.statusHistory.map((hist) => (
                            <div key={hist.id} className="flex items-start gap-3 text-xs sm:text-sm">
                                <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                <div className="flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="font-medium text-foreground">
                                            {hist.reason ||
                                                t('statusChangeDefault', {
                                                    status: getSellerOrderStatusLabel(hist.toStatus, t),
                                                })}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground shrink-0">
                                            {formatTimestamp(hist.createdAt)}
                                        </span>
                                    </div>
                                    {hist.actorRole && (
                                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                                            {t('performedBy', { role: hist.actorRole })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Cancel Modal */}
            <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-rose-600">
                            <AlertTriangleIcon className="size-5" />
                            <DialogTitle className="text-lg font-bold">{t('cancelDialogTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground pt-1">
                            {t('cancelDialogDesc', { code: order.id.slice(-8).toUpperCase() })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <label className="text-xs font-semibold text-foreground block">{t('cancelReasonPrompt')}</label>
                        <div className="space-y-2">
                            {cancelReasons.map((reason) => (
                                <label
                                    key={reason.key}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        selectedReason === reason.label
                                            ? 'border-primary bg-primary/5 font-medium text-foreground'
                                            : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="panel_cancel_reason"
                                        value={reason.label}
                                        checked={selectedReason === reason.label}
                                        onChange={() => setSelectedReason(reason.label)}
                                        className="size-3.5 accent-primary"
                                    />
                                    <span>{reason.label}</span>
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
                            onClick={() => setShowCancelModal(false)}
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
                                <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                            ) : (
                                <XCircleIcon className="size-4 mr-1.5" />
                            )}
                            {t('cancelConfirmBtn')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
