'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon, CheckCircle2Icon, HomeIcon, MapPinIcon, PackageIcon, ShoppingBagIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { OrderDetail } from '@timmyhub/contracts'

import { Badge, Button, Card } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useOrderDetail } from '@/hooks'
import { formatCurrencyVND } from '@/utils'

interface CheckoutSuccessViewProps {
    orderId: string
    initialOrder?: OrderDetail | null
}

export function CheckoutSuccessView({ orderId, initialOrder = null }: CheckoutSuccessViewProps) {
    const t = useTranslations('checkout')
    const { data: order = initialOrder } = useOrderDetail(orderId, {
        enabled: Boolean(orderId),
    })

    return (
        <div className="relative min-h-[80vh] w-full px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-8">
                {/* 1. Header chúc mừng với glow effect */}
                <div className="text-center space-y-4">
                    <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                        <CheckCircle2Icon className="size-10 stroke-[2.5]" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                            {t('successTitle')}
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                            {t('successDesc')}
                        </p>
                    </div>
                </div>

                {/* 2. Chi tiết đơn hàng */}
                {order ? (
                    <Card className="rounded-2xl border border-border/80 shadow-md overflow-hidden bg-card divide-y divide-border/60">
                        {/* Order Header */}
                        <div className="p-5 sm:p-6 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">{t('orderCode')}:</span>
                                <p className="font-mono font-extrabold text-sm sm:text-base text-foreground">
                                    #{order.id.slice(-8).toUpperCase()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="secondary"
                                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold"
                                >
                                    Đã tiếp nhận
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {order.paymentMethod}
                                </Badge>
                            </div>
                        </div>

                        {/* Recipient and Address */}
                        <div className="p-5 sm:p-6 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                                <MapPinIcon className="size-4 text-primary" />
                                <span>Địa chỉ giao hàng</span>
                            </div>
                            <div className="pl-6 space-y-1 text-xs sm:text-sm">
                                <p className="font-bold text-foreground">
                                    {order.shippingFullName}{' '}
                                    <span className="font-normal text-muted-foreground">({order.shippingPhone})</span>
                                </p>
                                <p className="text-muted-foreground leading-relaxed">{order.shippingAddress}</p>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                                <PackageIcon className="size-4 text-primary" />
                                <span>Sản phẩm trong đơn ({order.items.length})</span>
                            </div>
                            <div className="divide-y divide-border/40 pl-6 space-y-3">
                                {order.items.map((it) => (
                                    <div key={it.id} className="flex items-center gap-3.5 pt-3 first:pt-0">
                                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                                            {it.imageUrl ? (
                                                <Image
                                                    src={it.imageUrl}
                                                    alt={it.productName}
                                                    fill
                                                    sizes="56px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-lg">
                                                    📦
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <p className="line-clamp-1 text-xs sm:text-sm font-bold text-foreground">
                                                {it.productName}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Phân loại: {it.variantLabel} · x{it.quantity}
                                            </p>
                                        </div>
                                        <span className="text-xs sm:text-sm font-bold text-foreground shrink-0">
                                            {formatCurrencyVND(it.lineTotal)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Total */}
                        <div className="p-5 sm:p-6 bg-muted/15 flex items-baseline justify-between text-sm">
                            <span className="font-bold text-foreground">Tổng thanh toán:</span>
                            <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                                {formatCurrencyVND(order.totalAmount)}
                            </span>
                        </div>
                    </Card>
                ) : (
                    <Card className="rounded-2xl border border-border/80 p-6 text-center text-xs text-muted-foreground">
                        Đang tải thông tin đơn hàng #{orderId}...
                    </Card>
                )}

                {/* 3. Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl gap-2"
                    >
                        <Link href={ROUTE.HOME}>
                            <HomeIcon className="size-4" />
                            {t('continueShopping')}
                        </Link>
                    </Button>
                    <Button
                        asChild
                        size="lg"
                        className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                        <Link href={ROUTE.ORDERS}>
                            <ShoppingBagIcon className="size-4" />
                            {t('viewOrders')}
                            <ArrowRightIcon className="size-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
