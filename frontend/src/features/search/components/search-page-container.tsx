'use client'

import { memo, useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { SearchProductsQuery, SearchResponseDto, SearchSortByType } from '@timmyhub/contracts'

import { QUERY_KEY, ROUTE } from '@/constants'

import { searchProductsAction } from '../actions'
import { SearchBar } from './search-bar'
import { SearchFilterSidebar, type SearchFilterState } from './search-filter-sidebar'
import { SearchResultsView } from './search-results-view'

interface SearchPageContainerProps {
    initialData?: SearchResponseDto | null
    initialQuery?: SearchProductsQuery
}

export const SearchPageContainer = memo(function SearchPageContainer({
    initialData,
    initialQuery,
}: SearchPageContainerProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // 1. URL search params parsing
    const urlQ = searchParams.get('q') ?? initialQuery?.q ?? ''
    const urlCategory = searchParams.get('category') ?? initialQuery?.category ?? undefined
    const urlMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : initialQuery?.minPrice
    const urlMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : initialQuery?.maxPrice
    const urlMinRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : initialQuery?.minRating
    const urlSort = (searchParams.get('sortBy') as SearchSortByType) ?? initialQuery?.sortBy ?? 'relevance'
    const urlPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1

    // 2. Query state
    const [filterState, setFilterState] = useState<SearchFilterState>({
        category: urlCategory,
        minPrice: urlMinPrice,
        maxPrice: urlMaxPrice,
        minRating: urlMinRating,
    })
    const [currentSort, setCurrentSort] = useState<SearchSortByType>(urlSort)
    const [currentPage, setCurrentPage] = useState<number>(urlPage)

    // Build current active query
    const activeQuery: SearchProductsQuery = {
        q: urlQ || undefined,
        category: filterState.category,
        minPrice: filterState.minPrice,
        maxPrice: filterState.maxPrice,
        minRating: filterState.minRating,
        sortBy: currentSort,
        page: currentPage,
        limit: 20,
    }

    // 3. TanStack Query
    const emptyFallback: SearchResponseDto = {
        data: [],
        meta: {
            total: 0,
            page: activeQuery.page ?? 1,
            limit: activeQuery.limit ?? 20,
            totalPages: 0,
            took: 0,
            source: 'database',
        },
        aggregations: { categories: [] },
    }

    const { data: searchResult, isLoading } = useQuery({
        queryKey: QUERY_KEY.SEARCH.RESULTS(activeQuery as Record<string, unknown>),
        queryFn: async (): Promise<SearchResponseDto> => {
            const res = await searchProductsAction(activeQuery)
            if (!res.ok) {
                return initialData ?? emptyFallback
            }
            return res.data
        },
        initialData: initialData ?? undefined,
        staleTime: 30_000,
    })

    // 4. URL Synchronizer
    const pushStateToUrl = useCallback(
        (newQ: string, filters: SearchFilterState, sort: SearchSortByType, page: number) => {
            const params = new URLSearchParams()
            if (newQ.trim()) params.set('q', newQ.trim())
            if (filters.category) params.set('category', filters.category)
            if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice))
            if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice))
            if (filters.minRating !== undefined && filters.minRating > 0)
                params.set('minRating', String(filters.minRating))
            if (sort !== 'relevance') params.set('sortBy', sort)
            if (page > 1) params.set('page', String(page))

            router.push(`${ROUTE.SEARCH}?${params.toString()}`, { scroll: false })
        },
        [router],
    )

    // 5. Handlers
    const handleSearchSubmit = useCallback(
        (submittedQ: string) => {
            setCurrentPage(1)
            pushStateToUrl(submittedQ, filterState, currentSort, 1)
        },
        [currentSort, filterState, pushStateToUrl],
    )

    const handleFilterChange = useCallback(
        (updated: Partial<SearchFilterState>) => {
            const nextFilters = { ...filterState, ...updated }
            setFilterState(nextFilters)
            setCurrentPage(1)
            pushStateToUrl(urlQ, nextFilters, currentSort, 1)
        },
        [currentSort, filterState, pushStateToUrl, urlQ],
    )

    const handleResetFilters = useCallback(() => {
        const cleared: SearchFilterState = {}
        setFilterState(cleared)
        setCurrentPage(1)
        pushStateToUrl(urlQ, cleared, currentSort, 1)
    }, [currentSort, pushStateToUrl, urlQ])

    const handleSortChange = useCallback(
        (sort: SearchSortByType) => {
            setCurrentSort(sort)
            setCurrentPage(1)
            pushStateToUrl(urlQ, filterState, sort, 1)
        },
        [filterState, pushStateToUrl, urlQ],
    )

    const handlePageChange = useCallback(
        (page: number) => {
            setCurrentPage(page)
            pushStateToUrl(urlQ, filterState, currentSort, page)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        },
        [currentSort, filterState, pushStateToUrl, urlQ],
    )

    const categories = searchResult?.aggregations?.categories ?? []

    return (
        <div className="space-y-6">
            {/* Top Search Bar */}
            <div className="mx-auto max-w-2xl py-2">
                <SearchBar defaultValue={urlQ} onSearchSubmit={handleSearchSubmit} size="lg" />
            </div>

            {/* Layout: Filter Sidebar + Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <SearchFilterSidebar
                        categories={categories}
                        currentFilters={filterState}
                        onFilterChange={handleFilterChange}
                        onResetFilters={handleResetFilters}
                    />
                </div>

                {/* Main Results */}
                <div className="lg:col-span-3">
                    <SearchResultsView
                        queryText={urlQ}
                        data={searchResult}
                        isLoading={isLoading}
                        currentSort={currentSort}
                        onSortChange={handleSortChange}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>
        </div>
    )
})
