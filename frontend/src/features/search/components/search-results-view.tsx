'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ArrowUpDownIcon, ChevronLeftIcon, ChevronRightIcon, CpuIcon, DatabaseIcon, PackageXIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { SearchResponseDto, SearchSortByType } from '@timmyhub/contracts'

import { Badge, Button, Card, Skeleton } from '@/components'
import { ROUTE } from '@/constants'
import { ProductCard } from '@/features/products'
import { cn } from '@/utils'

interface SearchResultsViewProps {
    queryText?: string
    data?: SearchResponseDto
    isLoading?: boolean
    currentSort: SearchSortByType
    onSortChange: (sort: SearchSortByType) => void
    currentPage: number
    onPageChange: (page: number) => void
}

const SORT_TABS: { key: SearchSortByType; labelKey: string }[] = [
    { key: 'relevance', labelKey: 'relevance' },
    { key: 'best_selling', labelKey: 'bestSelling' },
    { key: 'newest', labelKey: 'newest' },
    { key: 'price_asc', labelKey: 'priceAsc' },
    { key: 'price_desc', labelKey: 'priceDesc' },
    { key: 'rating', labelKey: 'ratingHigh' },
]

export const SearchResultsView = memo(function SearchResultsView({
    queryText,
    data,
    isLoading = false,
    currentSort,
    onSortChange,
    currentPage,
    onPageChange,
}: SearchResultsViewProps) {
    // ===== Hooks =====
    const t = useTranslations('search')

    // ===== Loading Skeleton Grid =====
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-8 w-64 rounded-xl" />
                    <Skeleton className="h-8 w-48 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="rounded-3xl border border-border/60 overflow-hidden">
                            <Skeleton className="aspect-square w-full" />
                            <div className="p-3.5 space-y-2">
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-3/4 rounded" />
                                <div className="flex items-center justify-between pt-1">
                                    <Skeleton className="h-5 w-20 rounded" />
                                    <Skeleton className="h-3 w-12 rounded" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    const items = data?.data ?? []
    const meta = data?.meta
    const total = meta?.total ?? 0
    const totalPages = meta?.totalPages ?? 1
    const isElasticsearch = meta?.source === 'elasticsearch'

    // ===== Empty State =====
    if (items.length === 0) {
        return (
            <div className="py-16 text-center space-y-4 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-8">
                <div className="size-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <PackageXIcon className="size-8" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">{t('noResults')}</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">{t('noResultsHint')}</p>
                </div>
                <div className="pt-2">
                    <Button asChild size="sm" className="rounded-xl font-bold">
                        <Link href={ROUTE.HOME}>{t('backHome')}</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header: Query info, metadata & Engine Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2.5 flex-wrap">
                    {queryText ? (
                        <h2 className="text-base sm:text-lg font-bold text-foreground">
                            {t('searchResultsFor')}{' '}
                            <span className="text-primary font-extrabold">&ldquo;{queryText}&rdquo;</span>
                        </h2>
                    ) : (
                        <h2 className="text-base sm:text-lg font-bold text-foreground">{t('pageTitle')}</h2>
                    )}
                    <Badge variant="secondary" className="text-xs font-semibold rounded-lg">
                        {t('totalFound', { count: total })}
                    </Badge>
                </div>

                {/* Engine Source Badge */}
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn(
                            'text-[10px] font-semibold gap-1 py-0.5 px-2 rounded-lg border',
                            isElasticsearch
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                        )}
                    >
                        {isElasticsearch ? <CpuIcon className="size-3" /> : <DatabaseIcon className="size-3" />}
                        <span>{isElasticsearch ? t('sourceElasticsearch') : t('sourceDatabase')}</span>
                        {meta?.took !== undefined && (
                            <span className="opacity-80">({t('tookMs', { ms: meta.took })})</span>
                        )}
                    </Badge>
                </div>
            </div>

            {/* Sorting Toolbar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2 shrink-0 font-medium">
                    <ArrowUpDownIcon className="size-3" />
                    <span>{t('sortBy')}:</span>
                </div>
                {SORT_TABS.map((tab) => (
                    <Button
                        key={tab.key}
                        type="button"
                        size="sm"
                        variant={currentSort === tab.key ? 'default' : 'secondary'}
                        onClick={() => onSortChange(tab.key)}
                        className="shrink-0 rounded-xl text-xs font-semibold h-8 px-3"
                    >
                        {t(tab.labelKey as Parameters<typeof t>[0])}
                    </Button>
                ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => onPageChange(currentPage - 1)}
                        className="rounded-xl h-8 px-3 text-xs font-semibold gap-1"
                    >
                        <ChevronLeftIcon className="size-3.5" />
                        <span>Trang trước</span>
                    </Button>

                    <span className="text-xs font-semibold text-muted-foreground px-2">
                        {t('page')} {currentPage} / {totalPages}
                    </span>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                        className="rounded-xl h-8 px-3 text-xs font-semibold gap-1"
                    >
                        <span>Trang sau</span>
                        <ChevronRightIcon className="size-3.5" />
                    </Button>
                </div>
            )}
        </div>
    )
})
