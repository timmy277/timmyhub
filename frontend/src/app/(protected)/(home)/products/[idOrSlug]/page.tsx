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
    const res = await getPublicProductDetailAction(idOrSlug)

    if (!res.ok || !res.data) {
        return {
            title: 'Sản phẩm không tồn tại | TimmyHub',
        }
    }

    const product = res.data
    return {
        title: `${product.name} | TimmyHub`,
        description: product.description.slice(0, 160),
        openGraph: {
            title: `${product.name} | TimmyHub`,
            description: product.description.slice(0, 160),
            images: product.images[0] ? [{ url: product.images[0] }] : [],
        },
    }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
    const { idOrSlug } = await params
    const [productRes, relatedRes] = await Promise.all([
        getPublicProductDetailAction(idOrSlug),
        listPublicProductsAction({ pageSize: 6 }),
    ])

    if (!productRes.ok || !productRes.data) {
        notFound()
    }

    const relatedProducts = relatedRes.ok
        ? relatedRes.data.items.filter((p) => p.id !== productRes.data.id).slice(0, 4)
        : []

    return <PublicProductDetailView product={productRes.data} relatedProducts={relatedProducts} />
}
