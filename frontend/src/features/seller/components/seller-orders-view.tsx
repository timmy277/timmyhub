'use client'

import React, { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    AlertTriangleIcon,
    CheckCircle2Icon,
    CheckIcon,
    ClockIcon,
    EyeIcon,
    Loader2Icon,
    MapPinIcon,
    PackageIcon,
    PhoneIcon,
    PrinterIcon,
    RefreshCwIcon,
    SearchIcon,
    ShoppingBagIcon,
    TruckIcon,
    UserIcon,
    XCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { OrderDetail, OrderStatusType, UpdateOrderStatusInput } from '@timmyhub/contracts'
import {
    Badge,
    Button,
    Card,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Textarea,
} from '@/components'
import { ROUTE } from '@/constants'
import { formatCurrencyVND } from '@/utils'
import { getSellerOrdersAction, updateSellerOrderStatusAction } from '../actions'

interface SellerOrdersViewProps {
    initialOrders?: OrderDetail[]
}

const SELLER_ORDER_TABS: Array<{ label: string; status: OrderStatusType | 'ALL' }> = [
    { label: 'Tất cả', status: 'ALL' },
    { label: 'Chờ xác nhận', status: 'PENDING' },
    { label: 'Đã xác nhận', status: 'CONFIRMED' },
    { label: 'Đang xử lý / Đóng gói', status: 'PROCESSING' },
    { label: 'Đang giao hàng', status: 'SHIPPING' },
    { label: 'Đã giao thành công', status: 'DELIVERED' },
    { label: 'Đã huỷ', status: 'CANCELLED' },
]

const SELLER_CANCEL_REASONS = [
    'Hết hàng trong kho',
    'Khách hàng yêu cầu huỷ đơn',
    'Không thể liên hệ với người mua để xác nhận',
    'Sai sót về thông tin giá hoặc sản phẩm',
    'Địa chỉ giao hàng nằm ngoài khu vực hỗ trợ',
    'Khác',
]

const STATUS_BADGE_MAP: Record<
    string,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
    PENDING: {
        label: 'Chờ xác nhận',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: ClockIcon,
    },
    CONFIRMED: {
        label: 'Đã xác nhận',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
        icon: CheckCircle2Icon,
    },
    PROCESSING: {
        label: 'Đang đóng gói',
        className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        icon: PackageIcon,
    },
    PACKED: {
        label: 'Đã đóng gói',
        className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
        icon: PackageIcon,
    },
    SHIPPING: {
        label: 'Đang giao hàng',
        className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
        icon: TruckIcon,
    },
    DELIVERED: {
        label: 'Đã giao thành công',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2Icon,
    },
    COMPLETED: {
        label: 'Hoàn thành',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2Icon,
    },
    CANCELLED: {
        label: 'Đã huỷ',
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: XCircleIcon,
    },
}

export function SellerOrdersView({ initialOrders = [] }: SellerOrdersViewProps) {
    const router = useRouter()
    const [orders, setOrders] = useState<OrderDetail[]>(initialOrders)
    const [activeTab, setActiveTab] = useState<OrderStatusType | 'ALL'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'COD' | 'VNPAY'>('ALL')
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    // Detail Modal State
    const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null)

    // Cancel Modal State
    const [cancellingOrder, setCancellingOrder] = useState<OrderDetail | null>(null)
    const [selectedReason, setSelectedReason] = useState<string>(SELLER_CANCEL_REASONS[0]!)
    const [customReason, setCustomReason] = useState('')
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

    // Thống kê nhanh
    const counts: Record<string, number> = useMemo(() => {
        return {
            ALL: orders.length,
            PENDING: orders.filter((o) => o.status === 'PENDING').length,
            CONFIRMED: orders.filter((o) => o.status === 'CONFIRMED').length,
            PROCESSING: orders.filter((o) => o.status === 'PROCESSING' || o.status === 'PACKED').length,
            SHIPPING: orders.filter((o) => o.status === 'SHIPPING').length,
            DELIVERED: orders.filter((o) => o.status === 'DELIVERED' || o.status === 'COMPLETED').length,
            CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
        }
    }, [orders])

    // Lọc đơn hàng
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // Lọc theo Tab
            if (activeTab !== 'ALL') {
                if (activeTab === 'PROCESSING') {
                    if (order.status !== 'PROCESSING' && order.status !== 'PACKED') return false
                } else if (activeTab === 'DELIVERED') {
                    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') return false
                } else if (order.status !== activeTab) {
                    return false
                }
            }

            // Lọc theo thanh toán
            if (paymentFilter !== 'ALL' && order.paymentMethod !== paymentFilter) {
                return false
            }

            // Lọc theo tìm kiếm
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim()
                const matchesId = order.id.toLowerCase().includes(q)
                const matchesBuyer = order.shippingFullName.toLowerCase().includes(q)
                const matchesPhone = order.shippingPhone.includes(q)
                const matchesItems = order.items.some(
                    (it) => it.productName.toLowerCase().includes(q) || (it.sku && it.sku.toLowerCase().includes(q)),
                )
                return matchesId || matchesBuyer || matchesPhone || matchesItems
            }

            return true
        })
    }, [orders, activeTab, paymentFilter, searchQuery])

    // Refresh dữ liệu từ server
    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            const res = await getSellerOrdersAction()
            if (res.ok) {
                setOrders(res.data)
                toast.success('Đã làm mới danh sách đơn hàng')
            } else {
                toast.error('Không thể tải lại danh sách đơn hàng')
            }
        } catch {
            toast.error('Lỗi kết nối máy chủ')
        } finally {
            setIsRefreshing(false)
        }
    }

    // Cập nhật trạng thái đơn hàng
    const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatusType, note?: string) => {
        setUpdatingOrderId(orderId)
        try {
            const res = await updateSellerOrderStatusAction(orderId, {
                status: nextStatus as UpdateOrderStatusInput['status'],
                note,
            })

            if (!res.ok) {
                toast.error(res.message || 'Cập nhật trạng thái đơn hàng thất bại')
                return
            }

            toast.success(`Đã chuyển trạng thái đơn hàng sang ${STATUS_BADGE_MAP[nextStatus]?.label || nextStatus}`)
            setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)))
            if (detailOrder?.id === orderId) {
                setDetailOrder(res.data)
            }
            startTransition(() => {
                router.refresh()
            })
        } catch {
            toast.error('Có lỗi xảy ra khi cập nhật đơn hàng')
        } finally {
            setUpdatingOrderId(null)
        }
    }

    // Xử lý xác nhận huỷ đơn
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
            setOrders((prev) => prev.map((o) => (o.id === cancellingOrder.id ? res.data : o)))
            if (detailOrder?.id === cancellingOrder.id) {
                setDetailOrder(res.data)
            }
            setCancellingOrder(null)
            startTransition(() => {
                router.refresh()
            })
        } catch {
            toast.error('Có lỗi xảy ra khi huỷ đơn hàng')
        } finally {
            setIsSubmittingCancel(false)
        }
    }

    // In hoá đơn / phiếu giao hàng
    const handlePrintInvoice = (order: OrderDetail) => {
        toast.info(`Đang chuẩn bị phiếu đóng gói cho đơn #${order.id}`)
        window.print()
    }

    return (
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
                        <ShoppingBagIcon className="size-7 text-primary" />
                        <span>Quản lý đơn hàng</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Xử lý đơn đặt hàng của người mua, xác nhận, đóng gói và theo dõi tình trạng giao hàng.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-1.5 shadow-2xs"
                    >
                        <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                        <span>Làm mới</span>
                    </Button>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="border border-border/70 bg-card/60 shadow-2xs p-3">
                    <p className="text-xs text-muted-foreground font-medium">Chờ xác nhận</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-0.5">{counts.PENDING}</p>
                </Card>
                <Card className="border border-border/70 bg-card/60 shadow-2xs p-3">
                    <p className="text-xs text-muted-foreground font-medium">Đã xác nhận</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-500 mt-0.5">{counts.CONFIRMED}</p>
                </Card>
                <Card className="border border-border/70 bg-card/60 shadow-2xs p-3">
                    <p className="text-xs text-muted-foreground font-medium">Đang đóng gói</p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-500 mt-0.5">{counts.PROCESSING}</p>
                </Card>
                <Card className="border border-border/70 bg-card/60 shadow-2xs p-3">
                    <p className="text-xs text-muted-foreground font-medium">Đang giao</p>
                    <p className="text-xl sm:text-2xl font-bold text-sky-500 mt-0.5">{counts.SHIPPING}</p>
                </Card>
                <Card className="border border-border/70 bg-card/60 shadow-2xs p-3">
                    <p className="text-xs text-muted-foreground font-medium">Đã hoàn thành</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-0.5">{counts.DELIVERED}</p>
                </Card>
                <Card className="border border-border/70 bg-card/60 shadow-2xs p-3">
                    <p className="text-xs text-muted-foreground font-medium">Đã huỷ</p>
                    <p className="text-xl sm:text-2xl font-bold text-rose-500 mt-0.5">{counts.CANCELLED}</p>
                </Card>
            </div>

            {/* Admin Table Section */}
            <section className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-xs overflow-hidden">
                {/* Status Tabs Navigation */}
                <div className="flex items-center gap-1 overflow-x-auto p-3 border-b border-border/60 bg-muted/20 scrollbar-none">
                    {SELLER_ORDER_TABS.map((tab) => {
                        const isActive = activeTab === tab.status
                        const count = counts[tab.status] ?? 0

                        return (
                            <button
                                key={tab.status}
                                type="button"
                                onClick={() => setActiveTab(tab.status)}
                                className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-2xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {count > 0 && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[11px] font-semibold ${
                                            isActive
                                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Toolbar: Search & Payment Filter */}
                <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/10">
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Tìm theo mã đơn, người mua, SĐT hoặc tên sản phẩm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 h-9 text-xs sm:text-sm bg-background"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Thanh toán:</span>
                        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs">
                            <button
                                type="button"
                                onClick={() => setPaymentFilter('ALL')}
                                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                    paymentFilter === 'ALL'
                                        ? 'bg-background shadow-2xs font-semibold text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Tất cả
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentFilter('COD')}
                                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                    paymentFilter === 'COD'
                                        ? 'bg-background shadow-2xs font-semibold text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                COD
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentFilter('VNPAY')}
                                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                    paymentFilter === 'VNPAY'
                                        ? 'bg-background shadow-2xs font-semibold text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                VNPay
                            </button>
                        </div>
                    </div>
                </div>

                {/* Orders Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-border/70 bg-muted/30 text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                                <th className="px-4 py-3 min-w-[140px]">Mã đơn / Ngày tạo</th>
                                <th className="px-4 py-3 min-w-[200px]">Khách hàng</th>
                                <th className="px-4 py-3 min-w-[260px]">Sản phẩm</th>
                                <th className="px-4 py-3 min-w-[150px]">Tổng tiền & TT</th>
                                <th className="px-4 py-3 min-w-[130px]">Trạng thái</th>
                                <th className="px-4 py-3 min-w-[180px] text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => {
                                    const statusInfo = STATUS_BADGE_MAP[order.status] || {
                                        label: order.status,
                                        className: 'bg-muted text-foreground',
                                        icon: ClockIcon,
                                    }
                                    const StatusIcon = statusInfo.icon
                                    const isUpdating = updatingOrderId === order.id

                                    return (
                                        <tr key={order.id} className="hover:bg-muted/30 transition-colors group">
                                            {/* Mã đơn / Ngày đặt */}
                                            <td className="px-4 py-3.5 align-top">
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailOrder(order)}
                                                    className="font-mono font-bold text-xs sm:text-sm text-primary hover:underline block text-left cursor-pointer"
                                                >
                                                    #{order.id.slice(-8).toUpperCase()}
                                                </button>
                                                <span className="text-[11px] text-muted-foreground block mt-0.5">
                                                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                                                </span>
                                            </td>

                                            {/* Khách hàng */}
                                            <td className="px-4 py-3.5 align-top">
                                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    <span>{order.shippingFullName}</span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                    <PhoneIcon className="h-3 w-3 shrink-0" />
                                                    <span>{order.shippingPhone}</span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground/90 line-clamp-2 mt-1 leading-relaxed">
                                                    {order.shippingAddress}
                                                </p>
                                            </td>

                                            {/* Sản phẩm */}
                                            <td className="px-4 py-3.5 align-top">
                                                <div className="space-y-2">
                                                    {order.items.slice(0, 2).map((item) => (
                                                        <div key={item.id} className="flex items-center gap-2.5">
                                                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted/20">
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
                                                                    className="font-medium text-xs text-foreground line-clamp-1 hover:text-primary transition-colors block"
                                                                >
                                                                    {item.productName}
                                                                </Link>
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    x{item.quantity} &bull;{' '}
                                                                    {formatCurrencyVND(item.unitPrice)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {order.items.length > 2 && (
                                                        <span className="text-[11px] text-muted-foreground italic block">
                                                            + {order.items.length - 2} sản phẩm khác...
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Tổng tiền & Thanh toán */}
                                            <td className="px-4 py-3.5 align-top">
                                                <div className="font-bold text-sm text-foreground">
                                                    {formatCurrencyVND(order.totalAmount)}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5 py-0 font-medium border-border/60"
                                                    >
                                                        {order.paymentMethod}
                                                    </Badge>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[10px] px-1.5 py-0 font-medium ${
                                                            order.paymentStatus === 'PAID'
                                                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                                        }`}
                                                    >
                                                        {order.paymentStatus === 'PAID' ? 'Đã TT' : 'Chưa TT'}
                                                    </Badge>
                                                </div>
                                            </td>

                                            {/* Trạng thái đơn */}
                                            <td className="px-4 py-3.5 align-top">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.className}`}
                                                >
                                                    <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                                                    <span>{statusInfo.label}</span>
                                                </span>
                                            </td>

                                            {/* Thao tác */}
                                            <td className="px-4 py-3.5 align-top text-right space-y-1.5">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDetailOrder(order)}
                                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                        title="Xem chi tiết đơn"
                                                    >
                                                        <EyeIcon className="h-3.5 w-3.5 mr-1" />
                                                        Chi tiết
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handlePrintInvoice(order)}
                                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                                                        title="In phiếu đóng hàng"
                                                    >
                                                        <PrinterIcon className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>

                                                {/* Nút hành động nhanh theo luồng trạng thái */}
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {order.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleUpdateStatus(order.id, 'CONFIRMED')
                                                                }
                                                                disabled={isUpdating}
                                                                className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                                                            >
                                                                {isUpdating ? (
                                                                    <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                                                                ) : (
                                                                    <CheckIcon className="h-3 w-3 mr-1" />
                                                                )}
                                                                Xác nhận
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setCancellingOrder(order)}
                                                                className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                                            >
                                                                Huỷ
                                                            </Button>
                                                        </>
                                                    )}

                                                    {order.status === 'CONFIRMED' && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                                                            disabled={isUpdating}
                                                            className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                                                            ) : (
                                                                <PackageIcon className="h-3 w-3 mr-1" />
                                                            )}
                                                            Chuẩn bị hàng
                                                        </Button>
                                                    )}

                                                    {order.status === 'PROCESSING' && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => handleUpdateStatus(order.id, 'SHIPPING')}
                                                            disabled={isUpdating}
                                                            className="h-7 text-xs px-2.5 bg-sky-600 hover:bg-sky-700 text-white"
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                                                            ) : (
                                                                <TruckIcon className="h-3 w-3 mr-1" />
                                                            )}
                                                            Giao ĐVVC
                                                        </Button>
                                                    )}

                                                    {order.status === 'SHIPPING' && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                                                            disabled={isUpdating}
                                                            className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                                                            ) : (
                                                                <CheckCircle2Icon className="h-3 w-3 mr-1" />
                                                            )}
                                                            Đã giao
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                                            <PackageIcon className="h-6 w-6" />
                                        </div>
                                        <p className="font-medium text-foreground">Không tìm thấy đơn hàng nào</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm của bạn.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div className="p-3 border-t border-border/50 bg-muted/20 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                    <span>
                        Hiển thị <strong>{filteredOrders.length}</strong> / <strong>{orders.length}</strong> đơn hàng
                    </span>
                    <span>Kênh quản trị nhà bán hàng TimmyHub</span>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
             * ORDER DETAIL DIALOG / MODAL
             * ═══════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {detailOrder && (
                        <>
                            <DialogHeader>
                                <div className="flex flex-wrap items-center justify-between gap-2 mr-6">
                                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                        <span>Chi tiết đơn hàng #{detailOrder.id}</span>
                                    </DialogTitle>
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                STATUS_BADGE_MAP[detailOrder.status]?.className || ''
                                            }`}
                                        >
                                            {STATUS_BADGE_MAP[detailOrder.status]?.label || detailOrder.status}
                                        </span>
                                    </div>
                                </div>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Ngày đặt hàng:{' '}
                                    <span className="font-medium text-foreground">
                                        {new Date(detailOrder.createdAt).toLocaleString('vi-VN')}
                                    </span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-5 py-2">
                                {/* Buyer & Shipping Info */}
                                <div className="rounded-xl border border-border/70 p-4 bg-muted/20 space-y-2">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                        <MapPinIcon className="h-3.5 w-3.5 text-primary" />
                                        <span>Địa chỉ giao hàng</span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-1">
                                        <div>
                                            <span className="text-xs text-muted-foreground">Người nhận:</span>
                                            <p className="font-semibold text-foreground">
                                                {detailOrder.shippingFullName}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground">Số điện thoại:</span>
                                            <p className="font-semibold text-foreground">{detailOrder.shippingPhone}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                                        {detailOrder.shippingAddress}
                                    </p>
                                    {detailOrder.customerNote && (
                                        <p className="text-xs italic text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-md">
                                            Ghi chú của khách: &ldquo;{detailOrder.customerNote}&rdquo;
                                        </p>
                                    )}
                                </div>

                                {/* Items List */}
                                <div className="rounded-xl border border-border/70 overflow-hidden">
                                    <div className="p-3 bg-muted/40 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase">
                                        Danh sách sản phẩm trong đơn ({detailOrder.items.length})
                                    </div>
                                    <div className="divide-y divide-border/40 p-4 space-y-3">
                                        {detailOrder.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between gap-3 pt-3 first:pt-0"
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
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
                                                            className="font-medium text-sm text-foreground line-clamp-1 hover:text-primary transition-colors"
                                                        >
                                                            {item.productName}
                                                        </Link>
                                                        {item.variantLabel && item.variantLabel !== 'Mặc định' && (
                                                            <span className="text-xs text-muted-foreground block">
                                                                Phân loại: {item.variantLabel}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatCurrencyVND(item.unitPrice)} x {item.quantity}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="font-bold text-sm text-foreground shrink-0">
                                                    {formatCurrencyVND(item.lineTotal)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment & Total Summary */}
                                <div className="rounded-xl border border-border/70 p-4 bg-muted/20 space-y-2 text-sm">
                                    <div className="flex justify-between text-muted-foreground text-xs">
                                        <span>Phương thức thanh toán:</span>
                                        <span className="font-semibold text-foreground uppercase">
                                            {detailOrder.paymentMethod} ({detailOrder.paymentStatus})
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground text-xs">
                                        <span>Phí vận chuyển:</span>
                                        <span className="font-medium text-foreground">
                                            {Number(detailOrder.shippingFee) > 0
                                                ? formatCurrencyVND(detailOrder.shippingFee)
                                                : 'Miễn phí'}
                                        </span>
                                    </div>
                                    {detailOrder.voucherDiscount && Number(detailOrder.voucherDiscount) > 0 && (
                                        <div className="flex justify-between text-emerald-600 text-xs">
                                            <span>Giảm giá voucher:</span>
                                            <span>-{formatCurrencyVND(detailOrder.voucherDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-border/60 flex justify-between items-baseline font-bold text-base">
                                        <span>Tổng tiền thu:</span>
                                        <span className="text-primary text-lg">
                                            {formatCurrencyVND(detailOrder.totalAmount)}
                                        </span>
                                    </div>
                                </div>

                                {/* Status Timeline Audit */}
                                {detailOrder.statusHistory && detailOrder.statusHistory.length > 0 && (
                                    <div className="rounded-xl border border-border/70 p-4 space-y-2.5">
                                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                                            Lịch sử trạng thái đơn
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            {detailOrder.statusHistory.map((hist) => (
                                                <div
                                                    key={hist.id}
                                                    className="flex items-start gap-2.5 text-muted-foreground"
                                                >
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                                    <div className="flex-1">
                                                        <span className="font-medium text-foreground">
                                                            {hist.reason || `Chuyển trạng thái sang ${hist.toStatus}`}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground ml-2">
                                                            ({new Date(hist.createdAt).toLocaleString('vi-VN')})
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePrintInvoice(detailOrder)}
                                    className="gap-1.5"
                                >
                                    <PrinterIcon className="h-4 w-4" />
                                    <span>In phiếu giao hàng</span>
                                </Button>

                                <div className="flex items-center gap-2">
                                    {detailOrder.status === 'PENDING' && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setCancellingOrder(detailOrder)
                                                    setDetailOrder(null)
                                                }}
                                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                            >
                                                Huỷ đơn
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleUpdateStatus(detailOrder.id, 'CONFIRMED')}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                Xác nhận đơn
                                            </Button>
                                        </>
                                    )}

                                    {detailOrder.status === 'CONFIRMED' && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(detailOrder.id, 'PROCESSING')}
                                            className="bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            Chuyển sang Đang đóng gói
                                        </Button>
                                    )}

                                    {detailOrder.status === 'PROCESSING' && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(detailOrder.id, 'SHIPPING')}
                                            className="bg-sky-600 hover:bg-sky-700"
                                        >
                                            Bàn giao cho Đơn vị vận chuyển
                                        </Button>
                                    )}

                                    {detailOrder.status === 'SHIPPING' && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(detailOrder.id, 'DELIVERED')}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            Xác nhận Giao thành công
                                        </Button>
                                    )}

                                    <Button variant="ghost" size="sm" onClick={() => setDetailOrder(null)}>
                                        Đóng
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════════════
             * CANCEL ORDER DIALOG / MODAL
             * ═══════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!cancellingOrder} onOpenChange={(open) => !open && setCancellingOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-rose-600">
                            <AlertTriangleIcon className="h-5 w-5" />
                            <DialogTitle className="text-lg font-bold">Huỷ đơn hàng</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground pt-1">
                            Huỷ đơn #{cancellingOrder?.id}. Sau khi huỷ, số lượng hàng sẽ tự động hoàn lại tồn kho khả
                            dụng.
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
        </div>
    )
}
