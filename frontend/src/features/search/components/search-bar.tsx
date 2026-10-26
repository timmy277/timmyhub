'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ClockIcon, FlameIcon, Loader2Icon, SearchIcon, SparklesIcon, StoreIcon, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button, Input } from '@/components'
import { QUERY_KEY, ROUTE } from '@/constants'
import { useDebouncedValue } from '@/hooks'
import { cn, formatCurrencyVND } from '@/utils'

import { searchProductsAction, suggestProductsAction } from '../actions'

const RECENT_SEARCHES_KEY = 'timmyhub_recent_searches'
const MAX_RECENT = 5
const TRENDING_KEYWORDS = [
    'Áo thun nam',
    'Tai nghe bluetooth',
    'Đồng hồ thông minh',
    'Giày sneaker',
    'Balo chống nước',
    'Bàn phím cơ',
]

interface SearchBarProps {
    className?: string
    defaultValue?: string
    onSearchSubmit?: (query: string) => void
    size?: 'default' | 'lg'
}

export const SearchBar = memo(function SearchBar({
    className,
    defaultValue = '',
    onSearchSubmit,
    size = 'default',
}: SearchBarProps) {
    // ===== Hooks =====
    const t = useTranslations('search')
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // ===== State =====
    const [query, setQuery] = useState(defaultValue)
    const [isOpen, setIsOpen] = useState(false)
    const [recentSearches, setRecentSearches] = useState<string[]>([])
    const debouncedQuery = useDebouncedValue(query.trim(), 280)

    // ===== Effects =====
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
            if (stored) {
                setRecentSearches(JSON.parse(stored))
            }
        } catch {
            // Ignore localStorage parse errors
        }
    }, [])

    // Global keyboard shortcut '/' to focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === '/' &&
                document.activeElement?.tagName !== 'INPUT' &&
                document.activeElement?.tagName !== 'TEXTAREA'
            ) {
                e.preventDefault()
                inputRef.current?.focus()
                setIsOpen(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Click outside to dismiss
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // ===== Queries =====
    // 1. Autocomplete suggestions
    const { data: suggestionsData, isFetching: isFetchingSuggestions } = useQuery({
        queryKey: QUERY_KEY.SEARCH.SUGGEST(debouncedQuery),
        queryFn: async () => {
            const res = await suggestProductsAction({ q: debouncedQuery })
            return res.ok ? res.data.data : []
        },
        enabled: Boolean(debouncedQuery.length >= 2),
        staleTime: 30_000,
    })

    // 2. Fast product preview hits
    const { data: previewHitsData, isFetching: isFetchingHits } = useQuery({
        queryKey: QUERY_KEY.SEARCH.RESULTS({ q: debouncedQuery, limit: 3 }),
        queryFn: async () => {
            const res = await searchProductsAction({ q: debouncedQuery, limit: 3 })
            return res.ok ? res.data.data : []
        },
        enabled: Boolean(debouncedQuery.length >= 2),
        staleTime: 30_000,
    })

    const suggestions = suggestionsData ?? []
    const previewHits = previewHitsData ?? []
    const isLoading = isFetchingSuggestions || isFetchingHits

    // ===== Handlers =====
    const saveRecentSearch = useCallback((term: string) => {
        const trimmed = term.trim()
        if (!trimmed) return
        setRecentSearches((prev) => {
            const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())
            const next = [trimmed, ...filtered].slice(0, MAX_RECENT)
            try {
                localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
            } catch {
                // Ignore localStorage errors
            }
            return next
        })
    }, [])

    const handleClearRecent = useCallback(() => {
        setRecentSearches([])
        try {
            localStorage.removeItem(RECENT_SEARCHES_KEY)
        } catch {
            // Ignore
        }
    }, [])

    const executeSearch = useCallback(
        (targetQuery: string) => {
            const trimmed = targetQuery.trim()
            if (!trimmed) return
            saveRecentSearch(trimmed)
            setIsOpen(false)
            inputRef.current?.blur()

            if (onSearchSubmit) {
                onSearchSubmit(trimmed)
            } else {
                router.push(`${ROUTE.SEARCH}?q=${encodeURIComponent(trimmed)}`)
            }
        },
        [onSearchSubmit, router, saveRecentSearch],
    )

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            executeSearch(query)
        } else if (e.key === 'Escape') {
            setIsOpen(false)
            inputRef.current?.blur()
        }
    }

    const hasDropdownContent =
        isOpen && (query.trim().length >= 2 || recentSearches.length > 0 || TRENDING_KEYWORDS.length > 0)

    return (
        <div ref={containerRef} className={cn('relative w-full max-w-2xl', className)}>
            {/* Input Search Container */}
            <div
                className={cn(
                    'relative flex items-center rounded-2xl border bg-background/95 transition-all shadow-xs backdrop-blur-md',
                    isOpen
                        ? 'border-primary ring-2 ring-primary/20 shadow-md'
                        : 'border-border/80 hover:border-primary/50',
                    size === 'lg' ? 'h-13 px-4' : 'h-10 px-3',
                )}
            >
                <SearchIcon
                    className={cn(
                        'shrink-0 text-muted-foreground mr-2.5 transition-colors',
                        isOpen && 'text-primary',
                        size === 'lg' ? 'size-5' : 'size-4',
                    )}
                />

                <Input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('placeholder')}
                    className="h-full flex-1 border-0 bg-transparent p-0 text-xs sm:text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:hidden"
                />

                {isLoading && <Loader2Icon className="size-4 animate-spin text-muted-foreground shrink-0 mr-1.5" />}

                {query && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setQuery('')
                            inputRef.current?.focus()
                        }}
                        className="size-6 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 mr-0.5"
                        aria-label="Clear input"
                    >
                        <XIcon className="size-3.5" />
                    </Button>
                )}

                {!query && (
                    <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/80 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        /
                    </kbd>
                )}
            </div>

            {/* Dropdown Suggestions & Results */}
            {hasDropdownContent && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-2xl border border-border/80 bg-popover/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden divide-y divide-border/40">
                    {/* 1. Autocomplete Suggestions & Previews (khi đã gõ >= 2 ký tự) */}
                    {query.trim().length >= 2 ? (
                        <div className="space-y-3 pb-2">
                            {/* Suggestions List */}
                            {suggestions.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[11px] font-semibold text-muted-foreground px-2 flex items-center gap-1">
                                        <SparklesIcon className="size-3 text-primary" />
                                        <span>{t('suggestTitle')}</span>
                                    </p>
                                    <div className="space-y-0.5">
                                        {suggestions.map((item, idx) => (
                                            <Button
                                                key={idx}
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => executeSearch(item)}
                                                className="w-full justify-start h-8 px-2.5 rounded-xl text-xs font-medium hover:bg-primary/10 hover:text-primary gap-2"
                                            >
                                                <SearchIcon className="size-3 text-muted-foreground shrink-0" />
                                                <span className="truncate">{item}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Product Hits Preview */}
                            {previewHits.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                    <p className="text-[11px] font-semibold text-muted-foreground px-2">
                                        Sản phẩm nổi bật
                                    </p>
                                    <div className="space-y-1.5">
                                        {previewHits.map((prod) => (
                                            <Link
                                                key={prod.id}
                                                href={ROUTE.PRODUCT_DETAIL(prod.slug || prod.id)}
                                                onClick={() => setIsOpen(false)}
                                                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-muted/70 transition-colors group"
                                            >
                                                <div className="relative size-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
                                                    {prod.images[0] ? (
                                                        <Image
                                                            src={prod.images[0]}
                                                            alt={prod.name}
                                                            fill
                                                            sizes="40px"
                                                            className="object-cover group-hover:scale-105 transition-transform"
                                                        />
                                                    ) : (
                                                        <div className="size-full flex items-center justify-center text-[10px] text-muted-foreground">
                                                            No img
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                        {prod.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrencyVND(prod.price)}
                                                        </span>
                                                        {prod.shopName && (
                                                            <span className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                                                                <StoreIcon className="size-2.5" />
                                                                {prod.shopName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bottom link to view all results */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => executeSearch(query)}
                                className="w-full text-center h-8 text-xs font-bold text-primary hover:underline hover:bg-primary/10 flex items-center justify-center gap-1.5 bg-primary/5 rounded-xl"
                            >
                                <span>{t('viewAllResults', { query: query.trim() })}</span>
                            </Button>
                        </div>
                    ) : (
                        /* 2. Recent Searches & Trending Topics (khi ô tìm kiếm còn trống) */
                        <div className="space-y-3 py-1">
                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                            <ClockIcon className="size-3" />
                                            {t('recentSearches')}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleClearRecent}
                                            className="h-5 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-destructive hover:underline"
                                        >
                                            {t('clearHistory')}
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 px-1">
                                        {recentSearches.map((term, idx) => (
                                            <Button
                                                key={idx}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => executeSearch(term)}
                                                className="h-7 px-2.5 rounded-lg border-border/70 bg-muted/50 text-xs text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all font-medium"
                                            >
                                                <span>{term}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Trending Keywords */}
                            <div className="space-y-1.5 pt-1">
                                <span className="text-[11px] font-semibold text-muted-foreground px-2 flex items-center gap-1">
                                    <FlameIcon className="size-3 text-amber-500" />
                                    {t('trendingKeywords')}
                                </span>
                                <div className="flex flex-wrap gap-1.5 px-1">
                                    {TRENDING_KEYWORDS.map((item, idx) => (
                                        <Button
                                            key={idx}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => executeSearch(item)}
                                            className="h-7 px-2.5 rounded-lg border-primary/20 bg-primary/5 text-xs text-foreground hover:bg-primary/15 hover:border-primary/40 transition-all font-medium gap-1.5"
                                        >
                                            <span className="size-1 rounded-full bg-primary" />
                                            <span>{item}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
})
