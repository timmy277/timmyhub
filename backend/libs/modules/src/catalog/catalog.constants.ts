// Hằng số của module catalog — coding-standards.md §4.3: không khai báo trong file class.

export const CATALOG_ROUTE = {
    ROOT: 'v1/catalog',
    PING: 'ping',
} as const

export const CATALOG_EVENT = {
    PRODUCT_PINGED: 'catalog.product.pinged',
} as const
