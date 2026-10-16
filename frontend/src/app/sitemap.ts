import type { MetadataRoute } from 'next'

import { ROUTE } from '@/constants'
import { listPublicProductsAction } from '@/features/products'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'
    const now = new Date()

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${siteUrl}${ROUTE.HOME}`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${siteUrl}${ROUTE.LOGIN}`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ]

    try {
        const res = await listPublicProductsAction({ pageSize: 100 })
        if (res.ok && res.data?.items) {
            const productRoutes: MetadataRoute.Sitemap = res.data.items.map((product) => ({
                url: `${siteUrl}/products/${product.slug || product.id}`,
                lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
                changeFrequency: 'weekly',
                priority: 0.8,
            }))
            return [...staticRoutes, ...productRoutes]
        }
    } catch {
        // Fallback to static routes if catalog query fails
    }

    return staticRoutes
}
