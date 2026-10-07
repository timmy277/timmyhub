'use client'

import { useMemo, useState } from 'react'
import {
    Check,
    CheckCircle2,
    Clock,
    FileText,
    MapPin,
    Package,
    Phone,
    Printer,
    Search,
    ShoppingBag,
    Truck,
    User,
    XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/components'

type OrderStatus = 'pending_confirm' | 'pending_pickup' | 'shipping' | 'completed' | 'cancelled'

interface OrderItem {
    id: string
    name: string
    variant?: string
    quantity: number
    price: number
    image?: string
}

interface OrderRecord {
    id: string
    code: string
    createdAt: string
    customerName: string
    customerPhone: string
    shippingAddress: string
    paymentMethod: 'COD' | 'TimmyPay' | 'CreditCard'
    paymentStatus: 'paid' | 'pending'
    status: OrderStatus
    items: OrderItem[]
    shippingFee: number
    discount: number
}

const INITIAL_ORDERS: OrderRecord[] = [
    {
        id: 'ord-01',
        code: '#TM-9281',
        createdAt: '2026-10-06 10:15',
        customerName: 'Nguyễn Văn An',
        customerPhone: '0912 345 678',
        shippingAddress: 'Tòa nhà Bitexco, Số 2 Hải Triều, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        paymentMethod: 'COD',
        paymentStatus: 'pending',
        status: 'pending_pickup',
        shippingFee: 30000,
        discount: 20000,
        items: [
            {
                id: 'it-1',
                name: 'Tai nghe Bluetooth Timmy Pro Wireless',
                variant: 'Màu Đen Nhám',
                quantity: 1,
                price: 880000,
            },
        ],
    },
    {
        id: 'ord-02',
        code: '#TM-9280',
        createdAt: '2026-10-06 09:30',
        customerName: 'Trần Thị Mai',
        customerPhone: '0987 654 321',
        shippingAddress: '18 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
        paymentMethod: 'TimmyPay',
        paymentStatus: 'paid',
        status: 'shipping',
        shippingFee: 25000,
        discount: 0,
        items: [
            {
                id: 'it-2',
                name: 'Đồng hồ thông minh TimmyWatch Gen 3',
                variant: 'Bản Dây Da Nâu',
                quantity: 1,
                price: 1425000,
            },
        ],
    },
    {
        id: 'ord-03',
        code: '#TM-9279',
        createdAt: '2026-10-05 16:45',
        customerName: 'Lê Hoàng Nam',
        customerPhone: '0903 112 233',
        shippingAddress: '45 Lê Duẩn, Thạch Thang, Hải Châu, Đà Nẵng',
        paymentMethod: 'CreditCard',
        paymentStatus: 'paid',
        status: 'completed',
        shippingFee: 30000,
        discount: 50000,
        items: [
            {
                id: 'it-3',
                name: 'Bàn phím cơ Custom 75% Switch Pro',
                variant: 'Linear Red Switch / White',
                quantity: 1,
                price: 1910000,
            },
        ],
    },
    {
        id: 'ord-04',
        code: '#TM-9278',
        createdAt: '2026-10-06 11:20',
        customerName: 'Phạm Thị Hương',
        customerPhone: '0978 998 877',
        shippingAddress: '120 Đường 30/4, An Phú, Ninh Kiều, Cần Thơ',
        paymentMethod: 'COD',
        paymentStatus: 'pending',
        status: 'pending_confirm',
        shippingFee: 20000,
        discount: 0,
        items: [
            {
                id: 'it-4',
                name: 'Chuột máy tính không dây Silent Click',
                variant: 'Màu Xám Không Gian',
                quantity: 2,
                price: 250000,
            },
        ],
    },
    {
        id: 'ord-05',
        code: '#TM-9277',
        createdAt: '2026-10-05 14:10',
        customerName: 'Võ Minh Trí',
        customerPhone: '0934 556 677',
        shippingAddress: '24 Đường số 7, Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
        paymentMethod: 'TimmyPay',
        paymentStatus: 'paid',
        status: 'shipping',
        shippingFee: 20000,
        discount: 0,
        items: [
            {
                id: 'it-5',
                name: 'Giá đỡ laptop công thái học hợp kim nhôm',
                variant: 'Bạc Titan',
                quantity: 1,
                price: 370000,
            },
        ],
    },
    {
        id: 'ord-06',
        code: '#TM-9276',
        createdAt: '2026-10-04 18:20',
        customerName: 'Đặng Thanh Tùng',
        customerPhone: '0945 678 123',
        shippingAddress: '88 Quang Trung, Phường 10, Gò Vấp, TP. Hồ Chí Minh',
        paymentMethod: 'COD',
        paymentStatus: 'pending',
        status: 'cancelled',
        shippingFee: 30000,
        discount: 0,
        items: [
            {
                id: 'it-6',
                name: 'Cáp sạc siêu nhanh 100W Type-C bọc dù',
                variant: 'Chiều dài 2m',
                quantity: 1,
                price: 180000,
            },
        ],
    },
]

const STATUS_CONFIG: Record<
    OrderStatus,
    { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
    pending_confirm: {
        label: 'Chờ xác nhận',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: Clock,
    },
    pending_pickup: {
        label: 'Chờ lấy hàng',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
        icon: Package,
    },
    shipping: {
        label: 'Đang giao',
        badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        icon: Truck,
    },
    completed: {
        label: 'Đã hoàn thành',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2,
    },
    cancelled: {
        label: 'Đã hủy',
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: XCircle,
    },
}

export function SellerOrdersView() {
    const t = useTranslations('seller.orders')
    const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null)

    // Tính tổng đơn theo từng trạng thái
    const counts = useMemo(() => {
        return {
            all: orders.length,
            pending_confirm: orders.filter((o) => o.status === 'pending_confirm').length,
            pending_pickup: orders.filter((o) => o.status === 'pending_pickup').length,
            shipping: orders.filter((o) => o.status === 'shipping').length,
            completed: orders.filter((o) => o.status === 'completed').length,
            cancelled: orders.filter((o) => o.status === 'cancelled').length,
        }
    }, [orders])

    // Lọc theo search và tab
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter
            const query = searchQuery.trim().toLowerCase()
            const matchesQuery =
                !query ||
                order.code.toLowerCase().includes(query) ||
                order.customerName.toLowerCase().includes(query) ||
                order.customerPhone.includes(query) ||
                order.items.some((i) => i.name.toLowerCase().includes(query))

            return matchesStatus && matchesQuery
        })
    }, [orders, statusFilter, searchQuery])

    const handleConfirmOrder = (orderId: string) => {
        setOrders((prev) =>
            prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'pending_pickup' as OrderStatus } : ord)),
        )
        toast.success(t('orderConfirmed'))
    }

    const handleHandoverShipping = (orderId: string) => {
        setOrders((prev) =>
            prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'shipping' as OrderStatus } : ord)),
        )
        toast.success(t('orderHandedOver'))
    }

    const handlePrintInvoice = (orderCode: string) => {
        toast.info(t('printingInvoice', { code: orderCode }))
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
    }

    const calculateOrderTotal = (order: OrderRecord) => {
        const itemsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        return itemsTotal + order.shippingFee - order.discount
    }

    return (
        <div className="space-y-6 pb-16">
            {/* ═══════════════════════════════════════════════════════════════════
             * HEADER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
                        <ShoppingBag className="size-7 text-primary" />
                        <span>Quản lý đơn hàng</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Theo dõi đơn hàng, đóng gói, bàn giao vận chuyển và xử lý khiếu nại khách hàng.
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * QUICK STATS BAR
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border border-border/70 bg-card/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Chờ xác nhận</p>
                            <p className="text-2xl font-bold text-amber-500">{counts.pending_confirm}</p>
                        </div>
                        <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Clock className="size-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Chờ lấy hàng</p>
                            <p className="text-2xl font-bold text-blue-500">{counts.pending_pickup}</p>
                        </div>
                        <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Package className="size-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Đang giao</p>
                            <p className="text-2xl font-bold text-indigo-500">{counts.shipping}</p>
                        </div>
                        <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <Truck className="size-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Đã hoàn thành</p>
                            <p className="text-2xl font-bold text-emerald-500">{counts.completed}</p>
                        </div>
                        <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="size-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * CONTROLS & TABS FILTER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                    <TabsList className="h-11 rounded-2xl bg-card/70 p-1 border border-border/70 backdrop-blur-md shadow-sm flex flex-wrap gap-1 w-full max-w-4xl justify-start overflow-x-auto">
                        <TabsTrigger value="all" className="rounded-xl text-xs font-semibold gap-1.5">
                            <span>Tất cả</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                {counts.all}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="pending_confirm" className="rounded-xl text-xs font-semibold gap-1.5">
                            <span>Chờ xác nhận</span>
                            {counts.pending_confirm > 0 && (
                                <Badge className="px-1.5 py-0 text-[10px] bg-amber-500 text-white">
                                    {counts.pending_confirm}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="pending_pickup" className="rounded-xl text-xs font-semibold gap-1.5">
                            <span>Chờ lấy hàng</span>
                            {counts.pending_pickup > 0 && (
                                <Badge className="px-1.5 py-0 text-[10px] bg-blue-500 text-white">
                                    {counts.pending_pickup}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="shipping" className="rounded-xl text-xs font-semibold gap-1.5">
                            <span>Đang giao</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                {counts.shipping}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-xl text-xs font-semibold gap-1.5">
                            <span>Đã hoàn thành</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                {counts.completed}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="rounded-xl text-xs font-semibold gap-1.5">
                            <span>Đã hủy</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                {counts.cancelled}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo mã đơn (#TM-...), tên khách, sản phẩm..."
                        className="pl-10 rounded-xl border-border/70 bg-card/60 backdrop-blur-md"
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * ORDERS LIST
             * ═══════════════════════════════════════════════════════════════════ */}
            {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3 bg-card/30">
                    <div className="size-12 mx-auto rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="size-6" />
                    </div>
                    <h3 className="font-bold text-foreground text-base">Không tìm thấy đơn hàng nào</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang bộ lọc trạng thái khác.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => {
                        const statusConf = STATUS_CONFIG[order.status]
                        const StatusIcon = statusConf.icon
                        const total = calculateOrderTotal(order)

                        return (
                            <Card
                                key={order.id}
                                className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden hover:border-primary/40 transition-colors"
                            >
                                <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-extrabold text-base text-foreground font-mono">
                                            {order.code}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="size-3.5" />
                                            {order.createdAt}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={`font-semibold text-xs gap-1 ${statusConf.badgeClass}`}
                                        >
                                            <StatusIcon className="size-3" />
                                            {statusConf.label}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl text-xs font-semibold gap-1.5 h-8"
                                            onClick={() => handlePrintInvoice(order.code)}
                                        >
                                            <Printer className="size-3.5" />
                                            <span>In vận đơn</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-xl text-xs font-semibold gap-1.5 h-8"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <FileText className="size-3.5" />
                                            <span>Chi tiết</span>
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 sm:p-5 space-y-4">
                                    {/* Items List */}
                                    <div className="space-y-3">
                                        {order.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between gap-3 text-xs"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/50">
                                                        <Package className="size-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-foreground truncate">
                                                            {item.name}
                                                        </p>
                                                        {item.variant && (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                Phân loại: {item.variant}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <p className="font-medium text-foreground">
                                                        x{item.quantity} &bull; {formatCurrency(item.price)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Customer & Total Section */}
                                    <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium text-foreground">
                                                <User className="size-3.5 text-primary" />
                                                {order.customerName}
                                            </span>
                                            <span>&bull;</span>
                                            <span className="flex items-center gap-1">
                                                <Phone className="size-3.5" />
                                                {order.customerPhone}
                                            </span>
                                            <span>&bull;</span>
                                            <Badge variant="secondary" className="text-[10px]">
                                                {order.paymentMethod === 'COD'
                                                    ? 'Thanh toán COD'
                                                    : order.paymentMethod === 'TimmyPay'
                                                      ? 'Ví TimmyPay'
                                                      : 'Thẻ tín dụng'}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-3 self-end sm:self-center">
                                            <div className="text-right">
                                                <span className="text-[11px] text-muted-foreground mr-2">
                                                    Tổng tiền:
                                                </span>
                                                <span className="font-extrabold text-base text-primary font-mono">
                                                    {formatCurrency(total)}
                                                </span>
                                            </div>

                                            {order.status === 'pending_confirm' && (
                                                <Button
                                                    size="sm"
                                                    className="rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
                                                    onClick={() => handleConfirmOrder(order.id)}
                                                >
                                                    <Check className="size-3.5" />
                                                    <span>Xác nhận đơn</span>
                                                </Button>
                                            )}

                                            {order.status === 'pending_pickup' && (
                                                <Button
                                                    size="sm"
                                                    className="rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white gap-1"
                                                    onClick={() => handleHandoverShipping(order.id)}
                                                >
                                                    <Truck className="size-3.5" />
                                                    <span>Giao cho ĐVVC</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
             * ORDER DETAIL DIALOG
             * ═══════════════════════════════════════════════════════════════════ */}
            <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="sm:max-w-xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between text-lg font-bold">
                            <span>Chi tiết đơn hàng {selectedOrder?.code}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Ngày tạo: {selectedOrder?.createdAt} &bull; Mã hệ thống: {selectedOrder?.id}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-4 py-2 text-xs">
                            {/* Customer information */}
                            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                                <p className="font-bold text-foreground flex items-center gap-1.5">
                                    <MapPin className="size-4 text-primary" />
                                    <span>Thông tin giao nhận</span>
                                </p>
                                <div className="space-y-1 text-muted-foreground pl-5.5">
                                    <p className="text-foreground font-semibold">
                                        {selectedOrder.customerName} ({selectedOrder.customerPhone})
                                    </p>
                                    <p>{selectedOrder.shippingAddress}</p>
                                </div>
                            </div>

                            {/* Items breakdown */}
                            <div className="space-y-2">
                                <p className="font-bold text-foreground">Sản phẩm trong đơn</p>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((it) => (
                                        <div
                                            key={it.id}
                                            className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card"
                                        >
                                            <div>
                                                <p className="font-semibold text-foreground">{it.name}</p>
                                                {it.variant && (
                                                    <p className="text-[11px] text-muted-foreground">{it.variant}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-foreground">
                                                    {formatCurrency(it.price * it.quantity)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    SL: {it.quantity} &times; {formatCurrency(it.price)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment summary */}
                            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1.5">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Phương thức thanh toán:</span>
                                    <span className="font-semibold text-foreground">
                                        {selectedOrder.paymentMethod === 'COD'
                                            ? 'Thanh toán khi nhận hàng (COD)'
                                            : selectedOrder.paymentMethod === 'TimmyPay'
                                              ? 'Ví TimmyPay'
                                              : 'Thẻ tín dụng'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Phí vận chuyển:</span>
                                    <span>{formatCurrency(selectedOrder.shippingFee)}</span>
                                </div>
                                {selectedOrder.discount > 0 && (
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>Giảm giá khuyến mãi:</span>
                                        <span>-{formatCurrency(selectedOrder.discount)}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-border/50 flex justify-between font-bold text-sm text-foreground">
                                    <span>Tổng thanh toán:</span>
                                    <span className="text-primary font-mono text-base">
                                        {formatCurrency(calculateOrderTotal(selectedOrder))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedOrder(null)}
                            className="rounded-xl font-semibold"
                        >
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
