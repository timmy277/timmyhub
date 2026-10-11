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
    const res = await getPublicShopAction(slug)

    if (!res.ok || !res.data) {
        return {
            title: 'Gian hàng không tồn tại | TimmyHub',
        }
    }

    const shop = res.data
    const description =
        shop.description ||
        `Mua sắm các sản phẩm chính hãng, chất lượng từ gian hàng ${shop.shopName} trên sàn thương mại điện tử TimmyHub.`

    return {
        title: `${shop.shopName} - Gian hàng chính hãng | TimmyHub`,
        description: description.slice(0, 160),
        openGraph: {
            title: `${shop.shopName} - Gian hàng chính hãng | TimmyHub`,
            description: description.slice(0, 160),
            images: shop.shopLogo ? [{ url: shop.shopLogo }] : [],
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
