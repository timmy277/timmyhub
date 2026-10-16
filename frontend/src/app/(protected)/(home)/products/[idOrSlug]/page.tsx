import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPublicProductDetailAction, listPublicProductsAction, PublicProductDetailView } from '@/features/products'

interface ProductDetailPageProps {
    params: Promise<{
        idOrSlug: string
    }>
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
    const { idOrSlug } = await params
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'
    const res = await getPublicProductDetailAction(idOrSlug)

    if (!res.ok || !res.data) {
        return {
            title: 'Sản phẩm không tồn tại | TimmyHub',
            robots: { index: false, follow: false },
        }
    }

    const product = res.data
    const rawDesc = (product.description || '').replace(/\s+/g, ' ').trim()
    const isRepetitiveOrShort = /(.)\1{3,}/.test(rawDesc) || rawDesc.length < 50
    const description =
        !isRepetitiveOrShort && rawDesc.length >= 50
            ? rawDesc.slice(0, 155)
            : `Mua ngay ${product.name} chính hãng tại TimmyHub với giá ưu đãi cực tốt, hỗ trợ bảo hành chính hãng và giao hàng toàn quốc siêu tốc.`
    const canonicalUrl = `${siteUrl}/products/${product.slug || product.id}`

    return {
        title: `${product.name} | TimmyHub`,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: `${product.name} | TimmyHub`,
            description,
            url: canonicalUrl,
            siteName: 'TimmyHub',
            locale: 'vi_VN',
            type: 'website',
            images: product.images[0] ? [{ url: product.images[0], alt: product.name }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${product.name} | TimmyHub`,
            description,
            images: product.images[0] ? [product.images[0]] : [],
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
    }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
    const { idOrSlug } = await params
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'
    const [productRes, relatedRes] = await Promise.all([
        getPublicProductDetailAction(idOrSlug),
        listPublicProductsAction({ pageSize: 6 }),
    ])

    if (!productRes.ok || !productRes.data) {
        notFound()
    }

    const product = productRes.data
    const relatedProducts = relatedRes.ok ? relatedRes.data.items.filter((p) => p.id !== product.id).slice(0, 4) : []

    const productUrl = `${siteUrl}/products/${product.slug || product.id}`
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Product',
                '@id': `${productUrl}/#product`,
                name: product.name,
                image: product.images,
                description: product.description || product.name,
                sku: product.variants?.[0]?.sku || product.slug || product.id,
                brand: {
                    '@type': 'Brand',
                    name: product.shopName || 'TimmyHub Mall',
                },
                offers: {
                    '@type': 'Offer',
                    price: product.minPrice || product.variants?.[0]?.price || '0',
                    priceCurrency: 'VND',
                    priceValidUntil: '2027-12-31',
                    availability:
                        product.totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                    url: productUrl,
                },
                aggregateRating:
                    product.ratingAvg > 0
                        ? {
                              '@type': 'AggregateRating',
                              ratingValue: product.ratingAvg,
                              reviewCount: Math.max(product.ratingCount || 1, 1),
                          }
                        : undefined,
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${productUrl}/#breadcrumb`,
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
                        name: product.categoryName || 'Sản phẩm',
                        item: `${siteUrl}/products`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: product.name,
                        item: productUrl,
                    },
                ],
            },
        ],
    }

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <PublicProductDetailView product={product} relatedProducts={relatedProducts} />
        </>
    )
}
