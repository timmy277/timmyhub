'use client'

import { memo, useState } from 'react'
import { FilterIcon, RotateCcwIcon, StarIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components'
import { cn } from '@/utils'

export interface SearchFilterState {
    category?: string
    minPrice?: number
    maxPrice?: number
    minRating?: number
}

interface SearchFilterSidebarProps {
    className?: string
    categories?: { key: string; doc_count: number }[]
    currentFilters: SearchFilterState
    onFilterChange: (filters: Partial<SearchFilterState>) => void
    onResetFilters: () => void
}

const RATING_TIERS = [
    { value: 5, label: '5 sao' },
    { value: 4, label: 'Từ 4 sao' },
    { value: 3, label: 'Từ 3 sao' },
]

export const SearchFilterSidebar = memo(function SearchFilterSidebar({
    className,
    categories = [],
    currentFilters,
    onFilterChange,
    onResetFilters,
}: SearchFilterSidebarProps) {
    // ===== Hooks =====
    const t = useTranslations('search')

    // ===== State =====
    const [priceFrom, setPriceFrom] = useState(currentFilters.minPrice ? String(currentFilters.minPrice) : '')
    const [priceTo, setPriceTo] = useState(currentFilters.maxPrice ? String(currentFilters.maxPrice) : '')

    // ===== Handlers =====
    const handleApplyPrice = () => {
        const min = priceFrom ? Number(priceFrom) : undefined
        const max = priceTo ? Number(priceTo) : undefined
        onFilterChange({ minPrice: min, maxPrice: max })
    }

    const handleQuickPrice = (min?: number, max?: number) => {
        setPriceFrom(min !== undefined ? String(min) : '')
        setPriceTo(max !== undefined ? String(max) : '')
        onFilterChange({ minPrice: min, maxPrice: max })
    }

    const hasActiveFilters = Boolean(
        currentFilters.category ||
        currentFilters.minPrice !== undefined ||
        currentFilters.maxPrice !== undefined ||
        (currentFilters.minRating !== undefined && currentFilters.minRating > 0),
    )

    return (
        <Card className={cn('rounded-3xl border border-border/70 bg-card/85 backdrop-blur-md shadow-xs', className)}>
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FilterIcon className="size-4 text-primary" />
                    <span>{t('filterTitle')}</span>
                </CardTitle>

                {hasActiveFilters && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setPriceFrom('')
                            setPriceTo('')
                            onResetFilters()
                        }}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 font-semibold"
                    >
                        <RotateCcwIcon className="size-3" />
                        <span>{t('resetFilter')}</span>
                    </Button>
                )}
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-6">
                {/* 1. Category Filter */}
                {categories.length > 0 && (
                    <div className="space-y-2.5">
                        <p className="text-xs font-bold text-foreground tracking-tight">{t('category')}</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onFilterChange({ category: undefined })}
                                className={cn(
                                    'w-full justify-between h-8 px-2.5 rounded-xl text-xs font-medium',
                                    !currentFilters.category
                                        ? 'bg-primary/10 text-primary font-bold hover:bg-primary/15'
                                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                                )}
                            >
                                <span>{t('allCategories')}</span>
                            </Button>
                            {categories.map((cat) => (
                                <Button
                                    key={cat.key}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onFilterChange({ category: cat.key })}
                                    className={cn(
                                        'w-full justify-between h-8 px-2.5 rounded-xl text-xs font-medium',
                                        currentFilters.category === cat.key
                                            ? 'bg-primary/10 text-primary font-bold hover:bg-primary/15'
                                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                                    )}
                                >
                                    <span className="truncate">{cat.key}</span>
                                    <span className="text-[10px] opacity-70">({cat.doc_count})</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Price Range Filter */}
                <div className="space-y-3">
                    <p className="text-xs font-bold text-foreground tracking-tight">{t('priceRange')}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            type="number"
                            min="0"
                            placeholder={t('fromPrice')}
                            value={priceFrom}
                            onChange={(e) => setPriceFrom(e.target.value)}
                            className="h-8 text-xs rounded-xl"
                        />
                        <Input
                            type="number"
                            min="0"
                            placeholder={t('toPrice')}
                            value={priceTo}
                            onChange={(e) => setPriceTo(e.target.value)}
                            className="h-8 text-xs rounded-xl"
                        />
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleApplyPrice}
                        className="w-full h-8 text-xs font-bold rounded-xl"
                    >
                        {t('applyPrice')}
                    </Button>

                    {/* Quick Tiers */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPrice(undefined, 100000)}
                            className="h-7 rounded-lg border-border/70 p-1 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
                        >
                            Dưới 100k
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPrice(100000, 500000)}
                            className="h-7 rounded-lg border-border/70 p-1 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
                        >
                            100k - 500k
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPrice(500000, 2000000)}
                            className="h-7 rounded-lg border-border/70 p-1 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
                        >
                            500k - 2Tr
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPrice(2000000, undefined)}
                            className="h-7 rounded-lg border-border/70 p-1 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
                        >
                            Trên 2Tr
                        </Button>
                    </div>
                </div>

                {/* 3. Rating Filter */}
                <div className="space-y-2.5">
                    <p className="text-xs font-bold text-foreground tracking-tight">{t('rating')}</p>
                    <div className="space-y-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onFilterChange({ minRating: undefined })}
                            className={cn(
                                'w-full justify-start h-8 px-2.5 rounded-xl text-xs font-medium',
                                !currentFilters.minRating
                                    ? 'bg-primary/10 text-primary font-bold hover:bg-primary/15'
                                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                            )}
                        >
                            {t('allRatings')}
                        </Button>
                        {RATING_TIERS.map((tier) => (
                            <Button
                                key={tier.value}
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onFilterChange({ minRating: tier.value })}
                                className={cn(
                                    'w-full justify-start gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium',
                                    currentFilters.minRating === tier.value
                                        ? 'bg-primary/10 text-primary font-bold hover:bg-primary/15'
                                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                                )}
                            >
                                <div className="flex items-center text-amber-500">
                                    {Array.from({ length: tier.value }).map((_, i) => (
                                        <StarIcon key={i} className="size-3 fill-current" />
                                    ))}
                                </div>
                                <span>{t('fromRating', { rating: tier.value })}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
})
