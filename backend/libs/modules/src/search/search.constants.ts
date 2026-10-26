export const SEARCH_ROUTE = {
    ROOT: 'v1/search',
    SUGGEST: 'suggest',
    STATUS: 'status',
    REINDEX: 'reindex',
} as const

export const SEARCH_CONFIG = {
    INDEX: 'products',
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    SUGGEST_LIMIT: 8,
} as const
