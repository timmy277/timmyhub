'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
    CalendarIcon,
    ChevronRightIcon,
    StoreIcon,
    XCircleIcon,
    EyeIcon,
    RotateCcwIcon,
    Loader2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { OrderDetail } from '@timmyhub/contracts'
import { Button, Card, CardContent, CardFooter, CardHeader } from '@/components'
import { QUERY_KEY, ROUTE } from '@/constants'
import { addToCartAction } from '@/features/cart'
import { formatCurrencyVND } from '@/utils'
import { OrderStatusBadge, PaymentStatusBadge } from './order-status-badge'

interface OrderCardProps {
    order: OrderDetail
    onCancelClick?: (order: OrderDetail) => void
    onViewDetail?: (order: OrderDetail) => void
}

export function OrderCard({ order, onCancelClick, onViewDetail }: OrderCardProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [isReordering, setIsReordering] = useState(false)
    const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED'

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

    return (
        <Card className="@container overflow-hidden border border-border/70 shadow-sm transition-all duration-200 hover:shadow-md dark:border-border/60">
            {/* Card Header: Shop & Status */}
            <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <StoreIcon className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-sm sm:text-base text-foreground">
                            {order.shopName || 'TimmyHub Mall'}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">&bull;</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground hidden sm:flex">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <PaymentStatusBadge status={order.paymentStatus} method={order.paymentMethod} />
                        <OrderStatusBadge status={order.status} />
                    </div>
                </div>
            </CardHeader>

            {/* Card Content: Item List */}
            <CardContent className="p-4 sm:p-6 divide-y divide-border/40">
                {order.items.map((item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3 sm:gap-4">
                        <Link
                            href={item.productId ? ROUTE.PRODUCT_DETAIL(item.productId) : '#'}
                            className="group relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                    <span className="font-medium text-foreground/80">{item.variantLabel}</span>
                                </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>x{item.quantity}</span>
                                <span>&bull;</span>
                                <span>{formatCurrencyVND(item.unitPrice)}</span>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <span className="font-semibold text-sm sm:text-base text-foreground">
                                {formatCurrencyVND(item.lineTotal)}
                            </span>
                        </div>
                    </div>
                ))}
            </CardContent>

            {/* Card Footer: Mã đơn ở trên, Thành tiền & Action buttons ngang hàng ở dưới */}
            <CardFooter className="bg-muted/10 border-t border-border/50 p-4 sm:px-6 flex flex-col items-start gap-3 sm:gap-3.5">
                {/* Hàng 1: Mã đơn */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <span className="whitespace-nowrap font-medium text-muted-foreground">Mã đơn:</span>
                    <span className="font-mono font-medium text-foreground select-all break-all">{order.id}</span>
                </div>

                {/* Hàng 2: Thành tiền và các action buttons ngang hàng */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 w-full">
                    <div className="flex items-baseline gap-1.5 mr-1 shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Thành tiền:</span>
                        <span className="text-base sm:text-lg font-bold text-primary whitespace-nowrap">
                            {formatCurrencyVND(order.totalAmount)}
                        </span>
                    </div>

                    {canCancel && onCancelClick && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCancelClick(order)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-xs sm:text-sm"
                        >
                            <XCircleIcon className="h-3.5 w-3.5 mr-1 text-rose-500" />
                            Huỷ đơn
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReorder}
                        disabled={isReordering}
                        className="text-xs sm:text-sm border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                        {isReordering ? (
                            <Loader2Icon className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                            <RotateCcwIcon className="h-3.5 w-3.5 mr-1" />
                        )}
                        Mua lại
                    </Button>

                    {onViewDetail ? (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onViewDetail(order)}
                            className="text-xs sm:text-sm shadow-sm"
                        >
                            <EyeIcon className="h-3.5 w-3.5 mr-1" />
                            Chi tiết
                            <ChevronRightIcon className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                    ) : (
                        <Link href={ROUTE.ORDER_DETAIL(order.id)}>
                            <Button variant="default" size="sm" className="text-xs sm:text-sm shadow-sm">
                                <EyeIcon className="h-3.5 w-3.5 mr-1" />
                                Chi tiết
                                <ChevronRightIcon className="h-3.5 w-3.5 ml-0.5" />
                            </Button>
                        </Link>
                    )}
                </div>
            </CardFooter>
        </Card>
    )
}
