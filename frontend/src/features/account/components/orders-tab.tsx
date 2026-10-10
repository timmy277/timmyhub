'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
    AlertTriangleIcon,
    ExternalLinkIcon,
    Loader2Icon,
    PackageOpenIcon,
    RefreshCwIcon,
    SearchIcon,
    ShoppingBagIcon,
    XCircleIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { OrderDetail, OrderStatusType } from '@timmyhub/contracts'
import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Skeleton,
    Textarea,
} from '@/components'
import { QUERY_KEY, ROUTE } from '@/constants'
import { cancelOrderAction, getMyOrdersAction, getOrderByIdAction } from '@/features/checkout'
import { OrderCard, OrderDetailView } from '@/features/orders'

const CANCEL_REASONS = [
    'Muốn thay đổi địa chỉ giao hàng',
    'Muốn đổi phương thức thanh toán',
    'Đổi ý, không muốn mua nữa',
    'Tìm thấy sản phẩm giá tốt hơn ở nơi khác',
    'Đặt nhầm sản phẩm hoặc số lượng',
    'Khác',
]

interface OrdersTabProps {
    onCloseDialog?: () => void
}

export function OrdersTab({ onCloseDialog }: OrdersTabProps) {
    const t = useTranslations('account.orders')
    const tCommon = useTranslations('common')
    const queryClient = useQueryClient()

    const [activeTab, setActiveTab] = useState<OrderStatusType | 'ALL'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    // State cho Modal huỷ đơn
    const [cancellingOrder, setCancellingOrder] = useState<OrderDetail | null>(null)
    const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]!)
    const [customReason, setCustomReason] = useState('')
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

    const {
        data: orders = [],
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: QUERY_KEY.ORDER.MY_ORDERS(),
        queryFn: async () => {
            const res = await getMyOrdersAction()
            if (!res.ok) throw new Error(res.message || 'Lỗi khi tải đơn hàng')
            return res.data
        },
        staleTime: 30_000,
    })

    const filterTabs: Array<{ label: string; status: OrderStatusType | 'ALL' }> = useMemo(
        () => [
            { label: t('tabAll'), status: 'ALL' },
            { label: t('tabPending'), status: 'PENDING' },
            { label: t('tabConfirmed'), status: 'CONFIRMED' },
            { label: t('tabShipping'), status: 'SHIPPING' },
            { label: t('tabDelivered'), status: 'DELIVERED' },
            { label: t('tabCancelled'), status: 'CANCELLED' },
        ],
        [t],
    )

    // Lọc đơn hàng theo Tab và Query tìm kiếm
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            if (activeTab !== 'ALL') {
                if (activeTab === 'DELIVERED') {
                    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') return false
                } else if (order.status !== activeTab) {
                    return false
                }
            }

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
            toast.error(t('customReasonPlaceholder'))
            return
        }

        setIsSubmittingCancel(true)
        try {
            const res = await cancelOrderAction(cancellingOrder.id, finalReason)
            if (!res.ok) {
                toast.error(res.message || t('cancelFailed', { error: res.code }))
                return
            }

            toast.success(t('cancelSuccess'))
            setCancellingOrder(null)
            setCustomReason('')
            await queryClient.invalidateQueries({ queryKey: QUERY_KEY.ORDER.MY_ORDERS() })
        } catch {
            toast.error(tCommon('errorGeneric'))
        } finally {
            setIsSubmittingCancel(false)
        }
    }

    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()

    const selectedOrderId = searchParams.get('orderId')

    const orderFromList = useMemo(() => {
        if (!selectedOrderId) return null
        return orders.find((o) => o.id === selectedOrderId) ?? null
    }, [orders, selectedOrderId])

    const {
        data: fetchedOrder,
        isLoading: isLoadingOrder,
        isError: isErrorOrder,
    } = useQuery({
        queryKey: QUERY_KEY.ORDER.DETAIL(selectedOrderId!),
        queryFn: async () => {
            const res = await getOrderByIdAction(selectedOrderId!)
            if (!res.ok) throw new Error(res.message || 'Không tìm thấy đơn hàng')
            return res.data
        },
        enabled: Boolean(selectedOrderId && !orderFromList),
        staleTime: 30_000,
    })

    const currentOrder = orderFromList ?? fetchedOrder

    const handleViewDetail = (order: OrderDetail) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('orderId', order.id)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleBackToList = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('orderId')
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    if (selectedOrderId) {
        if (isLoadingOrder && !currentOrder) {
            return (
                <div className="space-y-4">
                    <Skeleton className="h-9 w-44 rounded-lg" />
                    <Skeleton className="h-44 w-full rounded-2xl" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-80 md:col-span-2 rounded-xl" />
                        <Skeleton className="h-80 rounded-xl" />
                    </div>
                </div>
            )
        }

        if (isErrorOrder || (!currentOrder && !isLoading && !isLoadingOrder)) {
            return (
                <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-destructive/30 bg-destructive/5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
                        <AlertTriangleIcon className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold">{tCommon('errorTitle')}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Không tìm thấy đơn hàng #{selectedOrderId}</p>
                    <Button size="sm" variant="outline" onClick={handleBackToList} className="mt-4 text-xs">
                        <span>Quay lại danh sách đơn hàng</span>
                    </Button>
                </Card>
            )
        }

        if (currentOrder) {
            return <OrderDetailView initialOrder={currentOrder} onBack={handleBackToList} isModalOrTab />
        }
    }

    return (
        <div className="space-y-6">
            <Card className="border-border/80 shadow-xs">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold">{t('title')}</CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => refetch()}
                                disabled={isFetching}
                                title={tCommon('retry')}
                            >
                                <RefreshCwIcon className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        <CardDescription className="text-xs">{t('description')}</CardDescription>
                    </div>

                    <Link href={`${ROUTE.ORDERS}?view=buyer`} onClick={onCloseDialog} className="shrink-0">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <span>{t('viewAllOrders')}</span>
                            <ExternalLinkIcon className="h-3 w-3" />
                        </Button>
                    </Link>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                    {/* Filter Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/60">
                        {filterTabs.map((tab) => {
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
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {count > 0 && (
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
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
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 h-9 text-xs w-full bg-muted/20"
                        />
                    </div>

                    {/* Orders List Container */}
                    {isLoading ? (
                        <div className="space-y-3 pt-2">
                            <Skeleton className="h-36 w-full rounded-xl" />
                            <Skeleton className="h-36 w-full rounded-xl" />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-destructive/30 rounded-xl bg-destructive/5">
                            <AlertTriangleIcon className="h-8 w-8 text-destructive" />
                            <h4 className="mt-2 text-sm font-semibold">{tCommon('errorTitle')}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">{tCommon('errorDescription')}</p>
                            <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-3 text-xs">
                                {tCommon('retry')}
                            </Button>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-border/80 rounded-xl bg-muted/5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                                <PackageOpenIcon className="h-6 w-6" />
                            </div>
                            <h4 className="text-sm font-semibold text-foreground">{t('emptyTitle')}</h4>
                            <p className="mt-1 text-xs text-muted-foreground max-w-sm">{t('emptyDescription')}</p>
                            <Link href="/" onClick={onCloseDialog} className="mt-4">
                                <Button size="sm" className="gap-1.5 text-xs">
                                    <ShoppingBagIcon className="h-3.5 w-3.5" />
                                    <span>{t('shopNow')}</span>
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-1">
                            {filteredOrders.map((order) => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onCancelClick={(o) => setCancellingOrder(o)}
                                    onViewDetail={handleViewDetail}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal Xác nhận Huỷ đơn hàng */}
            <Dialog open={Boolean(cancellingOrder)} onOpenChange={(open) => !open && setCancellingOrder(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600 text-base">
                            <AlertTriangleIcon className="h-5 w-5" />
                            {t('cancelDialogTitle')}
                        </DialogTitle>
                        <DialogDescription className="text-xs">{t('cancelDialogDescription')}</DialogDescription>
                    </DialogHeader>

                    {cancellingOrder && (
                        <div className="space-y-4 py-2">
                            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Mã đơn:</span>
                                    <span className="font-mono font-medium text-foreground">{cancellingOrder.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shop:</span>
                                    <span className="font-medium text-foreground">
                                        {cancellingOrder.shopName || 'TimmyHub Mall'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground">{t('cancelReasonLabel')}</label>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {CANCEL_REASONS.map((reason) => (
                                        <label
                                            key={reason}
                                            className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/40 cursor-pointer text-xs transition-colors"
                                        >
                                            <input
                                                type="radio"
                                                name="cancelReason"
                                                value={reason}
                                                checked={selectedReason === reason}
                                                onChange={(e) => setSelectedReason(e.target.value)}
                                                className="text-primary focus:ring-primary"
                                            />
                                            <span>{reason}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {selectedReason === 'Khác' && (
                                <div className="space-y-1.5">
                                    <Textarea
                                        placeholder={t('customReasonPlaceholder')}
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        className="text-xs min-h-[70px]"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancellingOrder(null)}
                            disabled={isSubmittingCancel}
                            className="text-xs"
                        >
                            {t('keepOrder')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleConfirmCancel}
                            disabled={isSubmittingCancel}
                            className="text-xs gap-1.5"
                        >
                            {isSubmittingCancel ? (
                                <>
                                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                                    <span>{t('cancelling')}</span>
                                </>
                            ) : (
                                <>
                                    <XCircleIcon className="h-3.5 w-3.5" />
                                    <span>{t('confirmCancel')}</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
