'use client'

import React, { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    AlertTriangleIcon,
    ChevronRightIcon,
    HomeIcon,
    Loader2Icon,
    PackageIcon,
    SearchIcon,
    ShoppingBagIcon,
    XCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { OrderDetail, OrderStatusType } from '@timmyhub/contracts'
import {
    Button,
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
import { cancelOrderAction } from '@/features/checkout'
import { OrderCard } from './order-card'

interface OrderListViewProps {
    initialOrders: OrderDetail[]
}

const ORDER_TABS: Array<{ label: string; status: OrderStatusType | 'ALL' }> = [
    { label: 'Tất cả', status: 'ALL' },
    { label: 'Chờ xác nhận', status: 'PENDING' },
    { label: 'Đã xác nhận', status: 'CONFIRMED' },
    { label: 'Đang giao hàng', status: 'SHIPPING' },
    { label: 'Hoàn thành', status: 'DELIVERED' },
    { label: 'Đã huỷ', status: 'CANCELLED' },
]

const CANCEL_REASONS = [
    'Muốn thay đổi địa chỉ giao hàng',
    'Muốn đổi phương thức thanh toán',
    'Đổi ý, không muốn mua nữa',
    'Tìm thấy sản phẩm giá tốt hơn ở nơi khác',
    'Đặt nhầm sản phẩm hoặc số lượng',
    'Khác',
]

export function OrderListView({ initialOrders }: OrderListViewProps) {
    const router = useRouter()
    const [orders, setOrders] = useState<OrderDetail[]>(initialOrders)
    const [activeTab, setActiveTab] = useState<OrderStatusType | 'ALL'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [, startTransition] = useTransition()

    // State cho Modal huỷ đơn
    const [cancellingOrder, setCancellingOrder] = useState<OrderDetail | null>(null)
    const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]!)
    const [customReason, setCustomReason] = useState('')
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

    // Lọc đơn hàng theo Tab và Query tìm kiếm
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // Lọc theo Tab
            if (activeTab !== 'ALL') {
                if (activeTab === 'DELIVERED') {
                    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') return false
                } else if (order.status !== activeTab) {
                    return false
                }
            }

            // Lọc theo tìm kiếm (Mã đơn hoặc tên sản phẩm)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim()
                const matchesId = order.id.toLowerCase().includes(query)
                const matchesItem = order.items.some(
                    (it) =>
                        it.productName.toLowerCase().includes(query) ||
                        (it.sku && it.sku.toLowerCase().includes(query)),
                )
                const matchesShop = order.shopName?.toLowerCase().includes(query)
                return matchesId || matchesItem || matchesShop
            }

            return true
        })
    }, [orders, activeTab, searchQuery])

    // Xử lý xác nhận huỷ đơn
    const handleConfirmCancel = async () => {
        if (!cancellingOrder) return

        const finalReason = selectedReason === 'Khác' ? customReason.trim() : selectedReason
        if (selectedReason === 'Khác' && !finalReason) {
            toast.error('Vui lòng nhập lý do huỷ đơn hàng')
            return
        }

        setIsSubmittingCancel(true)
        try {
            const res = await cancelOrderAction(cancellingOrder.id, finalReason)
            if (!res.ok) {
                toast.error(res.message || 'Huỷ đơn hàng thất bại')
                return
            }

            toast.success('Đã huỷ đơn hàng thành công')
            // Cập nhật trạng thái trực tiếp trong danh sách
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === cancellingOrder.id ? { ...o, status: 'CANCELLED', cancelReason: finalReason } : o,
                ),
            )
            setCancellingOrder(null)
            setCustomReason('')
            startTransition(() => {
                router.refresh()
            })
        } catch {
            toast.error('Có lỗi xảy ra khi huỷ đơn hàng')
        } finally {
            setIsSubmittingCancel(false)
        }
    }

    return (
        <div className="w-full min-h-screen pb-16">
            {/* Top Breadcrumb & Header Banner */}
            <div className="border-b border-border/60 bg-card/60 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Link
                            href={ROUTE.HOME}
                            className="hover:text-foreground transition-colors flex items-center gap-1.5"
                        >
                            <HomeIcon className="size-3.5 text-primary" />
                            <span>Trang chủ</span>
                        </Link>
                        <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">Đơn hàng của tôi</span>
                    </nav>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <PackageIcon className="h-7 w-7 text-primary" />
                            Đơn hàng của tôi
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Quản lý và theo dõi tiến độ các đơn hàng bạn đã mua trên TimmyHub
                        </p>
                    </div>

                    <Link href="/">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 self-start sm:self-auto text-xs sm:text-sm"
                        >
                            <ShoppingBagIcon className="h-4 w-4" />
                            Tiếp tục mua sắm
                        </Button>
                    </Link>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="space-y-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-border/60">
                        {ORDER_TABS.map((tab) => {
                            const isActive = activeTab === tab.status
                            const count =
                                tab.status === 'ALL'
                                    ? orders.length
                                    : tab.status === 'DELIVERED'
                                      ? orders.filter((o) => o.status === 'DELIVERED' || o.status === 'COMPLETED')
                                            .length
                                      : orders.filter((o) => o.status === tab.status).length

                            return (
                                <button
                                    key={tab.status}
                                    type="button"
                                    onClick={() => setActiveTab(tab.status)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {count > 0 && (
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-xs font-semibold ${
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

                    {/* Search Bar */}
                    <div className="relative">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Tìm kiếm theo mã đơn hàng, tên sản phẩm hoặc tên Shop..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 h-10 w-full bg-card"
                        />
                    </div>
                </div>

                {/* Order Cards List */}
                {filteredOrders.length > 0 ? (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onCancelClick={(ord) => {
                                    setCancellingOrder(ord)
                                    setSelectedReason(CANCEL_REASONS[0]!)
                                    setCustomReason('')
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center shadow-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                            <ShoppingBagIcon className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Không tìm thấy đơn hàng nào</h3>
                        <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                            {searchQuery
                                ? `Không có đơn hàng nào khớp với từ khoá "${searchQuery}". Vui lòng thử từ khoá khác.`
                                : activeTab !== 'ALL'
                                  ? 'Bạn chưa có đơn hàng nào trong trạng thái này.'
                                  : 'Bạn chưa đặt đơn hàng nào trên TimmyHub. Hãy khám phá và mua sắm ngay!'}
                        </p>
                        <div className="mt-6 flex justify-center gap-3">
                            {searchQuery && (
                                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                                    Xoá tìm kiếm
                                </Button>
                            )}
                            <Link href="/">
                                <Button size="sm">Khám phá sản phẩm</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Modal Xác nhận Huỷ đơn */}
                <Dialog open={Boolean(cancellingOrder)} onOpenChange={(open) => !open && setCancellingOrder(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                <AlertTriangleIcon className="h-5 w-5" />
                                Xác nhận huỷ đơn hàng
                            </DialogTitle>
                            <DialogDescription>
                                Bạn có chắc chắn muốn huỷ đơn hàng{' '}
                                <span className="font-mono font-medium text-foreground">{cancellingOrder?.id}</span>?
                                Thao tác này sẽ giải phóng sản phẩm đã giữ cho bạn.
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
                                onClick={() => setCancellingOrder(null)}
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
            </div>
        </div>
    )
}
