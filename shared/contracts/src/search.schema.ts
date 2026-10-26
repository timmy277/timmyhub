import { z } from 'zod'

// ===== Enums =====

export const SearchSortBy = {
    RELEVANCE: 'relevance',
    NEWEST: 'newest',
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
    BEST_SELLING: 'best_selling',
    RATING: 'rating',
} as const

export type SearchSortByType = (typeof SearchSortBy)[keyof typeof SearchSortBy]

export const SearchSortBySchema = z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'best_selling', 'rating'])

// ===== Schemas =====

export const SearchProductsQuerySchema = z.object({
    q: z.string().trim().optional(),
    category: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sortBy: SearchSortBySchema.optional().default('relevance'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})
export type SearchProductsQuery = z.infer<typeof SearchProductsQuerySchema>
export type SearchProductsQueryInput = z.input<typeof SearchProductsQuerySchema>

export const SuggestQuerySchema = z.object({
    q: z.string().trim().optional().default(''),
})
export type SuggestQuery = z.infer<typeof SuggestQuerySchema>
export type SuggestQueryInput = z.input<typeof SuggestQuerySchema>

// ===== DTO Interfaces =====

export interface SearchProductDoc {
    id: string
    name: string
    description: string
    slug: string
    price: number
    originalPrice: number | null
    discount: number
    stock: number
    images: string[]
    categoryId: string | null
    categoryName: string | null
    brandId: string | null
    brandName: string | null
    sellerId: string
    shopName: string | null
    shopSlug: string | null
    ratingAvg: number
    ratingCount: number
    soldCount: number
    viewCount: number
    isFeatured: boolean
    isNew: boolean
    tags: string[]
    createdAt: string
    _score?: number | undefined
    highlight?:
        | {
              name?: string[] | undefined
              description?: string[] | undefined
          }
        | undefined
}

export interface SearchResponseDto {
    data: SearchProductDoc[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
        took: number
        source: 'elasticsearch' | 'database'
    }
    aggregations: {
        categories: { key: string; doc_count: number }[]
        priceRange?:
            | {
                  min: number | null
                  max: number | null
                  avg: number | null
              }
            | undefined
    }
}

export interface SuggestResponseDto {
    data: string[]
}

export interface SearchStatusResponseDto {
    available: boolean
    clusterStatus?: string
    index: string
    documentCount?: number
}
