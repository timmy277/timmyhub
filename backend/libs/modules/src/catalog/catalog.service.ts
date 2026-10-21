import { Injectable, Optional } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { ApiError, apiMessageKey, ResourceStatus } from '@timmyhub/contracts'
import type {
    CategoryItem,
    CategoryListResult,
    CategoryQuery,
    CategorySummary,
    CreateCategoryInput,
    CreateProductInput,
    ProductDetail,
    ProductListResult,
    ProductQuery,
    ReviewProductInput,
    SuspendProductInput,
    UpdateCategoryInput,
    UpdateProductInput,
} from '@timmyhub/contracts'
import { SellerRepository } from '../seller'
import { RedisService } from '../redis/index'

import { CATALOG_EVENT } from './catalog.constants'
import { slugifyString, toCategoryItem, toCategorySummary, toProductDetail } from './catalog.mapper'
import { CatalogRepository } from './catalog.repository'
import type { PingResponse } from './dto/index'

@Injectable()
export class CatalogService {
    // ===== Dependencies =====
    constructor(
        private readonly catalogRepository: CatalogRepository,
        private readonly sellerRepository: SellerRepository,
        private readonly eventEmitter: EventEmitter2,
        @Optional() private readonly redisService?: RedisService,
    ) {}

    // ===== Infrastructure =====
    // NOTE: `ping` phát sự kiện nội bộ qua EventEmitter2 — đây là sự kiện demo/không mang nghiệp vụ,
    // không cần qua transactional outbox. Event nghiệp vụ (PRODUCT_CREATED, v.v.) luôn qua outbox.
    ping(): PingResponse {
        this.eventEmitter.emit(CATALOG_EVENT.PRODUCT_PINGED)
        return { module: 'catalog', status: 'ok' }
    }

    countProducts(): Promise<number> {
        return this.catalogRepository.countProducts()
    }

    // ===== Public Queries =====

    async getCategories(): Promise<CategorySummary[]> {
        const CACHE_KEY = 'cache:categories:tree'
        if (this.redisService) {
            const cached = await this.redisService.get<CategorySummary[]>(CACHE_KEY)
            if (cached) {
                return cached
            }
        }

        // Luật #7: lọc phạm vi TRONG câu truy vấn, không .filter() sau khi lấy
        const rootCategories = await this.catalogRepository.findRootCategories()
        const result = rootCategories.map((c) => toCategorySummary(c))

        if (this.redisService) {
            await this.redisService.set(CACHE_KEY, result, 3600) // TTL 1 giờ
        }

        return result
    }

    async listPublicProducts(query: ProductQuery): Promise<ProductListResult> {
        return this.catalogRepository.findPublicProducts(query)
    }

    async getPublicProductDetail(idOrSlug: string): Promise<ProductDetail> {
        const product = await this.catalogRepository.findPublicProductByIdOrSlug(idOrSlug)
        if (!product) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFound') })
        }
        return toProductDetail(product)
    }

    // ===== Seller Commands & Queries =====

    async createProduct(userId: string, input: CreateProductInput): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile || sellerProfile.status !== ResourceStatus.APPROVED) {
            throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('catalog.shopNotApproved') })
        }

        if (sellerProfile.isSuspended) {
            throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('catalog.shopSuspended') })
        }

        const category = await this.catalogRepository.findCategoryById(input.categoryId)
        if (!category) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.categoryNotFound') })
        }

        const product = await this.catalogRepository.createProduct({
            shopId: sellerProfile.id,
            input,
            actorId: userId,
        })

        return toProductDetail(product)
    }

    async getMyProducts(userId: string, query: ProductQuery): Promise<ProductListResult> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            return { items: [], totalItems: 0, page: 1, pageSize: 10, totalPages: 0 }
        }

        return this.catalogRepository.findProductsByShop(sellerProfile.id, query)
    }

    async getMyProductDetail(userId: string, productId: string): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('catalog.sellerProfileRequired') })
        }

        const product = await this.catalogRepository.findProductById(productId)
        if (!product || product.shopId !== sellerProfile.id) {
            // Luật #8: tài nguyên ngoài phạm vi trả 404, không 403
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFound') })
        }

        return toProductDetail(product)
    }

    async sellerSuspendProduct(userId: string, productId: string, input: SuspendProductInput): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('catalog.noPermissionProduct') })
        }

        const existing = await this.catalogRepository.findProductById(productId)
        if (!existing || existing.shopId !== sellerProfile.id) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFound') })
        }

        const updated = await this.catalogRepository.suspendProduct({
            productId,
            actorId: userId,
            reason: input.reason,
        })

        if (!updated) {
            throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.cannotSuspend') })
        }

        return toProductDetail(updated)
    }

    async sellerRestoreProduct(userId: string, productId: string): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('catalog.noPermissionProduct') })
        }

        const existing = await this.catalogRepository.findProductById(productId)
        if (!existing || existing.shopId !== sellerProfile.id) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFound') })
        }

        const updated = await this.catalogRepository.restoreProduct({
            productId,
            actorId: userId,
        })

        if (!updated) {
            throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.cannotRestore') })
        }

        return toProductDetail(updated)
    }

    async sellerDeleteProduct(userId: string, productId: string): Promise<{ success: boolean }> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('catalog.noPermissionProduct') })
        }

        const existing = await this.catalogRepository.findProductById(productId)
        if (!existing || existing.shopId !== sellerProfile.id) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFound') })
        }

        const success = await this.catalogRepository.deleteProduct({
            productId,
            actorId: userId,
        })

        return { success }
    }

    // ===== Admin Commands & Queries =====

    async listAdminProducts(query: ProductQuery): Promise<ProductListResult> {
        return this.catalogRepository.findAllProductsAdmin(query)
    }

    async getAdminProductDetail(productId: string): Promise<ProductDetail> {
        const product = await this.catalogRepository.findProductById(productId)
        if (!product) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFound') })
        }
        return toProductDetail(product)
    }

    async adminReviewProduct(productId: string, adminId: string, input: ReviewProductInput): Promise<ProductDetail> {
        const updated = await this.catalogRepository.reviewProduct({
            productId,
            reviewedById: adminId,
            action: input.action,
            reviewNote: input.reviewNote,
        })

        if (!updated) {
            throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.productNotPending') })
        }

        return toProductDetail(updated)
    }

    async adminSuspendProduct(productId: string, adminId: string, input: SuspendProductInput): Promise<ProductDetail> {
        const updated = await this.catalogRepository.suspendProduct({
            productId,
            actorId: adminId,
            reason: input.reason,
        })

        if (!updated) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFoundSuspend') })
        }

        return toProductDetail(updated)
    }

    async adminRestoreProduct(productId: string, adminId: string): Promise<ProductDetail> {
        const updated = await this.catalogRepository.restoreProduct({
            productId,
            actorId: adminId,
        })

        if (!updated) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFoundRestore') })
        }

        return toProductDetail(updated)
    }

    async sellerUpdateProduct(userId: string, productId: string, input: UpdateProductInput): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ApiError('FORBIDDEN', { messageKey: apiMessageKey('catalog.noPermissionProduct') })
        }

        const existing = await this.catalogRepository.findProductById(productId)
        if (!existing || existing.shopId !== sellerProfile.id) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFound') })
        }

        if (input.categoryId) {
            const category = await this.catalogRepository.findCategoryById(input.categoryId)
            if (!category) {
                throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.categoryNotFound') })
            }
        }

        const updated = await this.catalogRepository.updateProduct({
            productId,
            actorId: userId,
            input,
            isSeller: true,
        })

        if (!updated) {
            throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.cannotUpdate') })
        }

        return toProductDetail(updated)
    }

    async adminUpdateProduct(productId: string, adminId: string, input: UpdateProductInput): Promise<ProductDetail> {
        if (input.categoryId) {
            const category = await this.catalogRepository.findCategoryById(input.categoryId)
            if (!category) {
                throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.categoryNotFound') })
            }
        }

        const updated = await this.catalogRepository.updateProduct({
            productId,
            actorId: adminId,
            input,
            isSeller: false,
        })

        if (!updated) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFound') })
        }

        return toProductDetail(updated)
    }

    async adminDeleteProduct(productId: string, adminId: string): Promise<{ success: boolean }> {
        const success = await this.catalogRepository.deleteProduct({
            productId,
            actorId: adminId,
        })

        if (!success) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.productNotFoundDelete') })
        }

        return { success }
    }

    // ===== Admin Category Commands & Queries =====

    async listAdminCategories(query: CategoryQuery): Promise<CategoryListResult> {
        const page = query.page ?? 1
        const pageSize = query.pageSize ?? 50
        const [categories, totalItems] = await Promise.all([
            this.catalogRepository.findAdminCategories(query),
            this.catalogRepository.countAdminCategories(query),
        ])

        return {
            items: categories.map((c) => toCategoryItem(c)),
            totalItems,
            page,
            pageSize,
            totalPages: Math.ceil(totalItems / pageSize) || 1,
        }
    }

    async getAdminCategoryDetail(id: string): Promise<CategoryItem> {
        const category = await this.catalogRepository.findCategoryById(id)
        if (!category) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.categoryNotFound') })
        }
        return toCategoryItem(category)
    }

    async createCategory(input: CreateCategoryInput, _actorId: string): Promise<CategoryItem> {
        const slug = input.slug?.trim() || slugifyString(input.name)

        const existingSlug = await this.catalogRepository.findCategoryBySlug(slug)
        if (existingSlug) {
            throw new ApiError('BAD_REQUEST', {
                messageKey: apiMessageKey('catalog.slugExists'),
                messageParams: { slug },
            })
        }

        if (input.parentId) {
            const parent = await this.catalogRepository.findCategoryById(input.parentId)
            if (!parent) {
                throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.parentCategoryNotFound') })
            }
        }

        const created = await this.catalogRepository.createCategory({
            name: input.name,
            slug,
            parentId: input.parentId ?? null,
            image: input.image ?? null,
            description: input.description ?? null,
            position: input.position ?? 0,
            isActive: input.isActive ?? true,
        })

        if (this.redisService) {
            await this.redisService.del('cache:categories:tree')
        }

        return toCategoryItem(created)
    }

    async updateCategory(id: string, input: UpdateCategoryInput, _actorId: string): Promise<CategoryItem> {
        const existing = await this.catalogRepository.findCategoryById(id)
        if (!existing) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.categoryNotFoundUpdate') })
        }

        if (input.parentId !== undefined && input.parentId !== null) {
            if (input.parentId === id) {
                throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.categoryCannotBeOwnParent') })
            }
            const parent = await this.catalogRepository.findCategoryById(input.parentId)
            if (!parent) {
                throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.parentCategoryNotFound') })
            }
        }

        const slug = input.slug?.trim()
        if (slug) {
            const existingSlug = await this.catalogRepository.findCategoryBySlug(slug)
            if (existingSlug && existingSlug.id !== id) {
                throw new ApiError('BAD_REQUEST', {
                    messageKey: apiMessageKey('catalog.slugExists'),
                    messageParams: { slug },
                })
            }
        }

        const updated = await this.catalogRepository.updateCategory(id, {
            name: input.name,
            slug,
            parentId: input.parentId,
            image: input.image,
            description: input.description,
            position: input.position,
            isActive: input.isActive,
        })

        if (this.redisService) {
            await this.redisService.del('cache:categories:tree')
        }

        return toCategoryItem(updated)
    }

    async deleteCategory(id: string, _actorId: string): Promise<{ success: boolean }> {
        const existing = await this.catalogRepository.findCategoryById(id)
        if (!existing) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('catalog.categoryNotFoundDelete') })
        }

        if (existing.children && existing.children.length > 0) {
            throw new ApiError('BAD_REQUEST', { messageKey: apiMessageKey('catalog.categoryHasChildren') })
        }

        if (existing._count?.products && existing._count.products > 0) {
            throw new ApiError('BAD_REQUEST', {
                messageKey: apiMessageKey('catalog.categoryHasProducts'),
                messageParams: { count: String(existing._count.products) },
            })
        }

        await this.catalogRepository.deleteCategory(id)

        if (this.redisService) {
            await this.redisService.del('cache:categories:tree')
        }

        return { success: true }
    }
}
