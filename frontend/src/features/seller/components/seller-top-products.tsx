'use client'

import { memo } from 'react'
import Image from 'next/image'
import { TrophyIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { TopProductItem } from '@timmyhub/contracts'

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components'
import { cn, formatCurrencyVND } from '@/utils'

interface SellerTopProductsProps {
    products: TopProductItem[]
}

const RANK_BADGES: Record<number, { label: string; class: string }> = {
    0: { label: '#1', class: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    1: { label: '#2', class: 'bg-slate-400/20 text-slate-600 dark:text-slate-300 border-slate-400/30' },
    2: { label: '#3', class: 'bg-amber-700/20 text-amber-700 dark:text-amber-300 border-amber-700/30' },
}

export const SellerTopProducts = memo(function SellerTopProducts({ products }: SellerTopProductsProps) {
    const t = useTranslations('seller.portal')

    return (
        <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <TrophyIcon className="size-4" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                        {t('topProductsTitle')}
                    </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                    {t('topProductsDescription')}
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-2 px-4 divide-y divide-border/40">
                {products.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                        Chưa có sản phẩm phát sinh đơn hàng
                    </div>
                ) : (
                    products.map((item, index) => {
                        const rank = RANK_BADGES[index] || {
                            label: `#${index + 1}`,
                            class: 'bg-muted text-muted-foreground border-border/50',
                        }

                        return (
                            <div
                                key={item.id}
                                className="py-3 flex items-center justify-between gap-3 group/item hover:bg-muted/30 px-2 rounded-xl transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span
                                        className={cn(
                                            'flex size-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold font-mono',
                                            rank.class,
                                        )}
                                    >
                                        {rank.label}
                                    </span>

                                    <div className="relative size-11 shrink-0 rounded-xl overflow-hidden bg-muted/50 border border-border/40">
                                        {item.imageUrl ? (
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.title}
                                                fill
                                                sizes="44px"
                                                className="object-cover transition-transform duration-300 group-hover/item:scale-110"
                                            />
                                        ) : (
                                            <div className="flex size-full items-center justify-center text-lg">📦</div>
                                        )}
                                    </div>

                                    <div className="min-w-0 space-y-0.5">
                                        <h4 className="text-xs font-semibold text-foreground truncate group-hover/item:text-primary transition-colors">
                                            {item.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 rounded-md">
                                                {item.category}
                                            </Badge>
                                            <span>
                                                {item.soldCount} {t('unitsSold')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0 space-y-0.5">
                                    <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                        {formatCurrencyVND(item.revenue)}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {t('stockWithCount', { count: item.stock })}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
})
