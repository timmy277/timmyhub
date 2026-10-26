'use server'

import type {
    ApiErrorCode,
    SearchProductsQueryInput,
    SearchResponseDto,
    SearchStatusResponseDto,
    SuggestQueryInput,
    SuggestResponseDto,
} from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import { fetchBackend } from '@/lib/api-server'

export type SearchActionFailureCode =
    ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_FAILED'

export type SearchActionResult<T = undefined> =
    { ok: true; data: T } | { ok: false; code: SearchActionFailureCode; message?: string }

export async function searchProductsAction(
    query?: SearchProductsQueryInput,
): Promise<SearchActionResult<SearchResponseDto>> {
    const result = await fetchBackend<SearchResponseDto>(API_ROUTE.SEARCH.ROOT, {
        query: {
            q: query?.q,
            category: query?.category,
            brand: query?.brand,
            minPrice: query?.minPrice !== undefined ? Number(query.minPrice) : undefined,
            maxPrice: query?.maxPrice !== undefined ? Number(query.maxPrice) : undefined,
            minRating: query?.minRating !== undefined ? Number(query.minRating) : undefined,
            sortBy: query?.sortBy,
            page: query?.page !== undefined ? Number(query.page) : undefined,
            limit: query?.limit !== undefined ? Number(query.limit) : undefined,
        },
    })
    if (!result.ok) {
        return { ok: false, code: result.code }
    }
    return { ok: true, data: result.data }
}

export async function suggestProductsAction(
    query?: SuggestQueryInput,
): Promise<SearchActionResult<SuggestResponseDto>> {
    const result = await fetchBackend<SuggestResponseDto>(API_ROUTE.SEARCH.SUGGEST, {
        query: {
            q: query?.q,
        },
    })
    if (!result.ok) {
        return { ok: false, code: result.code }
    }
    return { ok: true, data: result.data }
}

export async function getSearchStatusAction(): Promise<SearchActionResult<SearchStatusResponseDto>> {
    const result = await fetchBackend<SearchStatusResponseDto>(API_ROUTE.SEARCH.STATUS)
    if (!result.ok) {
        return { ok: false, code: result.code }
    }
    return { ok: true, data: result.data }
}

export async function reindexProductsAction(): Promise<SearchActionResult<{ indexed: number; total: number }>> {
    const result = await fetchBackend<{ indexed: number; total: number }>(API_ROUTE.SEARCH.REINDEX, {
        method: 'POST',
    })
    if (!result.ok) {
        return { ok: false, code: result.code }
    }
    return { ok: true, data: result.data }
}
