import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { SearchProductsQuery, SearchSortByType } from '@timmyhub/contracts'

import { searchProductsAction, SearchPageContainer } from '@/features/search'

interface SearchPageProps {
    searchParams: Promise<{
        q?: string
        category?: string
        brand?: string
        minPrice?: string
        maxPrice?: string
        minRating?: string
        sortBy?: string
        page?: string
    }>
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
    const t = await getTranslations('search')
    const params = await searchParams
    const query = params.q?.trim()
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'

    const title = query ? `${query} - ${t('pageTitle')} | TimmyHub` : `${t('pageTitle')} | TimmyHub`
    const description = query
        ? `Mua sắm các sản phẩm liên quan đến "${query}" giá tốt nhất, ưu đãi freeship và đảm bảo chính hãng tại TimmyHub.`
        : 'Tìm kiếm hàng ngàn sản phẩm công nghệ, thời trang, đồ gia dụng chính hãng với bộ lọc thông minh tại TimmyHub.'

    const canonicalUrl = `${siteUrl}/search${query ? `?q=${encodeURIComponent(query)}` : ''}`

    return {
        title,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title,
            description,
            url: canonicalUrl,
            siteName: 'TimmyHub',
            locale: 'vi_VN',
            type: 'website',
        },
        robots: {
            index: true,
            follow: true,
        },
    }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'

    const query: SearchProductsQuery = {
        q: params.q?.trim() || undefined,
        category: params.category || undefined,
        brand: params.brand || undefined,
        minPrice: params.minPrice ? Number(params.minPrice) : undefined,
        maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        sortBy: (params.sortBy as SearchSortByType) || 'relevance',
        page: params.page ? Number(params.page) : 1,
        limit: 20,
    }

    const initialRes = await searchProductsAction(query)
    const initialData = initialRes.ok ? initialRes.data : null

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                '@id': `${siteUrl}/search/#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Trang chủ',
                        item: siteUrl,
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Tìm kiếm sản phẩm',
                        item: `${siteUrl}/search`,
                    },
                ],
            },
        ],
    }

    return (
        <div className="container mx-auto px-4 py-6 sm:py-8 min-h-[70vh]">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Suspense fallback={<div className="h-96 rounded-3xl bg-muted/30 animate-pulse" />}>
                <SearchPageContainer initialData={initialData} initialQuery={query} />
            </Suspense>
        </div>
    )
}
