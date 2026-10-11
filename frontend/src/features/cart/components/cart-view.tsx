'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    AlertCircleIcon,
    ArrowRightIcon,
    CheckCircle2Icon,
    ChevronRightIcon,
    HomeIcon,
    MinusIcon,
    PlusIcon,
    ShieldCheckIcon,
    ShoppingBagIcon,
    StoreIcon,
    Trash2Icon,
    TruckIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { CartDetail, CartItemDetail } from '@timmyhub/contracts'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    Badge,
    Button,
    Checkbox,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import { useCart, useClearCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks'
import { formatCurrencyVND } from '@/utils'

interface CartViewProps {
    initialData: CartDetail | null
}

export function CartView({ initialData }: CartViewProps) {
    const t = useTranslations('cart')
    const router = useRouter()
    const { data: cart } = useCart({ initialData })
    const updateItemMutation = useUpdateCartItem()
    const removeItemMutation = useRemoveCartItem()
    const clearCartMutation = useClearCart()

    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
    const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({})
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => {
        // Mặc định chọn tất cả item hợp lệ khi mở giỏ hàng
        const initialSet = new Set<string>()
        if (initialData?.shopGroups) {
            for (const group of initialData.shopGroups) {
                for (const item of group.items) {
                    if (item.isValid) {
                        initialSet.add(item.id)
                    }
                }
            }
        }
        return initialSet
    })

    // Danh sách tất cả items phẳng
    const allItems = useMemo(() => {
        return cart?.shopGroups.flatMap((group) => group.items) ?? []
    }, [cart?.shopGroups])

    // Danh sách items hợp lệ có thể thanh toán
    const validItems = useMemo(() => {
        return allItems.filter((item) => item.isValid)
    }, [allItems])

    // Kiểm tra đã chọn tất cả chưa
    const isAllSelected = validItems.length > 0 && validItems.every((item) => selectedItemIds.has(item.id))

    // Tổng tiền của các items được chọn
    const { selectedCount, selectedSubtotal } = useMemo(() => {
        let count = 0
        let subtotal = 0
        for (const item of validItems) {
            if (selectedItemIds.has(item.id)) {
                count += item.quantity
                subtotal += Number(item.price) * item.quantity
            }
        }
        return { selectedCount: count, selectedSubtotal: subtotal }
    }, [validItems, selectedItemIds])

    // Handlers chọn checkbox
    const handleToggleSelectAll = (checked: boolean) => {
        if (checked) {
            const next = new Set<string>()
            for (const item of validItems) {
                next.add(item.id)
            }
            setSelectedItemIds(next)
        } else {
            setSelectedItemIds(new Set())
        }
    }

    const handleToggleShopGroup = (shopGroupItems: typeof allItems, checked: boolean) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev)
            for (const item of shopGroupItems) {
                if (item.isValid) {
                    if (checked) {
                        next.add(item.id)
                    } else {
                        next.delete(item.id)
                    }
                }
            }
            return next
        })
    }

    const handleToggleItem = (itemId: string, checked: boolean) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev)
            if (checked) {
                next.add(itemId)
            } else {
                next.delete(itemId)
            }
            return next
        })
    }

    // Handlers sửa số lượng
    const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) return
        setUpdatingItemId(itemId)
        setEditingQuantities((prev) => {
            if (!(itemId in prev)) return prev
            const next = { ...prev }
            delete next[itemId]
            return next
        })
        try {
            await updateItemMutation.mutateAsync({
                itemId,
                input: { quantity: newQuantity },
            })
            toast.success(t('page.updateQtySuccess'))
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể cập nhật số lượng'
            toast.error(message)
        } finally {
            setUpdatingItemId(null)
        }
    }

    const handleQuantityInputChange = (itemId: string, value: string) => {
        const clean = value.replace(/\D/g, '')
        setEditingQuantities((prev) => ({
            ...prev,
            [itemId]: clean,
        }))
    }

    const handleCommitItemQuantity = (item: CartItemDetail) => {
        const valStr = editingQuantities[item.id]
        if (valStr === undefined) return

        // Xoá state nhập tạm thời để nếu rollback thì tự động quay về item.quantity
        setEditingQuantities((prev) => {
            const next = { ...prev }
            delete next[item.id]
            return next
        })

        const parsed = parseInt(valStr, 10)
        if (isNaN(parsed) || parsed < 1) {
            toast.warning(t('page.qtyMinWarning'))
            return
        }

        if (item.stock > 0 && parsed > item.stock) {
            toast.warning(t('page.qtyMaxWarning', { max: item.stock }))
            return
        }

        if (parsed === item.quantity) {
            return
        }

        handleUpdateQuantity(item.id, parsed)
    }

    const handleStepItemQuantity = (item: CartItemDetail, delta: number) => {
        if (editingQuantities[item.id] !== undefined) {
            setEditingQuantities((prev) => {
                const next = { ...prev }
                delete next[item.id]
                return next
            })
        }
        const nextQty = item.quantity + delta
        if (nextQty < 1) return
        if (item.stock > 0 && nextQty > item.stock) {
            toast.warning(t('page.qtyMaxWarning', { max: item.stock }))
            return
        }
        handleUpdateQuantity(item.id, nextQty)
    }

    // Handlers xoá item
    const handleRemoveItem = async (itemId: string) => {
        try {
            await removeItemMutation.mutateAsync(itemId)
            setSelectedItemIds((prev) => {
                const next = new Set(prev)
                next.delete(itemId)
                return next
            })
            toast.success(t('page.removeItemSuccess'))
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể xoá sản phẩm'
            toast.error(message)
        }
    }

    // Handlers làm trống giỏ hàng
    const handleClearCart = async () => {
        try {
            await clearCartMutation.mutateAsync()
            setSelectedItemIds(new Set())
            toast.success(t('page.clearCartSuccess'))
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể làm trống giỏ hàng'
            toast.error(message)
        }
    }

    // Handler thanh toán
    const handleCheckout = () => {
        if (selectedCount === 0) {
            toast.error(t('page.selectAtLeastOne'))
            return
        }
        const selectedIds = Array.from(selectedItemIds).join(',')
        router.push(`${ROUTE.CHECKOUT}?items=${encodeURIComponent(selectedIds)}`)
    }

    // Trạng thái giỏ hàng rỗng
    if (!cart || allItems.length === 0) {
        return (
            <div className="relative min-h-[70vh] w-full px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-4xl text-center space-y-6">
                    {/* Breadcrumb */}
                    <nav
                        aria-label="Breadcrumb"
                        className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pb-4"
                    >
                        <Link
                            href={ROUTE.HOME}
                            className="hover:text-foreground transition-colors flex items-center gap-1.5"
                        >
                            <HomeIcon className="size-3.5 text-primary" />
                            <span>{t('page.breadcrumbHome')}</span>
                        </Link>
                        <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{t('page.breadcrumbCart')}</span>
                    </nav>

                    <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-md p-10 sm:p-16 shadow-md flex flex-col items-center space-y-5">
                        <div className="flex size-24 items-center justify-center rounded-3xl bg-muted/60 text-muted-foreground">
                            <ShoppingBagIcon className="size-12 stroke-[1.25]" />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
                                {t('page.emptyTitle')}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">{t('page.emptyDesc')}</p>
                        </div>
                        <Button
                            asChild
                            size="lg"
                            className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2"
                        >
                            <Link href={ROUTE.HOME}>
                                <span>{t('page.continueShopping')}</span>
                                <ArrowRightIcon className="size-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen w-full pb-20">
            {/* Top Breadcrumb & Header Banner */}
            <div className="border-b border-border/60 bg-card/60 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <nav
                            aria-label="Breadcrumb"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                            <Link
                                href={ROUTE.HOME}
                                className="hover:text-foreground transition-colors flex items-center gap-1.5"
                            >
                                <HomeIcon className="size-3.5 text-primary" />
                                <span>{t('page.breadcrumbHome')}</span>
                            </Link>
                            <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                            <span className="font-medium text-foreground">{t('page.breadcrumbCart')}</span>
                        </nav>
                        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            <TruckIcon className="size-3.5 shrink-0" />
                            <span>{t('page.freeShippingBanner')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Cart Content */}
            <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
                <div className="flex items-center justify-between pb-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading flex items-center gap-3">
                        <span>{t('page.title')}</span>
                        <Badge variant="secondary" className="font-mono text-sm font-bold px-2.5 py-0.5">
                            {cart.totalItems}
                        </Badge>
                    </h1>

                    {/* Clear Cart Trigger */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                            >
                                <Trash2Icon className="size-3.5 mr-1.5" />
                                {t('page.clearCart')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('page.clearCartConfirmTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('page.clearCartConfirmDesc')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Huỷ</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleClearCart}
                                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Xác nhận xoá
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* ════════════════════════════════════════════════════════════════
                     * LEFT COLUMN: CART ITEMS LIST GROUPED BY SHOP
                     * ════════════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-8 space-y-5">
                        {/* Table Header Bar with Select All */}
                        <div className="hidden sm:grid grid-cols-12 items-center gap-4 rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md px-5 py-3.5 text-xs font-bold text-muted-foreground shadow-xs">
                            <div className="col-span-6 flex items-center gap-3">
                                <Checkbox
                                    id="select-all-header"
                                    checked={isAllSelected}
                                    onCheckedChange={handleToggleSelectAll}
                                    aria-label="Chọn tất cả"
                                />
                                <label htmlFor="select-all-header" className="cursor-pointer text-foreground">
                                    {t('page.selectAll', { count: validItems.length })}
                                </label>
                            </div>
                            <div className="col-span-2 text-center">{t('page.colUnitPrice')}</div>
                            <div className="col-span-2 text-center">{t('page.colQuantity')}</div>
                            <div className="col-span-2 text-right">{t('page.colTotal')}</div>
                        </div>

                        {/* Shop Groups */}
                        {cart.shopGroups.map((group) => {
                            const groupValidItems = group.items.filter((item) => item.isValid)
                            const isGroupSelected =
                                groupValidItems.length > 0 &&
                                groupValidItems.every((item) => selectedItemIds.has(item.id))

                            return (
                                <div
                                    key={group.shopId}
                                    className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md overflow-hidden shadow-sm"
                                >
                                    {/* Shop Header */}
                                    <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id={`shop-${group.shopId}`}
                                                checked={isGroupSelected}
                                                disabled={groupValidItems.length === 0}
                                                onCheckedChange={(checked) =>
                                                    handleToggleShopGroup(group.items, Boolean(checked))
                                                }
                                                aria-label={`Chọn tất cả sản phẩm của shop ${group.shopName}`}
                                            />
                                            <label
                                                htmlFor={`shop-${group.shopId}`}
                                                className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground"
                                            >
                                                <StoreIcon className="size-4 text-primary" />
                                                <span>{group.shopName}</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Items in Shop */}
                                    <div className="divide-y divide-border/60">
                                        {group.items.map((item) => {
                                            const isSelected = selectedItemIds.has(item.id)
                                            const isUpdating = updatingItemId === item.id
                                            const lineTotal = Number(item.price) * item.quantity
                                            const variantText = item.variantOptions
                                                ? Object.values(item.variantOptions).join(', ')
                                                : null

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`p-4 sm:p-5 transition-colors ${
                                                        !item.isValid ? 'bg-muted/30 opacity-75' : 'hover:bg-muted/15'
                                                    }`}
                                                >
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                                                        {/* Product Info & Checkbox */}
                                                        <div className="sm:col-span-6 flex items-start gap-3">
                                                            <div className="pt-1">
                                                                <Checkbox
                                                                    id={`item-${item.id}`}
                                                                    checked={isSelected}
                                                                    disabled={!item.isValid}
                                                                    onCheckedChange={(checked) =>
                                                                        handleToggleItem(item.id, Boolean(checked))
                                                                    }
                                                                    aria-label={`Chọn sản phẩm ${item.productName}`}
                                                                />
                                                            </div>

                                                            {/* Thumbnail Image */}
                                                            <Link
                                                                href={ROUTE.PRODUCT_DETAIL(item.productId)}
                                                                className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/20 group"
                                                            >
                                                                <Image
                                                                    src={
                                                                        item.productImage ||
                                                                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'
                                                                    }
                                                                    alt={item.productName}
                                                                    fill
                                                                    className="object-cover transition-transform group-hover:scale-105"
                                                                    sizes="80px"
                                                                />
                                                            </Link>

                                                            {/* Title, Options & Warnings */}
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <Link
                                                                    href={ROUTE.PRODUCT_DETAIL(item.productId)}
                                                                    className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors leading-snug"
                                                                >
                                                                    {item.productName}
                                                                </Link>

                                                                {variantText && (
                                                                    <p className="text-[11px] text-muted-foreground font-medium">
                                                                        Phân loại: {variantText}
                                                                    </p>
                                                                )}

                                                                {/* Validity Alert Badges */}
                                                                {!item.isValid && (
                                                                    <div className="pt-1">
                                                                        <Badge
                                                                            variant="destructive"
                                                                            className="text-[10px] px-2 py-0.5 gap-1 font-semibold"
                                                                        >
                                                                            <AlertCircleIcon className="size-3" />
                                                                            {item.invalidReason === 'OUT_OF_STOCK'
                                                                                ? t('page.outOfStock')
                                                                                : item.invalidReason ===
                                                                                    'INACTIVE_VARIANT'
                                                                                  ? t('page.invalidVariant')
                                                                                  : t('page.invalidShop')}
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Unit Price */}
                                                        <div className="sm:col-span-2 text-left sm:text-center">
                                                            <span className="sm:hidden text-xs text-muted-foreground mr-2 font-medium">
                                                                Đơn giá:
                                                            </span>
                                                            <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                                                                {formatCurrencyVND(item.price)}
                                                            </span>
                                                        </div>

                                                        {/* Quantity Controls */}
                                                        <div className="sm:col-span-2 flex items-center sm:justify-center gap-1">
                                                            <div className="flex items-center rounded-xl border border-border/80 bg-background p-0.5 shadow-2xs">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStepItemQuantity(item, -1)}
                                                                    disabled={item.quantity <= 1 || isUpdating}
                                                                    aria-label="Giảm số lượng"
                                                                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                                                                >
                                                                    <MinusIcon className="size-3" />
                                                                </button>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={
                                                                        editingQuantities[item.id] !== undefined
                                                                            ? editingQuantities[item.id]
                                                                            : item.quantity
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleQuantityInputChange(
                                                                            item.id,
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    onBlur={() => handleCommitItemQuantity(item)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.currentTarget.blur()
                                                                        }
                                                                    }}
                                                                    disabled={isUpdating || !item.isValid}
                                                                    aria-label={`Số lượng ${item.productName}`}
                                                                    className={`w-9 text-center font-mono text-xs font-bold text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 p-0 transition-opacity ${
                                                                        isUpdating ? 'opacity-50' : ''
                                                                    }`}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStepItemQuantity(item, 1)}
                                                                    disabled={
                                                                        isUpdating ||
                                                                        !item.isValid ||
                                                                        (item.stock > 0 && item.quantity >= item.stock)
                                                                    }
                                                                    aria-label="Tăng số lượng"
                                                                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                                                                >
                                                                    <PlusIcon className="size-3" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Line Total & Remove Action */}
                                                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3">
                                                            <span className="sm:hidden text-xs text-muted-foreground font-medium">
                                                                Thành tiền:
                                                            </span>
                                                            <div className="text-right">
                                                                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                                                    {formatCurrencyVND(lineTotal)}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(item.id)}
                                                                aria-label={`Xoá ${item.productName}`}
                                                                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95"
                                                            >
                                                                <Trash2Icon className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* ════════════════════════════════════════════════════════════════
                     * RIGHT COLUMN: STICKY ORDER SUMMARY
                     * ════════════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-4 sticky top-24 space-y-4">
                        <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-6 shadow-sm space-y-5">
                            <h2 className="text-base font-bold text-foreground font-heading">
                                {t('page.summaryTitle')}
                            </h2>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>{t('page.selectedCount')}</span>
                                    <span className="font-mono font-bold text-foreground">{selectedCount}</span>
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>{t('page.subtotal')}</span>
                                    <span className="font-mono font-bold text-foreground">
                                        {formatCurrencyVND(selectedSubtotal)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>{t('page.shippingFee')}</span>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                        {t('page.freeShipping')}
                                    </span>
                                </div>

                                <div className="border-t border-border/60 pt-3 flex items-baseline justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold text-foreground">{t('page.totalPayment')}</p>
                                        <p className="text-[10px] text-muted-foreground">{t('page.vatIncluded')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                                            {formatCurrencyVND(selectedSubtotal)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                onClick={handleCheckout}
                                disabled={selectedCount === 0}
                                className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-transform active:scale-95 gap-2"
                            >
                                <span>{t('page.checkoutBtn', { count: selectedCount })}</span>
                                <ArrowRightIcon className="size-4" />
                            </Button>
                        </div>

                        {/* Trust Guarantee Box */}
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-2.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2 text-foreground font-semibold">
                                <ShieldCheckIcon className="size-4 text-emerald-700 dark:text-emerald-400" />
                                <span>Cam kết mua sắm an tâm tại TimmyHub</span>
                            </div>
                            <div className="space-y-1.5 text-[11px] pl-6">
                                <p className="flex items-center gap-1.5">
                                    <CheckCircle2Icon className="size-3 text-primary shrink-0" />
                                    <span>Bảo vệ thanh toán 100% đến khi nhận hàng</span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                    <CheckCircle2Icon className="size-3 text-primary shrink-0" />
                                    <span>Đổi trả miễn phí trong 7 ngày nếu lỗi</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
