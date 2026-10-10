'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon, ShoppingBagIcon, ShoppingCartIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge, Button, Popover, PopoverContent, PopoverTrigger, ScrollArea } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useCart } from '@/hooks'
import { formatCurrencyVND } from '@/utils'

export function CartButton() {
    const t = useTranslations('cart')
    const [open, setOpen] = useState(false)
    const { data: cart } = useCart()

    const totalItems = cart?.totalItems ?? 0
    const items = cart?.shopGroups.flatMap((group) => group.items) ?? []

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-9 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted/80 transition-transform active:scale-95"
                    aria-label={t('dropdown.title')}
                >
                    <ShoppingCartIcon className="size-4.5" />
                    {totalItems > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[11px] font-bold text-primary-foreground shadow-sm animate-in zoom-in-75 duration-200">
                            {totalItems > 99 ? '99+' : totalItems}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border border-border/80 bg-card/95 backdrop-blur-xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <ShoppingCartIcon className="size-4 text-primary" />
                        <span className="font-bold text-sm text-foreground">{t('dropdown.title')}</span>
                    </div>
                    {totalItems > 0 && (
                        <Badge variant="secondary" className="font-mono text-xs font-bold px-2 py-0.5">
                            {t('dropdown.itemsCount', { count: totalItems })}
                        </Badge>
                    )}
                </div>

                {/* Items List or Empty State */}
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                            <ShoppingBagIcon className="size-7 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-sm text-foreground">{t('dropdown.emptyTitle')}</p>
                            <p className="text-xs text-muted-foreground">{t('dropdown.emptyDesc')}</p>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="max-h-72">
                        <div className="divide-y divide-border/40 p-2">
                            {items.map((item) => {
                                const variantText = item.variantOptions
                                    ? Object.values(item.variantOptions).join(', ')
                                    : null

                                return (
                                    <Link
                                        key={item.id}
                                        href={ROUTE.PRODUCT_DETAIL(item.productId)}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-muted/50 group"
                                    >
                                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                                            <Image
                                                src={
                                                    item.productImage ||
                                                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'
                                                }
                                                alt={item.productName}
                                                fill
                                                className="object-cover transition-transform group-hover:scale-105"
                                                sizes="48px"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <p className="truncate text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                                {item.productName}
                                            </p>
                                            {variantText && (
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    {variantText}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                                    {formatCurrencyVND(item.price)}
                                                </span>
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    × {item.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}

                {/* Footer */}
                <div className="border-t border-border/60 bg-muted/20 p-3 space-y-2.5">
                    {items.length > 0 && (
                        <div className="flex items-center justify-between px-1 text-xs">
                            <span className="text-muted-foreground">{t('dropdown.subtotal')}</span>
                            <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                {formatCurrencyVND(cart?.totalAmount ?? 0)}
                            </span>
                        </div>
                    )}
                    <Button
                        asChild
                        size="sm"
                        className="w-full rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        onClick={() => setOpen(false)}
                    >
                        <Link href={ROUTE.CART} className="flex items-center justify-center gap-1.5">
                            <span>{t('dropdown.viewCart')}</span>
                            <ArrowRightIcon className="size-3.5" />
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
