import type {
    CategoryItem,
    CategorySummary,
    ProductDetail,
    ProductOptionDetail,
    ProductOptionValueDetail,
    ProductSummary,
    ProductVariantDetail,
} from '@timmyhub/contracts'
import type {
    Category,
    InventoryItem,
    Product,
    ProductOption,
    ProductOptionValue,
    ProductVariant,
    SellerProfile,
} from '@timmyhub/prisma'

export type ProductWithRelations = Product & {
    category?: Category | null | undefined
    options?: Array<ProductOption & { values: ProductOptionValue[] }> | undefined
    variants?: Array<ProductVariant & { inventory?: InventoryItem | null }> | undefined
    shopProfile?: SellerProfile | null | undefined
    _count?: { variants?: number } | undefined
}

export type CategoryWithRelations = Category & {
    parent?: Category | null | undefined
    children?: Category[] | undefined
    _count?:
        | {
              products?: number | undefined
              children?: number | undefined
          }
        | undefined
}

export function slugifyString(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
}

export function toCategorySummary(category: Category & { children?: Category[] }): CategorySummary {
    return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        image: category.image,
        children: category.children ? category.children.map((child) => toCategorySummary(child)) : undefined,
    }
}

export function toCategoryItem(
    category: Category & {
        parent?: Category | null | undefined
        children?: Category[] | undefined
        _count?: { products?: number | undefined; children?: number | undefined } | undefined
    },
): CategoryItem {
    return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        parentName: category.parent?.name ?? null,
        image: category.image,
        description: category.description,
        position: category.position,
        isActive: category.isActive,
        productCount: category._count?.products ?? 0,
        childrenCount: category._count?.children ?? (category.children ? category.children.length : 0),
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
        children: category.children ? category.children.map((child) => toCategoryItem(child)) : undefined,
    }
}

export function toProductOptionDetail(option: ProductOption & { values: ProductOptionValue[] }): ProductOptionDetail {
    return {
        id: option.id,
        productId: option.productId,
        name: option.name,
        position: option.position,
        values: option.values
            .sort((a, b) => a.position - b.position)
            .map((v): ProductOptionValueDetail => ({
                id: v.id,
                optionId: v.optionId,
                value: v.value,
                position: v.position,
                imageId: v.imageId,
            })),
    }
}

export function toProductVariantDetail(
    variant: ProductVariant & { inventory?: InventoryItem | null },
): ProductVariantDetail {
    return {
        id: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        optionKey: variant.optionKey,
        price: Number(variant.price),
        compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
        weightGram: variant.weightGram,
        imageId: variant.imageId,
        isDefault: variant.isDefault,
        isActive: variant.isActive,
        stock: variant.inventory ? variant.inventory.onHand - variant.inventory.reserved : 0,
    }
}

export function toProductDetail(product: ProductWithRelations): ProductDetail {
    return {
        id: product.id,
        shopId: product.shopId,
        shopName: product.shopProfile?.shopName ?? null,
        shopSlug: product.shopProfile?.shopSlug ?? null,
        categoryId: product.categoryId,
        categoryName: product.category?.name ?? null,
        name: product.name,
        slug: product.slug,
        description: product.description,
        images: product.images,
        videos: product.videos ?? [],
        status: product.status,
        isSuspended: product.isSuspended,
        suspendedReason: product.suspendedReason,
        suspendedById: product.suspendedById,
        suspendedAt: product.suspendedAt?.toISOString() ?? null,
        minPrice: product.minPrice ? Number(product.minPrice) : null,
        maxPrice: product.maxPrice ? Number(product.maxPrice) : null,
        totalStock: product.totalStock,
        soldCount: product.soldCount,
        viewCount: product.viewCount,
        ratingAvg: product.ratingAvg,
        ratingCount: product.ratingCount,
        isFeatured: product.isFeatured,
        reviewNote: product.reviewNote,
        reviewedById: product.reviewedById,
        reviewedAt: product.reviewedAt?.toISOString() ?? null,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        options: (product.options ?? []).sort((a, b) => a.position - b.position).map(toProductOptionDetail),
        variants: (product.variants ?? []).map(toProductVariantDetail),
    }
}

export function toProductSummary(product: ProductWithRelations): ProductSummary {
    return {
        id: product.id,
        shopId: product.shopId,
        shopName: product.shopProfile?.shopName ?? null,
        shopSlug: product.shopProfile?.shopSlug ?? null,
        categoryId: product.categoryId,
        categoryName: product.category?.name ?? null,
        name: product.name,
        slug: product.slug,
        images: product.images,
        videos: product.videos ?? [],
        status: product.status,
        isSuspended: product.isSuspended,
        suspendedReason: product.suspendedReason,
        minPrice: product.minPrice ? Number(product.minPrice) : null,
        maxPrice: product.maxPrice ? Number(product.maxPrice) : null,
        totalStock: product.totalStock,
        soldCount: product.soldCount,
        ratingAvg: product.ratingAvg,
        ratingCount: product.ratingCount,
        variantCount: product._count?.variants ?? product.variants?.length ?? 0,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
    }
}
