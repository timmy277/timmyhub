'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
    AlertTriangleIcon,
    ChevronRightIcon,
    HomeIcon,
    Loader2Icon,
    PackageIcon,
    SearchIcon,
    ShoppingBagIcon,
    StoreIcon,
    XCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { OrderDetail, OrderStatusType } from '@timmyhub/contracts'
import { CancelOrderInputSchema } from '@timmyhub/contracts'

import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    RadioGroup,
    RadioGroupItem,
} from '@/components'
import { FloatTextarea } from '@/components/common'
import { QUERY_KEY, ROUTE, SEARCH_DEBOUNCE_MS, SELLER_SHOP_PERMISSION } from '@/constants'
import { cancelOrderAction, getMyOrdersAction } from '@/features/checkout'
import { CreateReviewDialog } from '@/features/engagement'
import { useDebouncedValue, usePermissions } from '@/hooks'

import { OrderCard } from './order-card'

interface OrderListViewProps {
    initialOrders: OrderDetail[]
}

const ORDER_TAB_CONFIG: Array<{ labelKey: string; status: OrderStatusType | 'ALL' }> = [
    { labelKey: 'tabAll', status: 'ALL' },
    { labelKey: 'tabPending', status: 'PENDING' },
    { labelKey: 'tabConfirmed', status: 'CONFIRMED' },
    { labelKey: 'tabShipping', status: 'SHIPPING' },
    { labelKey: 'tabDelivered', status: 'DELIVERED' },
    { labelKey: 'tabCancelled', status: 'CANCELLED' },
]

const CANCEL_REASON_KEYS = [
    'changeAddress',
    'changePayment',
    'changeMind',
    'betterPrice',
    'wrongItem',
    'other',
] as const

export function OrderListView({ initialOrders }: OrderListViewProps) {
    // ===== State =====
    const [activeTab, setActiveTab] = useState<OrderStatusType | 'ALL'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    // Modal đánh giá sản phẩm
    const [reviewingItem, setReviewingItem] = useState<{
        order: OrderDetail
        item: OrderDetail['items'][number]
    } | null>(null)

    // Modal huỷ đơn
    const [cancellingOrder, setCancellingOrder] = useState<OrderDetail | null>(null)
    const [selectedReasonKey, setSelectedReasonKey] = useState<string>(CANCEL_REASON_KEYS[0]!)
    const [customReason, setCustomReason] = useState('')

    // ===== Hooks =====
    const t = useTranslations('account.orders')
    const router = useRouter()
    const queryClient = useQueryClient()
    const { hasPermission } = usePermissions()
    const isSeller = hasPermission(SELLER_SHOP_PERMISSION) || hasPermission('orders:orders:list:shop')
    const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS)

    // Đồng bộ đơn hàng qua TanStack Query với initialData từ Server Component
    const { data: orders = initialOrders } = useQuery<OrderDetail[]>({
        queryKey: QUERY_KEY.ORDER.MY_ORDERS(),
        queryFn: async () => {
            const res = await getMyOrdersAction()
            return res.ok ? res.data : initialOrders
        },
        initialData: initialOrders,
    })

    // Mutation huỷ đơn hàng qua React Query
    const cancelOrderMutation = useMutation({
        mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
            const validation = CancelOrderInputSchema.safeParse({ reason })
            if (!validation.success) {
                throw new Error(validation.error.issues[0]?.message || 'Lý do không hợp lệ')
            }
            return cancelOrderAction(orderId, reason)
        },
        onSuccess: (res) => {
            if (!res.ok) {
                toast.error(t('cancelFailed', { error: res.message || '' }))
                return
            }

            toast.success(t('cancelSuccess'))
            setCancellingOrder(null)
            setCustomReason('')
            setSelectedReasonKey(CANCEL_REASON_KEYS[0]!)
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ORDER.ALL })
            router.refresh()
        },
        onError: (err: Error) => {
            toast.error(t('cancelFailed', { error: err.message || '' }))
        },
    })

    // ===== Derived =====
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // Lọc theo Tab trạng thái
            if (activeTab !== 'ALL') {
                if (activeTab === 'DELIVERED') {
                    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') return false
                } else if (order.status !== activeTab) {
                    return false
                }
            }

            // Lọc theo Debounced Query tìm kiếm
            if (debouncedSearch.trim()) {
                const query = debouncedSearch.toLowerCase().trim()
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
    }, [orders, activeTab, debouncedSearch])

    // ===== Handlers =====
    const handleConfirmCancel = () => {
        if (!cancellingOrder) return

        const finalReason = selectedReasonKey === 'other' ? customReason.trim() : t(`reasons.${selectedReasonKey}`)

        if (selectedReasonKey === 'other' && !finalReason) {
            toast.error(t('customReasonPlaceholder'))
            return
        }

        cancelOrderMutation.mutate({
            orderId: cancellingOrder.id,
            reason: finalReason,
        })
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
                            <span>{t('breadcrumbHome')}</span>
                        </Link>
                        <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{t('breadcrumbOrders')}</span>
                    </nav>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <PackageIcon className="h-7 w-7 text-primary" />
                            {t('title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        {isSeller && (
                            <Link href={ROUTE.SELLER_ORDERS}>
                                <Button variant="default" size="sm" className="gap-2 text-xs sm:text-sm">
                                    <StoreIcon className="h-4 w-4" />
                                    {t('sellerManagement')}
                                </Button>
                            </Link>
                        )}
                        <Link href="/">
                            <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
                                <ShoppingBagIcon className="h-4 w-4" />
                                {t('continueShopping')}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="space-y-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-border/60">
                        {ORDER_TAB_CONFIG.map((tab) => {
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
                                    className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 flex items-center gap-2 select-none cursor-pointer ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                    }`}
                                >
                                    <span>{t(tab.labelKey)}</span>
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
                            placeholder={t('searchPlaceholder')}
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
                                    setSelectedReasonKey(CANCEL_REASON_KEYS[0]!)
                                    setCustomReason('')
                                }}
                                onReviewClick={(ord, item) => setReviewingItem({ order: ord, item })}
                            />
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center shadow-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                            <ShoppingBagIcon className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">
                            {debouncedSearch ? t('searchEmptyTitle') : t('emptyTitle')}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                            {debouncedSearch
                                ? t('searchEmptyDescription', { query: debouncedSearch })
                                : t('emptyDescription')}
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            {debouncedSearch && (
                                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                                    {t('clearSearch')}
                                </Button>
                            )}
                            {isSeller && (
                                <Link href={ROUTE.SELLER_ORDERS}>
                                    <Button size="sm" className="gap-2">
                                        <StoreIcon className="h-4 w-4" />
                                        {t('sellerManagement')}
                                    </Button>
                                </Link>
                            )}
                            <Link href="/">
                                <Button variant={isSeller ? 'outline' : 'default'} size="sm">
                                    {t('shopNow')}
                                </Button>
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
                                {t('cancelDialogTitle')}
                            </DialogTitle>
                            <DialogDescription>{t('cancelDialogDescription')}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2">
                            <span className="text-sm font-medium text-foreground block">{t('cancelReasonLabel')}</span>
                            <RadioGroup
                                value={selectedReasonKey}
                                onValueChange={setSelectedReasonKey}
                                className="space-y-1.5"
                            >
                                {CANCEL_REASON_KEYS.map((reasonKey) => (
                                    <label
                                        key={reasonKey}
                                        className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors"
                                    >
                                        <RadioGroupItem value={reasonKey} id={`cancel-reason-${reasonKey}`} />
                                        <span className="flex-1">{t(`reasons.${reasonKey}`)}</span>
                                    </label>
                                ))}
                            </RadioGroup>

                            {selectedReasonKey === 'other' && (
                                <div className="mt-3">
                                    <FloatTextarea
                                        label={t('customReasonPlaceholder')}
                                        placeholder=" "
                                        rows={3}
                                        maxLength={300}
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCancellingOrder(null)}
                                disabled={cancelOrderMutation.isPending}
                            >
                                {t('close')}
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleConfirmCancel}
                                disabled={cancelOrderMutation.isPending}
                                className="gap-2"
                            >
                                {cancelOrderMutation.isPending ? (
                                    <>
                                        <Loader2Icon className="h-4 w-4 animate-spin" />
                                        {t('cancelling')}
                                    </>
                                ) : (
                                    <>
                                        <XCircleIcon className="h-4 w-4" />
                                        {t('confirmCancel')}
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
                            id: reviewingItem.item.productId,
                            name: reviewingItem.item.productName,
                            imageUrl: reviewingItem.item.imageUrl,
                            variantLabel: reviewingItem.item.variantLabel,
                        }}
                        orderItemId={reviewingItem.item.id}
                        onSuccess={() => {
                            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ORDER.ALL })
                            router.refresh()
                        }}
                    />
                )}
            </div>
        </div>
    )
}
