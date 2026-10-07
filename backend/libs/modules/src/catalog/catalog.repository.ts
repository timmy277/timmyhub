import { Injectable } from '@nestjs/common'

import { OUTBOX_AGGREGATE, OUTBOX_EVENT, ProductStatus } from '@timmyhub/contracts'
import type {
    CategoryQuery,
    CreateProductInput,
    ProductListResult,
    ProductQuery,
    ProductStatusType,
    UpdateProductInput,
} from '@timmyhub/contracts'
import { Prisma, PrismaService } from '@timmyhub/prisma'
import type { Category } from '@timmyhub/prisma'

import { slugifyString, toProductSummary } from './catalog.mapper'
import type { CategoryWithRelations, ProductWithRelations } from './catalog.mapper'

@Injectable()
export class CatalogRepository {
    // ===== Dependencies =====
    constructor(private readonly prisma: PrismaService) {}

    // ===== Category Queries & Mutations =====

    async findCategories(): Promise<Category[]> {
        return this.prisma.category.findMany({
            where: { isActive: true },
            orderBy: { position: 'asc' },
            include: {
                children: {
                    where: { isActive: true },
                    orderBy: { position: 'asc' },
                },
            },
        })
    }

    async findAdminCategories(query: CategoryQuery): Promise<CategoryWithRelations[]> {
        const { page = 1, pageSize = 50, q, parentId, isActive } = query
        const where: Prisma.CategoryWhereInput = {}

        if (q) {
            where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }]
        }

        if (parentId !== undefined) {
            if (parentId === 'root' || parentId === null || parentId === '') {
                where.parentId = null
            } else if (parentId !== 'all') {
                where.parentId = parentId
            }
        }

        if (isActive !== undefined) {
            where.isActive = isActive
        }

        return this.prisma.category.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
            include: {
                parent: true,
                _count: {
                    select: { products: true, children: true },
                },
            },
        })
    }

    async countAdminCategories(query: CategoryQuery): Promise<number> {
        const { q, parentId, isActive } = query
        const where: Prisma.CategoryWhereInput = {}

        if (q) {
            where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }]
        }

        if (parentId !== undefined) {
            if (parentId === 'root' || parentId === null || parentId === '') {
                where.parentId = null
            } else if (parentId !== 'all') {
                where.parentId = parentId
            }
        }

        if (isActive !== undefined) {
            where.isActive = isActive
        }

        return this.prisma.category.count({ where })
    }

    async findCategoryById(id: string): Promise<CategoryWithRelations | null> {
        return this.prisma.category.findUnique({
            where: { id },
            include: {
                parent: true,
                children: {
                    orderBy: { position: 'asc' },
                    include: {
                        _count: { select: { products: true, children: true } },
                    },
                },
                _count: {
                    select: { products: true, children: true },
                },
            },
        })
    }

    async findCategoryBySlug(slug: string): Promise<Category | null> {
        return this.prisma.category.findUnique({
            where: { slug },
        })
    }

    async createCategory(data: {
        name: string
        slug: string
        parentId?: string | null | undefined
        image?: string | null | undefined
        description?: string | null | undefined
        position?: number | undefined
        isActive?: boolean | undefined
    }): Promise<CategoryWithRelations> {
        return this.prisma.category.create({
            data: {
                name: data.name,
                slug: data.slug,
                parentId: data.parentId || null,
                image: data.image || null,
                description: data.description || null,
                position: data.position ?? 0,
                isActive: data.isActive ?? true,
            },
            include: {
                parent: true,
                _count: { select: { products: true, children: true } },
            },
        })
    }

    async updateCategory(
        id: string,
        data: {
            name?: string | undefined
            slug?: string | undefined
            parentId?: string | null | undefined
            image?: string | null | undefined
            description?: string | null | undefined
            position?: number | undefined
            isActive?: boolean | undefined
        },
    ): Promise<CategoryWithRelations> {
        return this.prisma.category.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.slug !== undefined ? { slug: data.slug } : {}),
                ...(data.parentId !== undefined ? { parentId: data.parentId || null } : {}),
                ...(data.image !== undefined ? { image: data.image || null } : {}),
                ...(data.description !== undefined ? { description: data.description || null } : {}),
                ...(data.position !== undefined ? { position: data.position } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            },
            include: {
                parent: true,
                _count: { select: { products: true, children: true } },
            },
        })
    }

    async deleteCategory(id: string): Promise<boolean> {
        await this.prisma.category.delete({
            where: { id },
        })
        return true
    }

    // ===== Product Queries =====

    async countProducts(): Promise<number> {
        return this.prisma.product.count({
            where: { status: { not: ProductStatus.DELETED } },
        })
    }

    async findProductById(id: string): Promise<ProductWithRelations | null> {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                options: {
                    include: { values: true },
                },
                variants: {
                    include: { inventory: true },
                },
            },
        })

        if (!product) return null

        const shopProfile = await this.prisma.sellerProfile.findUnique({
            where: { id: product.shopId },
        })

        return {
            ...product,
            shopProfile,
        }
    }

    async findProductByShopAndSlug(shopId: string, slug: string): Promise<ProductWithRelations | null> {
        const product = await this.prisma.product.findUnique({
            where: { shopId_slug: { shopId, slug } },
            include: {
                category: true,
                options: {
                    include: { values: true },
                },
                variants: {
                    include: { inventory: true },
                },
            },
        })

        if (!product) return null

        const shopProfile = await this.prisma.sellerProfile.findUnique({
            where: { id: product.shopId },
        })

        return {
            ...product,
            shopProfile,
        }
    }

    async findPublicProductByIdOrSlug(idOrSlug: string): Promise<ProductWithRelations | null> {
        const where: Prisma.ProductWhereInput = {
            OR: [{ id: idOrSlug }, { slug: idOrSlug }],
            status: ProductStatus.APPROVED,
            isSuspended: false,
        }

        const product = await this.prisma.product.findFirst({
            where,
            include: {
                category: true,
                options: {
                    include: { values: true },
                },
                variants: {
                    where: { isActive: true },
                    include: { inventory: true },
                },
            },
        })

        if (!product) return null

        const shopProfile = await this.prisma.sellerProfile.findUnique({
            where: { id: product.shopId },
        })

        // Shop phải không bị suspended
        if (shopProfile?.isSuspended) return null

        return {
            ...product,
            shopProfile,
        }
    }

    async findProductsByShop(shopId: string, query: ProductQuery): Promise<ProductListResult> {
        const page = Math.max(1, query.page || 1)
        const pageSize = Math.min(100, Math.max(1, query.pageSize || 10))
        const skip = (page - 1) * pageSize

        const where: Prisma.ProductWhereInput = {
            shopId,
            status: query.status ? (query.status as ProductStatusType) : { not: ProductStatus.DELETED },
            ...(query.isSuspended !== undefined ? { isSuspended: query.isSuspended } : {}),
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.q
                ? {
                      OR: [
                          { name: { contains: query.q, mode: 'insensitive' } },
                          { description: { contains: query.q, mode: 'insensitive' } },
                      ],
                  }
                : {}),
        }

        const [items, totalItems] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: true,
                    _count: { select: { variants: true } },
                },
            }),
            this.prisma.product.count({ where }),
        ])

        const shopProfile = await this.prisma.sellerProfile.findUnique({
            where: { id: shopId },
        })

        return {
            items: items.map((p) => toProductSummary({ ...p, shopProfile: shopProfile ?? null })),
            totalItems,
            page,
            pageSize,
            totalPages: Math.ceil(totalItems / pageSize),
        }
    }

    async findAllProductsAdmin(query: ProductQuery): Promise<ProductListResult> {
        const page = Math.max(1, query.page || 1)
        const pageSize = Math.min(100, Math.max(1, query.pageSize || 10))
        const skip = (page - 1) * pageSize

        const where: Prisma.ProductWhereInput = {
            status: query.status ? (query.status as ProductStatusType) : { not: ProductStatus.DELETED },
            ...(query.isSuspended !== undefined ? { isSuspended: query.isSuspended } : {}),
            ...(query.shopId ? { shopId: query.shopId } : {}),
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.q
                ? {
                      OR: [
                          { name: { contains: query.q, mode: 'insensitive' } },
                          { description: { contains: query.q, mode: 'insensitive' } },
                      ],
                  }
                : {}),
        }

        const [items, totalItems] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: true,
                    _count: { select: { variants: true } },
                },
            }),
            this.prisma.product.count({ where }),
        ])

        const shopIds = Array.from(new Set(items.map((i) => i.shopId)))
        const shops = await this.prisma.sellerProfile.findMany({
            where: { id: { in: shopIds } },
        })
        const shopMap = new Map(shops.map((s) => [s.id, s]))

        return {
            items: items.map((p) => toProductSummary({ ...p, shopProfile: shopMap.get(p.shopId) ?? null })),
            totalItems,
            page,
            pageSize,
            totalPages: Math.ceil(totalItems / pageSize),
        }
    }

    async findPublicProducts(query: ProductQuery): Promise<ProductListResult> {
        const page = Math.max(1, query.page || 1)
        const pageSize = Math.min(100, Math.max(1, query.pageSize || 10))
        const skip = (page - 1) * pageSize

        const where: Prisma.ProductWhereInput = {
            status: ProductStatus.APPROVED,
            isSuspended: false,
            ...(query.shopId ? { shopId: query.shopId } : {}),
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.q
                ? {
                      OR: [
                          { name: { contains: query.q, mode: 'insensitive' } },
                          { description: { contains: query.q, mode: 'insensitive' } },
                      ],
                  }
                : {}),
        }

        const [items, totalItems] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: true,
                },
            }),
            this.prisma.product.count({ where }),
        ])

        const shopIds = Array.from(new Set(items.map((i) => i.shopId)))
        const shops = await this.prisma.sellerProfile.findMany({
            where: { id: { in: shopIds }, isSuspended: false },
        })
        const shopMap = new Map(shops.map((s) => [s.id, s]))

        // Lọc các product mà shop chưa bị suspended
        const filteredItems = items.filter((p) => shopMap.has(p.shopId))

        return {
            items: filteredItems.map((p) => toProductSummary({ ...p, shopProfile: shopMap.get(p.shopId) })),
            totalItems,
            page,
            pageSize,
            totalPages: Math.ceil(totalItems / pageSize),
        }
    }

    // ===== Commands =====

    async createProduct(params: {
        shopId: string
        input: CreateProductInput
        actorId: string
    }): Promise<ProductWithRelations> {
        const { shopId, input, actorId } = params

        return this.prisma.$transaction(async (tx) => {
            // 1. Tạo slug unique cho shop
            let baseSlug = slugifyString(input.name)
            if (!baseSlug) baseSlug = `product-${Date.now()}`

            let slug = baseSlug
            let counter = 1
            while (await tx.product.findUnique({ where: { shopId_slug: { shopId, slug } } })) {
                slug = `${baseSlug}-${counter}`
                counter++
            }

            // 2. Tính giá và tổng kho ban đầu
            const prices = input.variants.map((v) => v.price)
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            const totalStock = input.variants.reduce((sum, v) => sum + v.stock, 0)
            const initialStatus = input.isDraft ? ProductStatus.DRAFT : ProductStatus.PENDING

            // 3. Tạo Product
            const product = await tx.product.create({
                data: {
                    shopId,
                    categoryId: input.categoryId,
                    name: input.name,
                    slug,
                    description: input.description,
                    images: input.images,
                    videos: input.videos ?? [],
                    status: initialStatus,
                    isSuspended: false,
                    minPrice: new Prisma.Decimal(minPrice),
                    maxPrice: new Prisma.Decimal(maxPrice),
                    totalStock,
                },
            })

            // 4. Tạo ProductOptions và ProductOptionValues (nếu có)
            const valueIdMap = new Map<string, string>() // key: `${optionName}:${value}` -> optionValueId

            if (input.options && input.options.length > 0) {
                for (let optIdx = 0; optIdx < input.options.length; optIdx++) {
                    const opt = input.options[optIdx]!
                    const createdOption = await tx.productOption.create({
                        data: {
                            productId: product.id,
                            name: opt.name,
                            position: optIdx,
                        },
                    })

                    for (let valIdx = 0; valIdx < opt.values.length; valIdx++) {
                        const valStr = opt.values[valIdx]!
                        const createdVal = await tx.productOptionValue.create({
                            data: {
                                optionId: createdOption.id,
                                value: valStr,
                                position: valIdx,
                            },
                        })
                        valueIdMap.set(`${opt.name}:${valStr}`, createdVal.id)
                    }
                }
            }

            // 5. Tạo ProductVariants và InventoryItems
            for (let vIdx = 0; vIdx < input.variants.length; vIdx++) {
                const v = input.variants[vIdx]!
                const isDefault = v.isDefault ?? vIdx === 0

                // Xây dựng optionKey
                let optionKey = ''
                if (v.optionValues && Object.keys(v.optionValues).length > 0 && input.options) {
                    const sortedValues: string[] = []
                    for (const opt of input.options) {
                        const matchedVal = v.optionValues[opt.name]
                        if (matchedVal) {
                            const valId = valueIdMap.get(`${opt.name}:${matchedVal}`)
                            if (valId) sortedValues.push(valId)
                        }
                    }
                    optionKey = sortedValues.join(':')
                }
                if (!optionKey) {
                    optionKey = `default-${vIdx}`
                }

                // Xây dựng SKU
                const sku = v.sku || `${slug.toUpperCase().slice(0, 20)}-V${vIdx + 1}`

                const variant = await tx.productVariant.create({
                    data: {
                        productId: product.id,
                        sku,
                        optionKey,
                        price: new Prisma.Decimal(v.price),
                        compareAtPrice: v.compareAtPrice ? new Prisma.Decimal(v.compareAtPrice) : null,
                        weightGram: v.weightGram || 200,
                        imageId: v.imageId || null,
                        isDefault,
                        isActive: true,
                    },
                })

                await tx.inventoryItem.create({
                    data: {
                        variantId: variant.id,
                        warehouseId: shopId,
                        onHand: v.stock,
                        reserved: 0,
                    },
                })
            }

            // 6. Ghi Transactional Outbox Event
            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.CATALOG,
                    aggregateId: product.id,
                    eventType: OUTBOX_EVENT.PRODUCT_CREATED,
                    payload: {
                        productId: product.id,
                        shopId,
                        name: product.name,
                        status: product.status,
                        actorId,
                    },
                },
            })

            // 7. Trả về product đầy đủ relations
            const fullProduct = await tx.product.findUniqueOrThrow({
                where: { id: product.id },
                include: {
                    category: true,
                    options: { include: { values: true } },
                    variants: { include: { inventory: true } },
                },
            })

            const shopProfile = await tx.sellerProfile.findUnique({
                where: { id: shopId },
            })

            return {
                ...fullProduct,
                shopProfile,
            }
        })
    }

    async reviewProduct(params: {
        productId: string
        reviewedById: string
        action: 'APPROVE' | 'REJECT'
        reviewNote?: string | undefined
    }): Promise<ProductWithRelations | null> {
        return this.prisma.$transaction(async (tx) => {
            const nextStatus = params.action === 'APPROVE' ? ProductStatus.APPROVED : ProductStatus.REJECTED
            const eventType =
                params.action === 'APPROVE' ? OUTBOX_EVENT.PRODUCT_APPROVED : OUTBOX_EVENT.PRODUCT_REJECTED

            const updated = await tx.product.updateMany({
                where: {
                    id: params.productId,
                    status: ProductStatus.PENDING,
                },
                data: {
                    status: nextStatus,
                    reviewedById: params.reviewedById,
                    reviewedAt: new Date(),
                    reviewNote: params.reviewNote ?? null,
                },
            })

            if (updated.count === 0) {
                return null
            }

            const product = await tx.product.findUniqueOrThrow({
                where: { id: params.productId },
                include: {
                    category: true,
                    options: { include: { values: true } },
                    variants: { include: { inventory: true } },
                },
            })

            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.CATALOG,
                    aggregateId: product.id,
                    eventType,
                    payload: {
                        productId: product.id,
                        shopId: product.shopId,
                        status: product.status,
                        reviewedById: params.reviewedById,
                        reviewNote: params.reviewNote ?? null,
                    },
                },
            })

            const shopProfile = await tx.sellerProfile.findUnique({
                where: { id: product.shopId },
            })

            return {
                ...product,
                shopProfile,
            }
        })
    }

    async suspendProduct(params: {
        productId: string
        actorId: string
        reason: string
    }): Promise<ProductWithRelations | null> {
        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: params.productId },
            })

            if (!product || product.status === ProductStatus.DELETED) {
                return null
            }

            const updated = await tx.product.update({
                where: { id: params.productId },
                data: {
                    isSuspended: true,
                    suspendedReason: params.reason,
                    suspendedById: params.actorId,
                    suspendedAt: new Date(),
                },
                include: {
                    category: true,
                    options: { include: { values: true } },
                    variants: { include: { inventory: true } },
                },
            })

            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.CATALOG,
                    aggregateId: updated.id,
                    eventType: OUTBOX_EVENT.PRODUCT_SUSPENDED,
                    payload: {
                        productId: updated.id,
                        shopId: updated.shopId,
                        reason: params.reason,
                        actorId: params.actorId,
                    },
                },
            })

            const shopProfile = await tx.sellerProfile.findUnique({
                where: { id: updated.shopId },
            })

            return {
                ...updated,
                shopProfile,
            }
        })
    }

    async restoreProduct(params: { productId: string; actorId: string }): Promise<ProductWithRelations | null> {
        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: params.productId },
            })

            if (!product || product.status === ProductStatus.DELETED) {
                return null
            }

            const updated = await tx.product.update({
                where: { id: params.productId },
                data: {
                    isSuspended: false,
                    suspendedReason: null,
                    suspendedById: null,
                    suspendedAt: null,
                },
                include: {
                    category: true,
                    options: { include: { values: true } },
                    variants: { include: { inventory: true } },
                },
            })

            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.CATALOG,
                    aggregateId: updated.id,
                    eventType: OUTBOX_EVENT.PRODUCT_RESTORED,
                    payload: {
                        productId: updated.id,
                        shopId: updated.shopId,
                        actorId: params.actorId,
                    },
                },
            })

            const shopProfile = await tx.sellerProfile.findUnique({
                where: { id: updated.shopId },
            })

            return {
                ...updated,
                shopProfile,
            }
        })
    }

    async updateProduct(params: {
        productId: string
        actorId: string
        input: UpdateProductInput
        isSeller?: boolean
    }): Promise<ProductWithRelations | null> {
        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: params.productId },
            })

            if (!product || product.status === ProductStatus.DELETED) {
                return null
            }

            const data: Prisma.ProductUpdateInput = {}
            if (params.input.name && params.input.name.trim() !== product.name) {
                data.name = params.input.name.trim()
                data.slug = slugifyString(data.name)
            }
            if (params.input.description !== undefined) {
                data.description = params.input.description.trim()
            }
            if (params.input.categoryId) {
                data.category = { connect: { id: params.input.categoryId } }
            }
            if (params.input.images) {
                data.images = params.input.images
            }
            if (params.input.videos !== undefined) {
                data.videos = params.input.videos
            }
            if (params.input.isFeatured !== undefined) {
                data.isFeatured = params.input.isFeatured
            }

            // Nếu seller cập nhật sản phẩm đang bị REJECTED, chuyển về PENDING để admin duyệt lại
            if (params.isSeller && product.status === ProductStatus.REJECTED) {
                data.status = ProductStatus.PENDING
                data.reviewedById = null
                data.reviewedAt = null
            }

            const updated = await tx.product.update({
                where: { id: params.productId },
                data,
                include: {
                    category: true,
                    options: { include: { values: true } },
                    variants: { include: { inventory: true } },
                },
            })

            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.CATALOG,
                    aggregateId: updated.id,
                    eventType: OUTBOX_EVENT.PRODUCT_UPDATED,
                    payload: {
                        productId: updated.id,
                        shopId: updated.shopId,
                        actorId: params.actorId,
                        changes: params.input,
                    },
                },
            })

            const shopProfile = await tx.sellerProfile.findUnique({
                where: { id: updated.shopId },
            })

            return {
                ...updated,
                shopProfile,
            }
        })
    }

    async deleteProduct(params: { productId: string; actorId: string }): Promise<boolean> {
        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: params.productId },
            })

            if (!product || product.status === ProductStatus.DELETED) {
                return false
            }

            await tx.product.update({
                where: { id: params.productId },
                data: {
                    status: ProductStatus.DELETED,
                },
            })

            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.CATALOG,
                    aggregateId: product.id,
                    eventType: OUTBOX_EVENT.PRODUCT_DELETED,
                    payload: {
                        productId: product.id,
                        shopId: product.shopId,
                        actorId: params.actorId,
                    },
                },
            })

            return true
        })
    }
}
