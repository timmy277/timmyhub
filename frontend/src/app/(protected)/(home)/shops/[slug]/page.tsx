import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { listCategoriesAction, listPublicProductsAction } from '@/features/products'
import { getPublicShopAction, PublicShopView } from '@/features/seller'

interface ShopPageProps {
    params: Promise<{
        slug: string
    }>
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
    const { slug } = await params
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'
    const res = await getPublicShopAction(slug)

    if (!res.ok || !res.data) {
        return {
            title: 'Gian hàng không tồn tại | TimmyHub',
            robots: { index: false, follow: false },
        }
    }

    const shop = res.data
    const description = (
        shop.description ||
        `Mua sắm các sản phẩm chính hãng, chất lượng từ gian hàng ${shop.shopName} trên sàn thương mại điện tử TimmyHub.`
    ).slice(0, 160)
    const canonicalUrl = `${siteUrl}/shops/${slug}`

    return {
        title: `${shop.shopName} - Gian hàng chính hãng | TimmyHub`,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: `${shop.shopName} - Gian hàng chính hãng | TimmyHub`,
            description,
            url: canonicalUrl,
            siteName: 'TimmyHub',
            locale: 'vi_VN',
            type: 'website',
            images: shop.shopLogo ? [{ url: shop.shopLogo }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${shop.shopName} - Gian hàng chính hãng | TimmyHub`,
            description,
            images: shop.shopLogo ? [shop.shopLogo] : [],
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

export default async function ShopPage({ params }: ShopPageProps) {
    const { slug } = await params

    const [shopRes, categoriesRes] = await Promise.all([getPublicShopAction(slug), listCategoriesAction()])

    if (!shopRes.ok || !shopRes.data) {
        notFound()
    }

    const shop = shopRes.data

    // Fetch sản phẩm thuộc về gian hàng này
    const productsRes = await listPublicProductsAction({
        shopId: shop.id,
        pageSize: 40,
    })

    return (
        <PublicShopView
            shop={shop}
            initialProducts={productsRes.ok ? productsRes.data : null}
            categories={categoriesRes.ok ? categoriesRes.data : []}
        />
    )
}
