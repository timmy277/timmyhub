'use client'

import React, { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
    ArrowLeftIcon,
    ChevronRightIcon,
    CopyIcon,
    CheckIcon,
    CreditCardIcon,
    HomeIcon,
    MapPinIcon,
    PhoneIcon,
    StoreIcon,
    UserIcon,
    XCircleIcon,
    Loader2Icon,
    AlertTriangleIcon,
    HistoryIcon,
    ShoppingBagIcon,
    RotateCcwIcon,
    TicketIcon,
    StarIcon,
    CheckCircle2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { OrderDetail } from '@timmyhub/contracts'
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
import { QUERY_KEY, ROUTE } from '@/constants'
import { addToCartAction } from '@/features/cart'
import { cancelOrderAction } from '@/features/checkout'
import { CreateReviewDialog } from '@/features/engagement'
import { formatCurrencyVND } from '@/utils'
import { OrderStatusBadge, PaymentStatusBadge } from './order-status-badge'
import { OrderTimeline } from './order-timeline'

interface OrderDetailViewProps {
    initialOrder: OrderDetail
    onBack?: () => void
    isModalOrTab?: boolean
    onClose?: () => void
}

const CANCEL_REASONS = [
    'Muốn thay đổi địa chỉ giao hàng',
    'Muốn đổi phương thức thanh toán',
    'Đổi ý, không muốn mua nữa',
    'Tìm thấy sản phẩm giá tốt hơn ở nơi khác',
    'Đặt nhầm sản phẩm hoặc số lượng',
    'Khác',
]

export function OrderDetailView({ initialOrder, onBack, isModalOrTab = false, onClose }: OrderDetailViewProps) {
    const tReview = useTranslations('reviews')
    const router = useRouter()
    const queryClient = useQueryClient()
    const [cancelledOrder, setCancelledOrder] = useState<OrderDetail | null>(null)
    const order = (cancelledOrder?.id === initialOrder.id ? cancelledOrder : null) ?? initialOrder
    const [copied, setCopied] = useState(false)
    const [, startTransition] = useTransition()

    // Cancel modal state
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]!)
    const [customReason, setCustomReason] = useState('')
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)
    // Review modal state
    const [reviewingItem, setReviewingItem] = useState<OrderDetail['items'][number] | null>(null)

    const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED'

    const handleCopyId = () => {
        navigator.clipboard.writeText(order.id)
        setCopied(true)
        toast.success('Đã sao chép mã đơn hàng')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleConfirmCancel = async () => {
        const finalReason = selectedReason === 'Khác' ? customReason.trim() : selectedReason
        if (selectedReason === 'Khác' && !finalReason) {
            toast.error('Vui lòng nhập lý do huỷ đơn hàng')
            return
        }

        setIsSubmittingCancel(true)
        try {
            const res = await cancelOrderAction(order.id, finalReason)
            if (!res.ok) {
                toast.error(res.message || 'Huỷ đơn hàng thất bại')
                return
            }

            toast.success('Đã huỷ đơn hàng thành công')
            setCancelledOrder(res.data)
            setShowCancelModal(false)
            await queryClient.invalidateQueries({ queryKey: QUERY_KEY.ORDER.MY_ORDERS() })
            await queryClient.invalidateQueries({ queryKey: QUERY_KEY.ORDER.DETAIL(order.id) })
            startTransition(() => {
                router.refresh()
            })
        } catch {
            toast.error('Có lỗi xảy ra khi huỷ đơn hàng')
        } finally {
            setIsSubmittingCancel(false)
        }
    }

    const [isReordering, setIsReordering] = useState(false)
    const handleReorder = async () => {
        if (!order.items || order.items.length === 0) return
        setIsReordering(true)
        try {
            let successCount = 0
            for (const item of order.items) {
                if (item.variantId) {
                    const res = await addToCartAction({
                        variantId: item.variantId,
                        quantity: item.quantity || 1,
                    })
                    if (res.ok) successCount++
                }
            }

            if (successCount > 0) {
                await queryClient.invalidateQueries({ queryKey: QUERY_KEY.CART.ALL })
                toast.success(`Đã thêm ${successCount} sản phẩm vào giỏ hàng`)
                router.push(ROUTE.CART)
            } else {
                toast.error('Không thể thêm sản phẩm vào giỏ (sản phẩm có thể đã hết hàng hoặc bị ẩn)')
            }
        } catch {
            toast.error('Có lỗi xảy ra khi mua lại đơn hàng')
        } finally {
            setIsReordering(false)
        }
    }

    // Tính tổng tiền hàng
    const subtotal = order.items.reduce((sum, it) => sum + Number(it.lineTotal), 0)

    return (
        <div className={isModalOrTab ? 'space-y-6 w-full' : 'w-full min-h-screen pb-16'}>
            {/* Top Breadcrumb Header for standalone page */}
            {!isModalOrTab && (
                <div className="border-b border-border/60 bg-card/60 backdrop-blur-md">
                    <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8">
                        <nav
                            aria-label="Breadcrumb"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                            <Link
                                href={ROUTE.HOME}
                                className="hover:text-foreground transition-colors flex items-center gap-1.5"
                            >
                                <HomeIcon className="size-3.5 text-primary" />
                                <span>Trang chủ</span>
                            </Link>
                            <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                            <Link href={ROUTE.ORDERS} className="hover:text-foreground transition-colors">
                                Đơn hàng của tôi
                            </Link>
                            <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                            <span className="font-medium text-foreground">Đơn #{order.id}</span>
                        </nav>
                    </div>
                </div>
            )}

            <div className={isModalOrTab ? 'space-y-6' : 'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6'}>
                {/* Top Navigation Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                        >
                            <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                            <span>Quay lại danh sách đơn hàng</span>
                        </button>
                    ) : (
                        <Link
                            href={ROUTE.ORDERS}
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                        >
                            <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                            <span>Quay lại danh sách đơn hàng</span>
                        </Link>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        {canCancel && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCancelModal(true)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-xs sm:text-sm"
                            >
                                <XCircleIcon className="h-4 w-4 mr-1 text-rose-500" />
                                Huỷ đơn hàng
                            </Button>
                        )}
                        {(order.status === 'DELIVERED' || order.status === 'COMPLETED') &&
                            (order.items.some((i) => !i.isReviewed) ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const targetItem = order.items.find((i) => !i.isReviewed) || order.items[0]
                                        if (targetItem) setReviewingItem(targetItem)
                                    }}
                                    className="text-xs sm:text-sm font-semibold rounded-lg border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shadow-2xs gap-1.5 transition-colors"
                                >
                                    <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                    {tReview('buttons.writeReview')}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="text-xs sm:text-sm text-muted-foreground gap-1.5 opacity-80 cursor-default"
                                >
                                    <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-500" />
                                    {tReview('buttons.reviewed')}
                                </Button>
                            ))}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleReorder}
                            disabled={isReordering}
                            className="text-xs sm:text-sm shadow-xs"
                        >
                            {isReordering ? (
                                <Loader2Icon className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                                <RotateCcwIcon className="h-4 w-4 mr-1.5" />
                            )}
                            Mua lại
                        </Button>
                        {!isModalOrTab && (
                            <Link href="/">
                                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                                    <ShoppingBagIcon className="h-4 w-4 mr-1" />
                                    Mua sắm tiếp
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Order Header Card */}
                <Card className="border border-border/80 shadow-xs overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-4 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Mã đơn:
                                    </span>
                                    <span className="font-mono font-bold text-base sm:text-lg text-foreground">
                                        {order.id}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyId}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                        title="Sao chép mã đơn"
                                    >
                                        {copied ? (
                                            <CheckIcon className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                            <CopyIcon className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Ngày đặt hàng: {new Date(order.createdAt).toLocaleString('vi-VN')}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <PaymentStatusBadge status={order.paymentStatus} method={order.paymentMethod} />
                                <OrderStatusBadge status={order.status} />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6">
                        {/* Visual Timeline */}
                        <OrderTimeline order={order} />
                    </CardContent>
                </Card>

                {/* Main Content Grid: 1 col on mobile, 12 cols on desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Cols: Items & Shop */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
                        {/* Items Card */}
                        <Card className="border border-border/80 shadow-xs">
                            <CardHeader className="px-4 py-3 sm:px-6 border-b border-border/50 bg-muted/20">
                                <div className="flex items-center justify-between gap-3">
                                    <Link
                                        href={ROUTE.SHOP_DETAIL(
                                            (order as { shopSlug?: string }).shopSlug || order.sellerId,
                                        )}
                                        onClick={() => onClose?.()}
                                        className="flex items-center gap-2 group transition-colors hover:text-primary min-w-0"
                                    >
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                            <StoreIcon className="h-4 w-4" />
                                        </div>
                                        <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5 truncate">
                                            <span>{order.shopName || 'TimmyHub Mall'}</span>
                                            <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
                                        </CardTitle>
                                    </Link>

                                    <Link
                                        href={ROUTE.SHOP_DETAIL(
                                            (order as { shopSlug?: string }).shopSlug || order.sellerId,
                                        )}
                                        onClick={() => onClose?.()}
                                        className="shrink-0"
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 transition-colors shadow-2xs"
                                        >
                                            <StoreIcon className="h-3.5 w-3.5" />
                                            <span>Xem gian hàng</span>
                                        </Button>
                                    </Link>
                                </div>
                            </CardHeader>

                            <CardContent className="p-4 sm:p-6 divide-y divide-border/40">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                                    >
                                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                            <Link
                                                href={item.productId ? ROUTE.PRODUCT_DETAIL(item.productId) : '#'}
                                                onClick={() => onClose?.()}
                                                className="group relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <Image
                                                    src={
                                                        item.imageUrl ||
                                                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'
                                                    }
                                                    alt={item.productName}
                                                    fill
                                                    sizes="(max-width: 640px) 64px, 80px"
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </Link>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm sm:text-base text-foreground line-clamp-2">
                                                    {item.productId ? (
                                                        <Link
                                                            href={ROUTE.PRODUCT_DETAIL(item.productId)}
                                                            onClick={() => onClose?.()}
                                                            className="transition-colors hover:text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                                                        >
                                                            {item.productName}
                                                        </Link>
                                                    ) : (
                                                        item.productName
                                                    )}
                                                </h4>
                                                {item.variantLabel && item.variantLabel !== 'Mặc định' && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Phân loại:{' '}
                                                        <span className="font-medium text-foreground/80">
                                                            {item.variantLabel}
                                                        </span>
                                                    </p>
                                                )}
                                                {item.sku && (
                                                    <p className="text-[11px] font-mono text-muted-foreground/80 mt-0.5">
                                                        SKU: {item.sku}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                                    <span>
                                                        Số lượng:{' '}
                                                        <strong className="text-foreground">{item.quantity}</strong>
                                                    </span>
                                                    <span>&bull;</span>
                                                    <span>Đơn giá: {formatCurrencyVND(item.unitPrice)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0 sm:self-center flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40 gap-1.5">
                                            <span className="text-xs text-muted-foreground sm:hidden">Tổng:</span>
                                            <span className="font-bold text-sm sm:text-base text-foreground">
                                                {formatCurrencyVND(item.lineTotal)}
                                            </span>
                                            {(order.status === 'DELIVERED' || order.status === 'COMPLETED') &&
                                                (item.isReviewed ? (
                                                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                                        <CheckCircle2Icon className="h-3 w-3 text-emerald-500" />
                                                        Đã đánh giá
                                                    </span>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setReviewingItem(item)}
                                                        className="h-7 px-2.5 text-xs font-semibold rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shadow-2xs gap-1"
                                                    >
                                                        <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                        Đánh giá
                                                    </Button>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Status History Audit Log */}
                        {order.statusHistory && order.statusHistory.length > 0 && (
                            <Card className="border border-border/80 shadow-sm">
                                <CardHeader className="px-4 py-3 sm:px-6 border-b border-border/50">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                        <HistoryIcon className="h-4 w-4 text-primary" />
                                        Lịch sử cập nhật đơn hàng
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 space-y-3">
                                    {order.statusHistory.map((hist) => (
                                        <div key={hist.id} className="flex items-start gap-3 text-xs sm:text-sm">
                                            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                            <div className="flex-1">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span className="font-medium text-foreground">
                                                        {hist.reason || `Chuyển trạng thái sang ${hist.toStatus}`}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                                        {new Date(hist.createdAt).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                {hist.actorRole && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Bởi: {hist.actorRole}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Col: Address & Payment Summary */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6 min-w-0">
                        {/* Delivery Address Card */}
                        <Card className="border border-border/80 shadow-sm">
                            <CardHeader className="px-4 py-3 sm:px-6 border-b border-border/50">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                    <MapPinIcon className="h-4 w-4 text-primary" />
                                    Địa chỉ nhận hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 space-y-2 text-sm">
                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                    <span>{order.shippingFullName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                                    <span>{order.shippingPhone}</span>
                                </div>
                                <p className="text-muted-foreground text-xs leading-relaxed pt-1 border-t border-border/40">
                                    {order.shippingAddress}
                                </p>

                                {order.customerNote && (
                                    <div className="mt-3 pt-2 border-t border-border/40 text-xs">
                                        <span className="font-medium text-foreground block">Ghi chú của bạn:</span>
                                        <span className="text-muted-foreground italic">
                                            &ldquo;{order.customerNote}&rdquo;
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payment Summary Card */}
                        <Card className="border border-border/80 shadow-sm">
                            <CardHeader className="px-4 py-3 sm:px-6 border-b border-border/50">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                    <CreditCardIcon className="h-4 w-4 text-primary" />
                                    Thông tin thanh toán
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 space-y-3 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Tổng tiền hàng:</span>
                                    <span className="font-medium text-foreground">{formatCurrencyVND(subtotal)}</span>
                                </div>

                                <div className="flex justify-between text-muted-foreground">
                                    <span>Phí vận chuyển:</span>
                                    <span className="font-medium text-foreground">
                                        {Number(order.shippingFee) > 0
                                            ? formatCurrencyVND(order.shippingFee)
                                            : 'Miễn phí'}
                                    </span>
                                </div>

                                {order.vouchers && order.vouchers.length > 0 ? (
                                    <div className="space-y-2 py-1 border-t border-border/40">
                                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <TicketIcon className="size-3.5 text-primary" />
                                                Voucher đã sử dụng ({order.vouchers.length}):
                                            </span>
                                            {Number(order.voucherDiscount) > 0 && (
                                                <span className="text-emerald-600 font-bold">
                                                    -{formatCurrencyVND(order.voucherDiscount)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            {order.vouchers.map((vc) => (
                                                <div
                                                    key={vc.id || vc.code}
                                                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border/50"
                                                >
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-[10px] font-mono font-bold py-0 px-1.5 ${
                                                                vc.type === 'FREE_SHIPPING'
                                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                                                    : 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
                                                            }`}
                                                        >
                                                            {vc.code}
                                                        </Badge>
                                                        <span className="text-muted-foreground text-[11px] truncate">
                                                            {vc.description ||
                                                                (vc.type === 'FREE_SHIPPING'
                                                                    ? 'Miễn phí vận chuyển'
                                                                    : 'Mã giảm giá')}
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
                                    <div className="flex justify-between items-center text-emerald-600 text-xs">
                                        <span className="flex items-center gap-1">
                                            <TicketIcon className="size-3.5" />
                                            Voucher ({order.voucherCode || 'Áp dụng'}):
                                        </span>
                                        <span className="font-semibold">
                                            -{formatCurrencyVND(order.voucherDiscount || 0)}
                                        </span>
                                    </div>
                                ) : null}

                                <div className="pt-2 border-t border-border/60 flex justify-between items-baseline">
                                    <span className="font-semibold text-foreground">Tổng thanh toán:</span>
                                    <span className="text-lg font-bold text-primary">
                                        {formatCurrencyVND(order.totalAmount)}
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-border/40 text-xs space-y-1.5">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Phương thức:</span>
                                        <span className="font-medium text-foreground">
                                            {order.paymentMethod === 'VNPAY'
                                                ? 'Cổng thanh toán VNPay'
                                                : order.paymentMethod === 'COD'
                                                  ? 'Thanh toán khi nhận hàng (COD)'
                                                  : order.paymentMethod}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Trạng thái:</span>
                                        <span className="font-medium text-foreground">
                                            {order.paymentStatus === 'COMPLETED'
                                                ? 'Đã thanh toán'
                                                : order.paymentStatus === 'PENDING'
                                                  ? 'Chờ thanh toán'
                                                  : order.paymentStatus}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Cancel Modal */}
            <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                            <AlertTriangleIcon className="h-5 w-5" />
                            Xác nhận huỷ đơn hàng
                        </DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn huỷ đơn hàng{' '}
                            <span className="font-mono font-medium text-foreground">{order.id}</span>?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <label className="text-sm font-medium text-foreground block">Chọn lý do huỷ đơn:</label>
                        <div className="space-y-2">
                            {CANCEL_REASONS.map((reason) => (
                                <label
                                    key={reason}
                                    className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors"
                                >
                                    <input
                                        type="radio"
                                        name="cancelReason"
                                        value={reason}
                                        checked={selectedReason === reason}
                                        onChange={() => setSelectedReason(reason)}
                                        className="h-4 w-4 text-primary"
                                    />
                                    <span>{reason}</span>
                                </label>
                            ))}
                        </div>

                        {selectedReason === 'Khác' && (
                            <div className="mt-2 space-y-1">
                                <label className="text-xs text-muted-foreground">Nhập lý do chi tiết:</label>
                                <Textarea
                                    rows={3}
                                    placeholder="Vui lòng cung cấp lý do bạn muốn huỷ đơn..."
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    className="text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowCancelModal(false)}
                            disabled={isSubmittingCancel}
                        >
                            Đóng
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmCancel}
                            disabled={isSubmittingCancel}
                            className="gap-2"
                        >
                            {isSubmittingCancel ? (
                                <>
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                    Đang huỷ...
                                </>
                            ) : (
                                <>
                                    <XCircleIcon className="h-4 w-4" />
                                    Xác nhận huỷ đơn
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Đánh giá sản phẩm */}
            {reviewingItem && (
                <CreateReviewDialog
                    open={Boolean(reviewingItem)}
                    onOpenChange={(open) => !open && setReviewingItem(null)}
                    product={{
                        id: reviewingItem.productId,
                        name: reviewingItem.productName,
                        imageUrl: reviewingItem.imageUrl,
                        variantLabel: reviewingItem.variantLabel,
                    }}
                    orderItemId={reviewingItem.id}
                    onSuccess={() => {
                        void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ORDER.ALL })
                        void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ORDER.DETAIL(order.id) })
                        startTransition(() => {
                            router.refresh()
                        })
                    }}
                />
            )}
        </div>
    )
}
