import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OnEvent } from '@nestjs/event-emitter'
import { Client, type estypes } from '@elastic/elasticsearch'

import type {
    SearchProductDoc,
    SearchProductsQuery,
    SearchProductsQueryInput,
    SearchResponseDto,
    SearchStatusResponseDto,
    SuggestQueryInput,
    SuggestResponseDto,
} from '@timmyhub/contracts'
import { PrismaService } from '@timmyhub/prisma'

import { SEARCH_CONFIG } from './search.constants'

@Injectable()
export class SearchService implements OnModuleInit {
    // ===== Dependencies =====
    private readonly logger = new Logger(SearchService.name)
    private client: Client
    private isAvailable = false

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const node = this.config.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200')
        this.client = new Client({
            node,
            maxRetries: 2,
            requestTimeout: 5000,
        })
    }

    // ===== Lifecycle =====
    async onModuleInit() {
        await this.checkConnectionAndInit()
    }

    private async checkConnectionAndInit(): Promise<void> {
        try {
            await this.client.ping()
            this.isAvailable = true
            this.logger.log('Elasticsearch connected successfully')
            await this.ensureIndex()
            await this.autoSyncIfEmpty()
        } catch {
            this.isAvailable = false
            this.logger.warn('Elasticsearch is not available — Search will automatically fallback to Database')
        }
    }

    private async autoSyncIfEmpty(): Promise<void> {
        try {
            const countRes = await this.client.count({ index: SEARCH_CONFIG.INDEX })
            if (countRes.count === 0) {
                this.logger.log(
                    `Elasticsearch index [${SEARCH_CONFIG.INDEX}] is empty — auto-reindexing from database...`,
                )
                const result = await this.reindexAll()
                this.logger.log(`Auto-indexed ${result.indexed} products into Elasticsearch`)
            } else {
                this.logger.log(`Elasticsearch index [${SEARCH_CONFIG.INDEX}] contains ${countRes.count} documents`)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            this.logger.warn(`Could not auto-sync Elasticsearch index: ${message}`)
        }
    }

    // ===== Index Management =====
    private async ensureIndex(): Promise<void> {
        try {
            const exists = await this.client.indices.exists({ index: SEARCH_CONFIG.INDEX })
            if (exists) {
                // If index is empty, drop it to apply updated analysis & settings
                const countRes = await this.client.count({ index: SEARCH_CONFIG.INDEX }).catch(() => ({ count: 0 }))
                if (countRes.count === 0) {
                    await this.client.indices.delete({ index: SEARCH_CONFIG.INDEX }).catch(() => null)
                }
            }

            const stillExists = await this.client.indices.exists({ index: SEARCH_CONFIG.INDEX })
            if (!stillExists) {
                await this.client.indices.create({
                    index: SEARCH_CONFIG.INDEX,
                    mappings: {
                        properties: {
                            id: { type: 'keyword' },
                            name: {
                                type: 'text',
                                analyzer: 'vietnamese_analyzer',
                                search_analyzer: 'vietnamese_analyzer',
                                fields: {
                                    keyword: { type: 'keyword' },
                                    suggest: { type: 'search_as_you_type' },
                                },
                            },
                            description: {
                                type: 'text',
                                analyzer: 'vietnamese_analyzer',
                                search_analyzer: 'vietnamese_analyzer',
                            },
                            slug: { type: 'keyword' },
                            price: { type: 'double' },
                            originalPrice: { type: 'double' },
                            discount: { type: 'integer' },
                            stock: { type: 'integer' },
                            images: { type: 'keyword', index: false },
                            categoryId: { type: 'keyword' },
                            categoryName: {
                                type: 'text',
                                analyzer: 'vietnamese_analyzer',
                                fields: { keyword: { type: 'keyword' } },
                            },
                            brandId: { type: 'keyword' },
                            brandName: {
                                type: 'text',
                                analyzer: 'vietnamese_analyzer',
                                fields: { keyword: { type: 'keyword' } },
                            },
                            sellerId: { type: 'keyword' },
                            shopName: {
                                type: 'text',
                                analyzer: 'vietnamese_analyzer',
                                fields: { keyword: { type: 'keyword' } },
                            },
                            shopSlug: { type: 'keyword' },
                            ratingAvg: { type: 'float' },
                            ratingCount: { type: 'integer' },
                            soldCount: { type: 'integer' },
                            viewCount: { type: 'integer' },
                            isFeatured: { type: 'boolean' },
                            isNew: { type: 'boolean' },
                            tags: { type: 'keyword' },
                            createdAt: { type: 'date' },
                        },
                    },
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: 0,
                        analysis: {
                            analyzer: {
                                vietnamese_analyzer: {
                                    type: 'custom',
                                    tokenizer: 'standard',
                                    filter: ['lowercase', 'asciifolding'],
                                },
                            },
                        },
                    },
                })
                this.logger.log(`Created Elasticsearch index: ${SEARCH_CONFIG.INDEX} with vietnamese_analyzer`)
            }
        } catch (error) {
            this.logger.error('Failed to create or verify Elasticsearch index', error)
        }
    }

    // ===== Queries =====

    async search(dto: SearchProductsQueryInput = {}): Promise<SearchResponseDto> {
        const page = Math.max(1, dto.page ? Number(dto.page) : 1)
        const limit = Math.min(
            SEARCH_CONFIG.MAX_PAGE_SIZE,
            Math.max(1, dto.limit ? Number(dto.limit) : SEARCH_CONFIG.DEFAULT_PAGE_SIZE),
        )
        const sortBy = dto.sortBy ?? 'relevance'
        const dtoNorm: SearchProductsQuery = {
            ...dto,
            minPrice: dto.minPrice !== undefined ? Number(dto.minPrice) : undefined,
            maxPrice: dto.maxPrice !== undefined ? Number(dto.maxPrice) : undefined,
            minRating: dto.minRating !== undefined ? Number(dto.minRating) : undefined,
            sortBy,
            page,
            limit,
        }

        if (!this.isAvailable) {
            return this.fallbackSearch(dtoNorm)
        }

        try {
            // Check if index is currently empty; if so, trigger reindex and fallback to DB for instant results
            const countRes = await this.client.count({ index: SEARCH_CONFIG.INDEX }).catch(() => ({ count: 0 }))
            if (countRes.count === 0) {
                void this.reindexAll().catch(() => null)
                return this.fallbackSearch(dtoNorm)
            }

            const { q, category, minPrice, maxPrice, minRating, sortBy } = dtoNorm
            const from = (page - 1) * limit

            // 1. Build Query
            const must: object[] = []
            const filter: object[] = []

            if (q?.trim()) {
                const trimmedQ = q.trim()
                must.push({
                    bool: {
                        should: [
                            // 1. Exact phrase match (Highest boost: 10x)
                            {
                                multi_match: {
                                    query: trimmedQ,
                                    fields: ['name^10', 'categoryName^5', 'description^2'],
                                    type: 'phrase',
                                    boost: 10,
                                },
                            },
                            // 2. All terms must match across fields (operator: 'and')
                            {
                                multi_match: {
                                    query: trimmedQ,
                                    fields: ['name^5', 'categoryName^3', 'shopName^2', 'tags^2', 'description'],
                                    type: 'best_fields',
                                    operator: 'and',
                                    boost: 5,
                                },
                            },
                            // 3. Cross fields match (operator: 'and')
                            {
                                multi_match: {
                                    query: trimmedQ,
                                    fields: ['name', 'categoryName', 'shopName', 'tags'],
                                    type: 'cross_fields',
                                    operator: 'and',
                                    boost: 3,
                                },
                            },
                            // 4. For multi-word queries (3+ terms), require at least 70% of words to match
                            {
                                multi_match: {
                                    query: trimmedQ,
                                    fields: ['name^3', 'categoryName^2', 'description'],
                                    type: 'best_fields',
                                    minimum_should_match: '70%',
                                    boost: 1,
                                },
                            },
                        ],
                        minimum_should_match: 1,
                    },
                })
            } else {
                must.push({ match_all: {} })
            }

            // 2. Filters
            filter.push({ range: { stock: { gt: 0 } } })
            if (category) {
                filter.push({ term: { categoryId: category } })
            }
            if (minPrice !== undefined || maxPrice !== undefined) {
                filter.push({
                    range: {
                        price: {
                            ...(minPrice !== undefined ? { gte: minPrice } : {}),
                            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                        },
                    },
                })
            }
            if (minRating !== undefined && minRating > 0) {
                filter.push({ range: { ratingAvg: { gte: minRating } } })
            }

            // 3. Sorting
            let sort: estypes.SortCombinations[] = []
            switch (sortBy) {
                case 'newest':
                    sort = [{ createdAt: 'desc' }]
                    break
                case 'price_asc':
                    sort = [{ price: 'asc' }]
                    break
                case 'price_desc':
                    sort = [{ price: 'desc' }]
                    break
                case 'best_selling':
                    sort = [{ soldCount: 'desc' }]
                    break
                case 'rating':
                    sort = [{ ratingAvg: 'desc' }]
                    break
                case 'relevance':
                default:
                    sort = q?.trim() ? [{ _score: { order: 'desc' } }] : [{ soldCount: 'desc' }]
                    break
            }

            // 4. Execute Search
            const searchRequest: Parameters<typeof this.client.search>[0] = {
                index: SEARCH_CONFIG.INDEX,
                from,
                size: limit,
                query: { bool: { must, filter } },
                sort,
                aggs: {
                    categories: { terms: { field: 'categoryName.keyword', size: 20 } },
                    priceRange: { stats: { field: 'price' } },
                },
            }

            if (q?.trim()) {
                searchRequest.highlight = {
                    fields: {
                        name: {},
                        description: { fragment_size: 150, number_of_fragments: 1 },
                    },
                    pre_tags: ['<mark class="bg-amber-200 text-amber-900 rounded px-0.5">'],
                    post_tags: ['</mark>'],
                }
            }

            const result = await this.client.search(searchRequest)

            const hits = result.hits.hits
            const total = typeof result.hits.total === 'number' ? result.hits.total : (result.hits.total?.value ?? 0)

            const categoriesAgg = result.aggregations?.categories as
                { buckets: { key: string; doc_count: number }[] } | undefined

            const priceRangeAgg = result.aggregations?.priceRange as
                { min: number | null; max: number | null; avg: number | null } | undefined

            return {
                data: hits.map((h) => {
                    const src = h._source as SearchProductDoc
                    return {
                        ...src,
                        _score: h._score ?? undefined,
                        highlight: h.highlight,
                    }
                }),
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit) || 1,
                    took: result.took,
                    source: 'elasticsearch',
                },
                aggregations: {
                    categories: categoriesAgg?.buckets ?? [],
                    priceRange: priceRangeAgg
                        ? {
                              min: priceRangeAgg.min,
                              max: priceRangeAgg.max,
                              avg: priceRangeAgg.avg,
                          }
                        : undefined,
                },
            }
        } catch (error) {
            this.logger.warn('Elasticsearch search error, falling back to database', error)
            return this.fallbackSearch(dtoNorm)
        }
    }

    async suggest(dtoOrQuery: SuggestQueryInput | string = ''): Promise<SuggestResponseDto> {
        const q = typeof dtoOrQuery === 'string' ? dtoOrQuery : (dtoOrQuery?.q ?? '')
        if (!q?.trim()) {
            return { data: [] }
        }

        if (this.isAvailable) {
            try {
                const result = await this.client.search({
                    index: SEARCH_CONFIG.INDEX,
                    size: SEARCH_CONFIG.SUGGEST_LIMIT,
                    query: {
                        multi_match: {
                            query: q.trim(),
                            fields: ['name.suggest', 'name^2'],
                            type: 'bool_prefix',
                        },
                    },
                    _source: ['name'],
                })

                const suggestions = result.hits.hits
                    .map((h) => (h._source as { name?: string })?.name)
                    .filter((name): name is string => Boolean(name))

                if (suggestions.length > 0) {
                    return { data: suggestions }
                }
            } catch (error) {
                this.logger.warn('Elasticsearch suggest error, falling back to database', error)
            }
        }

        // Database Fallback
        const products = await this.prisma.product.findMany({
            where: {
                status: 'APPROVED',
                isSuspended: false,
                name: { contains: q.trim(), mode: 'insensitive' },
            },
            select: { name: true },
            take: SEARCH_CONFIG.SUGGEST_LIMIT,
            orderBy: { soldCount: 'desc' },
        })

        return { data: products.map((p) => p.name) }
    }

    async getStatus(): Promise<SearchStatusResponseDto> {
        if (!this.isAvailable) {
            return {
                available: false,
                index: SEARCH_CONFIG.INDEX,
            }
        }

        try {
            const [health, countRes] = await Promise.all([
                this.client.cluster.health(),
                this.client.count({ index: SEARCH_CONFIG.INDEX }),
            ])

            return {
                available: true,
                clusterStatus: health.status,
                index: SEARCH_CONFIG.INDEX,
                documentCount: countRes.count,
            }
        } catch {
            return {
                available: false,
                index: SEARCH_CONFIG.INDEX,
            }
        }
    }

    // ===== Commands =====

    async indexProduct(productId: string): Promise<boolean> {
        if (!this.isAvailable) return false

        try {
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
                include: {
                    category: true,
                    variants: true,
                },
            })

            if (!product || product.status !== 'APPROVED' || product.isSuspended) {
                // Xoá khỏi chỉ mục nếu không còn được hiển thị
                await this.removeProduct(productId)
                return true
            }

            const shop = await this.prisma.sellerProfile.findUnique({
                where: { id: product.shopId },
                select: { shopName: true, shopSlug: true },
            })

            const doc = this.mapProductToDoc(product, shop)
            await this.client.index({
                index: SEARCH_CONFIG.INDEX,
                id: product.id,
                document: doc,
            })

            this.logger.log(`Indexed product [${product.id}]: ${product.name}`)
            return true
        } catch (error) {
            this.logger.error(`Failed to index product [${productId}]`, error)
            return false
        }
    }

    async removeProduct(productId: string): Promise<boolean> {
        if (!this.isAvailable) return false

        try {
            await this.client.delete({
                index: SEARCH_CONFIG.INDEX,
                id: productId,
            })
            this.logger.log(`Removed product [${productId}] from Elasticsearch`)
            return true
        } catch {
            // Document might not exist in index, ignore 404
            return false
        }
    }

    async reindexAll(): Promise<{ indexed: number; total: number }> {
        if (!this.isAvailable) {
            throw new Error('Elasticsearch is currently unavailable')
        }

        await this.ensureIndex()

        const products = await this.prisma.product.findMany({
            where: {
                status: 'APPROVED',
                isSuspended: false,
            },
            include: {
                category: true,
                variants: true,
            },
        })

        if (products.length === 0) {
            return { indexed: 0, total: 0 }
        }

        const shopIds = Array.from(new Set(products.map((p) => p.shopId)))
        const shops = await this.prisma.sellerProfile.findMany({
            where: { id: { in: shopIds } },
            select: { id: true, shopName: true, shopSlug: true },
        })
        const shopMap = new Map(shops.map((s) => [s.id, s]))

        const operations: object[] = []
        for (const product of products) {
            const shop = shopMap.get(product.shopId) ?? null
            const doc = this.mapProductToDoc(product, shop)

            operations.push({ index: { _index: SEARCH_CONFIG.INDEX, _id: product.id } })
            operations.push(doc)
        }

        const bulkResponse = await this.client.bulk({ operations, refresh: true })
        if (bulkResponse.errors) {
            this.logger.warn('Some documents had errors during bulk reindex')
        }

        this.logger.log(`Successfully reindexed ${products.length} products to Elasticsearch`)
        return { indexed: products.length, total: products.length }
    }

    // ===== Event Handlers =====

    @OnEvent('catalog.product.created')
    @OnEvent('catalog.product.approved')
    @OnEvent('catalog.product.updated')
    @OnEvent('catalog.product.restored')
    handleProductUpsert(payload: { productId: string }) {
        if (payload?.productId) {
            void this.indexProduct(payload.productId)
        }
    }

    @OnEvent('catalog.product.deleted')
    @OnEvent('catalog.product.suspended')
    @OnEvent('catalog.product.rejected')
    handleProductRemoval(payload: { productId: string }) {
        if (payload?.productId) {
            void this.removeProduct(payload.productId)
        }
    }

    // ===== Private Helpers =====

    private mapProductToDoc(
        product: {
            id: string
            name: string
            description: string
            slug: string
            minPrice: unknown
            maxPrice: unknown
            totalStock: number
            images: string[]
            categoryId: string
            shopId: string
            ratingAvg: number
            ratingCount: number
            soldCount: number
            viewCount: number
            isFeatured: boolean
            createdAt: Date
            category?: { name: string } | null
            variants?: { price: unknown; compareAtPrice?: unknown }[]
        },
        shop: { shopName: string; shopSlug: string } | null,
    ): SearchProductDoc {
        const rawPrice = product.minPrice ?? product.variants?.[0]?.price ?? 0
        const price = Number(rawPrice)
        const compareAt = product.variants?.[0]?.compareAtPrice
        const originalPrice = compareAt ? Number(compareAt) : null
        const discount =
            originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

        return {
            id: product.id,
            name: product.name,
            description: product.description,
            slug: product.slug,
            price,
            originalPrice,
            discount,
            stock: product.totalStock,
            images: product.images,
            categoryId: product.categoryId,
            categoryName: product.category?.name ?? null,
            brandId: null,
            brandName: null,
            sellerId: product.shopId,
            shopName: shop?.shopName ?? null,
            shopSlug: shop?.shopSlug ?? null,
            ratingAvg: product.ratingAvg,
            ratingCount: product.ratingCount,
            soldCount: product.soldCount,
            viewCount: product.viewCount,
            isFeatured: product.isFeatured,
            isNew: Date.now() - new Date(product.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000,
            tags: [],
            createdAt: product.createdAt.toISOString(),
        }
    }

    private async fallbackSearch(dto: SearchProductsQuery): Promise<SearchResponseDto> {
        const { q, category, minPrice, maxPrice, minRating, sortBy, page = 1, limit = 20 } = dto
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = {
            status: 'APPROVED',
            isSuspended: false,
            totalStock: { gt: 0 },
        }

        if (q?.trim()) {
            where.OR = [
                { name: { contains: q.trim(), mode: 'insensitive' } },
                { description: { contains: q.trim(), mode: 'insensitive' } },
            ]
        }

        if (category) {
            where.categoryId = category
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.minPrice = {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            }
        }

        if (minRating !== undefined && minRating > 0) {
            where.ratingAvg = { gte: minRating }
        }

        let orderBy: Record<string, 'asc' | 'desc'> = { soldCount: 'desc' }
        switch (sortBy) {
            case 'newest':
                orderBy = { createdAt: 'desc' }
                break
            case 'price_asc':
                orderBy = { minPrice: 'asc' }
                break
            case 'price_desc':
                orderBy = { minPrice: 'desc' }
                break
            case 'rating':
                orderBy = { ratingAvg: 'desc' }
                break
            case 'best_selling':
            case 'relevance':
            default:
                orderBy = { soldCount: 'desc' }
                break
        }

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: { category: true, variants: true },
            }),
            this.prisma.product.count({ where }),
        ])

        const shopIds = Array.from(new Set(products.map((p) => p.shopId)))
        const shops = await this.prisma.sellerProfile.findMany({
            where: { id: { in: shopIds } },
            select: { id: true, shopName: true, shopSlug: true },
        })
        const shopMap = new Map(shops.map((s) => [s.id, s]))

        const data: SearchProductDoc[] = products.map((p) => this.mapProductToDoc(p, shopMap.get(p.shopId) ?? null))

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
                took: 0,
                source: 'database',
            },
            aggregations: {
                categories: [],
            },
        }
    }
}
