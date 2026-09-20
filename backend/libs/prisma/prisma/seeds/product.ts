import type { PrismaClient } from '../../src/generated/prisma/client'

import type { SeedSellers } from './seller'

type OptionSeed = { name: string; values: string[] }

type ProductSeed = {
    shop: 'seller0' | 'seller1' | 'seller2' | 'brand'
    categorySlug: string
    name: string
    slug: string
    description: string
    options: OptionSeed[]
    basePrice: number
    compareAtPrice?: number
    weightGram: number
    stockPerVariant: number
}

const PRODUCTS: ProductSeed[] = [
    {
        shop: 'seller0',
        categorySlug: 'thoi-trang-nam',
        name: 'Áo thun nam basic cotton',
        slug: 'ao-thun-nam-basic-cotton',
        description: 'Áo thun cotton 100%, form regular, dễ phối đồ.',
        options: [
            { name: 'Màu sắc', values: ['Đen', 'Trắng'] },
            { name: 'Size', values: ['M', 'L'] },
        ],
        basePrice: 129000,
        compareAtPrice: 179000,
        weightGram: 200,
        stockPerVariant: 50,
    },
    {
        shop: 'seller0',
        categorySlug: 'thoi-trang-nu',
        name: 'Váy suông nữ dạo phố',
        slug: 'vay-suong-nu-dao-pho',
        description: 'Váy suông chất liệu linen, thoáng mát, dáng rộng.',
        options: [{ name: 'Màu sắc', values: ['Đen', 'Đỏ'] }],
        basePrice: 259000,
        weightGram: 300,
        stockPerVariant: 30,
    },
    {
        shop: 'seller0',
        categorySlug: 'giay-dep',
        name: 'Giày sneaker thể thao',
        slug: 'giay-sneaker-the-thao',
        description: 'Giày sneaker đế cao su non, đế êm, phù hợp chạy bộ nhẹ.',
        options: [{ name: 'Size', values: ['39', '40', '41'] }],
        basePrice: 399000,
        compareAtPrice: 499000,
        weightGram: 450,
        stockPerVariant: 20,
    },
    {
        shop: 'seller1',
        categorySlug: 'dien-thoai',
        name: 'Điện thoại Xphone 12',
        slug: 'dien-thoai-xphone-12',
        description: 'Màn hình AMOLED 6.5 inch, pin 5000mAh, camera 3 ống kính.',
        options: [
            { name: 'Màu sắc', values: ['Đen', 'Bạc'] },
            { name: 'Dung lượng', values: ['128GB', '256GB'] },
        ],
        basePrice: 5990000,
        compareAtPrice: 6990000,
        weightGram: 200,
        stockPerVariant: 15,
    },
    {
        shop: 'seller1',
        categorySlug: 'phu-kien-dien-thoai',
        name: 'Tai nghe bluetooth TWS Pro',
        slug: 'tai-nghe-bluetooth-tws-pro',
        description: 'Chống ồn chủ động, pin 30 giờ, chống nước IPX5.',
        options: [],
        basePrice: 349000,
        weightGram: 60,
        stockPerVariant: 100,
    },
    {
        shop: 'seller1',
        categorySlug: 'laptop-may-tinh',
        name: 'Laptop UltraBook 14 inch',
        slug: 'laptop-ultrabook-14-inch',
        description: 'CPU 8 nhân, màn hình IPS Full HD, thân nhôm mỏng nhẹ 1.2kg.',
        options: [{ name: 'RAM', values: ['8GB', '16GB'] }],
        basePrice: 14990000,
        weightGram: 1300,
        stockPerVariant: 10,
    },
    {
        shop: 'seller2',
        categorySlug: 'do-dung-nha-bep',
        name: 'Bộ nồi chống dính 3 món',
        slug: 'bo-noi-chong-dinh-3-mon',
        description: 'Đáy từ, chống dính vĩnh cửu, dùng được cho bếp gas và bếp từ.',
        options: [],
        basePrice: 459000,
        compareAtPrice: 599000,
        weightGram: 2500,
        stockPerVariant: 25,
    },
    {
        shop: 'seller2',
        categorySlug: 'do-dien-gia-dung',
        name: 'Máy xay sinh tố đa năng',
        slug: 'may-xay-sinh-to-da-nang',
        description: 'Công suất 500W, cối inox 304, 2 tốc độ xay.',
        options: [{ name: 'Màu sắc', values: ['Trắng', 'Đen'] }],
        basePrice: 349000,
        weightGram: 1800,
        stockPerVariant: 20,
    },
    {
        shop: 'brand',
        categorySlug: 'thoi-trang-nam',
        name: 'Áo hoodie TimmyWear unisex',
        slug: 'ao-hoodie-timmywear-unisex',
        description: 'Hoodie chính hãng TimmyWear, vải bông cào lông ấm.',
        options: [{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }],
        basePrice: 449000,
        compareAtPrice: 599000,
        weightGram: 450,
        stockPerVariant: 40,
    },
    {
        shop: 'brand',
        categorySlug: 'cham-soc-da',
        name: 'Set skincare dưỡng ẩm TimmyWear',
        slug: 'set-skincare-duong-am-timmywear',
        description: 'Bộ 3 sản phẩm sữa rửa mặt, toner, kem dưỡng cho da khô.',
        options: [],
        basePrice: 329000,
        weightGram: 400,
        stockPerVariant: 35,
    },
]

function shopIdFor(shop: ProductSeed['shop'], sellers: SeedSellers): string {
    if (shop === 'brand') return sellers.brandSellerProfileId
    const index = Number(shop.replace('seller', ''))
    // Chỉ mảng cố định 3 seller trong SHOPS (seller.ts) — luôn có phần tử ở index này.
    return sellers.sellerProfileIds[index]!
}

// Tích Descartes các giá trị option, theo đúng thứ tự định nghĩa option/value (đã tăng dần theo position) —
// optionKey nối id các OptionValue bằng ":" theo thứ tự này (docs/02-domain/product-variant.md §2).
function cartesianCombos<T>(groups: T[][]): T[][] {
    return groups.reduce<T[][]>((acc, group) => acc.flatMap((combo) => group.map((value) => [...combo, value])), [[]])
}

export type SeedProduct = { productId: string; defaultVariantId: string }

export async function seedProducts(
    prisma: PrismaClient,
    categoryIdBySlug: Record<string, string>,
    sellers: SeedSellers,
): Promise<Record<string, SeedProduct>> {
    console.log('  - Seeding products, options, variants, inventory...')

    const productBySlug: Record<string, SeedProduct> = {}

    for (const seed of PRODUCTS) {
        const shopId = shopIdFor(seed.shop, sellers)
        // categorySlug luôn khớp một slug đã seed trong category.ts.
        const categoryId = categoryIdBySlug[seed.categorySlug]!

        const product = await prisma.product.upsert({
            where: { shopId_slug: { shopId, slug: seed.slug } },
            update: {},
            create: {
                shopId,
                categoryId,
                name: seed.name,
                slug: seed.slug,
                description: seed.description,
                status: 'APPROVED',
                isFeatured: false,
            },
        })

        // Option + OptionValue — bỏ qua nếu product đã có variant (idempotent khi seed chạy lại)
        const existingVariant = await prisma.productVariant.findFirst({
            where: { productId: product.id, isDefault: true },
        })
        if (existingVariant) {
            productBySlug[seed.slug] = { productId: product.id, defaultVariantId: existingVariant.id }
            continue
        }

        const optionValueGroups: Array<Array<{ id: string; value: string }>> = []
        for (const optionSeed of seed.options) {
            const position = optionValueGroups.length
            const option = await prisma.productOption.upsert({
                where: { productId_name: { productId: product.id, name: optionSeed.name } },
                update: {},
                create: { productId: product.id, name: optionSeed.name, position },
            })

            const values: Array<{ id: string; value: string }> = []
            for (let valuePosition = 0; valuePosition < optionSeed.values.length; valuePosition++) {
                const optionValue = optionSeed.values[valuePosition]!
                const value = await prisma.productOptionValue.upsert({
                    where: { optionId_value: { optionId: option.id, value: optionValue } },
                    update: {},
                    create: { optionId: option.id, value: optionValue, position: valuePosition },
                })
                values.push({ id: value.id, value: value.value })
            }
            optionValueGroups.push(values)
        }

        const combos = optionValueGroups.length > 0 ? cartesianCombos(optionValueGroups) : [[]]

        let variantIndex = 0
        const minPrice = seed.basePrice
        const maxPrice = seed.basePrice
        let totalStock = 0
        let defaultVariantId = ''

        for (const combo of combos) {
            variantIndex++
            const optionKey = combo.map((v) => v.id).join(':')
            const skuSuffix = combo.length > 0 ? combo.map((v) => v.value).join('-') : 'default'
            const sku = `${seed.slug}-${skuSuffix}`.toUpperCase().replace(/[^A-Z0-9-]/g, '')

            const variant = await prisma.productVariant.create({
                data: {
                    productId: product.id,
                    sku,
                    optionKey,
                    price: seed.basePrice,
                    compareAtPrice: seed.compareAtPrice ?? null,
                    weightGram: seed.weightGram,
                    isDefault: variantIndex === 1,
                },
            })

            await prisma.inventoryItem.create({
                data: {
                    variantId: variant.id,
                    warehouseId: shopId,
                    onHand: seed.stockPerVariant,
                },
            })

            if (variantIndex === 1) defaultVariantId = variant.id
            totalStock += seed.stockPerVariant
        }

        // Trường dẫn xuất — bình thường chỉ ProductPriceRecalculator được ghi (product-variant.md §2);
        // ở đây seed ghi trực tiếp vì đang khởi tạo dữ liệu lần đầu, không phải một mutation nghiệp vụ.
        await prisma.product.update({
            where: { id: product.id },
            data: { minPrice, maxPrice, totalStock },
        })

        productBySlug[seed.slug] = { productId: product.id, defaultVariantId }
    }

    return productBySlug
}
