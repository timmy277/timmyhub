'use client'

import React from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { Check, Plus, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Skeleton,
} from '@/components/ui'
import { API_ROUTE, QUERY_KEY } from '@/constants'
import { apiClient } from '@/services'
import { formatCurrencyVND } from '@/utils'

export interface ProductPickerItem {
    id: string
    name: string
    slug: string
    thumbnail?: string | null
    minPrice?: number | null
}

export interface ProductPickerDialogProps {
    selectedProductIds: string[]
    onToggleProduct: (productId: string) => void
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProductPickerDialog({
    selectedProductIds,
    onToggleProduct,
    open,
    onOpenChange,
}: ProductPickerDialogProps) {
    const t = useTranslations('content.form')

    const { data, isLoading } = useQuery<{ items: ProductPickerItem[] }>({
        queryKey: QUERY_KEY.PRODUCTS.PUBLIC_LIST({ limit: 30 }),
        queryFn: async () => {
            const res = await apiClient.get<{ items: ProductPickerItem[] }>(API_ROUTE.CATALOG.PUBLIC_PRODUCTS, {
                params: { limit: 30 },
            })
            return res.data
        },
        enabled: open,
    })

    const products = data?.items || []

    const handleSelect = (productId: string) => {
        if (!selectedProductIds.includes(productId) && selectedProductIds.length >= 5) {
            toast.warning(t('maxProductsWarning'))
            return
        }
        onToggleProduct(productId)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-dashed border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs flex items-center gap-1.5 h-9"
                >
                    <Plus className="size-3.5" />
                    <span>{t('addProductTag')}</span>
                    {selectedProductIds.length > 0 && (
                        <Badge className="ml-1 bg-emerald-500 text-black text-[10px] px-1.5 py-0 h-4">
                            {selectedProductIds.length}/5
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <ShoppingBag className="size-4 text-emerald-500" />
                        <span>{t('productTagsLabel')}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">{t('productTagsDesc')}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-3">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                    ) : products.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-8">
                            Chưa có sản phẩm nào trong cửa hàng để gắn thẻ.
                        </p>
                    ) : (
                        products.map((p) => {
                            const isSelected = selectedProductIds.includes(p.id)
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelect(p.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                                            : 'border-border/70 hover:border-emerald-500/40 bg-card hover:bg-muted/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative size-12 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/50">
                                            {p.thumbnail ? (
                                                <Image src={p.thumbnail} alt={p.name} fill className="object-cover" />
                                            ) : (
                                                <div className="size-full flex items-center justify-center text-muted-foreground">
                                                    <ShoppingBag className="size-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                                                {formatCurrencyVND(p.minPrice || 0)}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`flex size-6 items-center justify-center rounded-full border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-muted-foreground/30'}`}
                                    >
                                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border/60">
                    <span className="text-xs text-muted-foreground">
                        Đã chọn <strong className="text-emerald-600">{selectedProductIds.length}</strong> / 5 sản phẩm
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl px-4 text-xs"
                    >
                        Xong
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
