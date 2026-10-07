import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { ResourceStatus } from '@timmyhub/contracts'
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
    ) {}

    // ===== Infrastructure =====
    ping(): PingResponse {
        this.eventEmitter.emit(CATALOG_EVENT.PRODUCT_PINGED)
        return { module: 'catalog', status: 'ok' }
    }

    countProducts(): Promise<number> {
        return this.catalogRepository.countProducts()
    }

    // ===== Public Queries =====

    async getCategories(): Promise<CategorySummary[]> {
        const categories = await this.catalogRepository.findCategories()
        // Chỉ lấy các danh mục gốc (parentId === null) với children lồng bên trong
        const rootCategories = categories.filter((c) => !c.parentId)
        return rootCategories.map((c) => toCategorySummary(c))
    }

    async listPublicProducts(query: ProductQuery): Promise<ProductListResult> {
        return this.catalogRepository.findPublicProducts(query)
    }

    async getPublicProductDetail(idOrSlug: string): Promise<ProductDetail> {
        const product = await this.catalogRepository.findPublicProductByIdOrSlug(idOrSlug)
        if (!product) {
            throw new NotFoundException('Không tìm thấy sản phẩm hoặc sản phẩm chưa khả dụng.')
        }
        return toProductDetail(product)
    }

    // ===== Seller Commands & Queries =====

    async createProduct(userId: string, input: CreateProductInput): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile || sellerProfile.status !== ResourceStatus.APPROVED) {
            throw new ForbiddenException('Bạn chưa có cửa hàng đã được duyệt để đăng sản phẩm.')
        }

        if (sellerProfile.isSuspended) {
            throw new ForbiddenException('Cửa hàng của bạn hiện đang bị tạm ngưng hoạt động.')
        }

        const category = await this.catalogRepository.findCategoryById(input.categoryId)
        if (!category) {
            throw new NotFoundException('Danh mục sản phẩm không tồn tại.')
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
            throw new ForbiddenException('Bạn chưa đăng ký cửa hàng người bán.')
        }

        const product = await this.catalogRepository.findProductById(productId)
        if (!product || product.shopId !== sellerProfile.id) {
            throw new NotFoundException('Không tìm thấy sản phẩm.')
        }

        return toProductDetail(product)
    }

    async sellerSuspendProduct(userId: string, productId: string, input: SuspendProductInput): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ForbiddenException('Bạn không có quyền thao tác trên sản phẩm này.')
        }

        const existing = await this.catalogRepository.findProductById(productId)
        if (!existing || existing.shopId !== sellerProfile.id) {
            throw new NotFoundException('Không tìm thấy sản phẩm.')
        }

        const updated = await this.catalogRepository.suspendProduct({
            productId,
            actorId: userId,
            reason: input.reason,
        })

        if (!updated) {
            throw new BadRequestException('Không thể tạm ngưng sản phẩm này.')
        }

        return toProductDetail(updated)
    }

    async sellerRestoreProduct(userId: string, productId: string): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ForbiddenException('Bạn không có quyền thao tác trên sản phẩm này.')
        }

        const existing = await this.catalogRepository.findProductById(productId)
        if (!existing || existing.shopId !== sellerProfile.id) {
            throw new NotFoundException('Không tìm thấy sản phẩm.')
        }

        const updated = await this.catalogRepository.restoreProduct({
            productId,
            actorId: userId,
        })

        if (!updated) {
            throw new BadRequestException('Không thể khôi phục sản phẩm này.')
        }

        return toProductDetail(updated)
    }

    async sellerDeleteProduct(userId: string, productId: string): Promise<{ success: boolean }> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ForbiddenException('Bạn không có quyền thao tác trên sản phẩm này.')
        }

        const existing = await this.catalogRepository.findProductById(productId)
        if (!existing || existing.shopId !== sellerProfile.id) {
            throw new NotFoundException('Không tìm thấy sản phẩm.')
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
            throw new NotFoundException('Không tìm thấy sản phẩm.')
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
            throw new BadRequestException('Sản phẩm không ở trạng thái chờ duyệt hoặc đã được xử lý bởi admin khác.')
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
            throw new NotFoundException('Không tìm thấy sản phẩm để tạm ngưng.')
        }

        return toProductDetail(updated)
    }

    async adminRestoreProduct(productId: string, adminId: string): Promise<ProductDetail> {
        const updated = await this.catalogRepository.restoreProduct({
            productId,
            actorId: adminId,
        })

        if (!updated) {
            throw new NotFoundException('Không tìm thấy sản phẩm để khôi phục.')
        }

        return toProductDetail(updated)
    }

    async sellerUpdateProduct(userId: string, productId: string, input: UpdateProductInput): Promise<ProductDetail> {
        const sellerProfile = await this.sellerRepository.findProfileByUserId(userId)
        if (!sellerProfile) {
            throw new ForbiddenException('Bạn không có quyền thao tác trên sản phẩm này.')
        }

        const existing = await this.catalogRepository.findProductById(productId)
        if (!existing || existing.shopId !== sellerProfile.id) {
            throw new NotFoundException('Không tìm thấy sản phẩm.')
        }

        if (input.categoryId) {
            const category = await this.catalogRepository.findCategoryById(input.categoryId)
            if (!category) {
                throw new BadRequestException('Danh mục ngành hàng không tồn tại.')
            }
        }

        const updated = await this.catalogRepository.updateProduct({
            productId,
            actorId: userId,
            input,
            isSeller: true,
        })

        if (!updated) {
            throw new BadRequestException('Không thể cập nhật sản phẩm.')
        }

        return toProductDetail(updated)
    }

    async adminUpdateProduct(productId: string, adminId: string, input: UpdateProductInput): Promise<ProductDetail> {
        if (input.categoryId) {
            const category = await this.catalogRepository.findCategoryById(input.categoryId)
            if (!category) {
                throw new BadRequestException('Danh mục ngành hàng không tồn tại.')
            }
        }

        const updated = await this.catalogRepository.updateProduct({
            productId,
            actorId: adminId,
            input,
            isSeller: false,
        })

        if (!updated) {
            throw new NotFoundException('Không tìm thấy sản phẩm.')
        }

        return toProductDetail(updated)
    }

    async adminDeleteProduct(productId: string, adminId: string): Promise<{ success: boolean }> {
        const success = await this.catalogRepository.deleteProduct({
            productId,
            actorId: adminId,
        })

        if (!success) {
            throw new NotFoundException('Không tìm thấy sản phẩm để xoá.')
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
            throw new NotFoundException('Không tìm thấy danh mục.')
        }
        return toCategoryItem(category)
    }

    async createCategory(input: CreateCategoryInput, _actorId: string): Promise<CategoryItem> {
        const slug = input.slug?.trim() || slugifyString(input.name)

        const existingSlug = await this.catalogRepository.findCategoryBySlug(slug)
        if (existingSlug) {
            throw new BadRequestException(`Đường dẫn slug "${slug}" đã tồn tại. Vui lòng chọn slug khác.`)
        }

        if (input.parentId) {
            const parent = await this.catalogRepository.findCategoryById(input.parentId)
            if (!parent) {
                throw new BadRequestException('Danh mục cha không tồn tại.')
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

        return toCategoryItem(created)
    }

    async updateCategory(id: string, input: UpdateCategoryInput, _actorId: string): Promise<CategoryItem> {
        const existing = await this.catalogRepository.findCategoryById(id)
        if (!existing) {
            throw new NotFoundException('Không tìm thấy danh mục để cập nhật.')
        }

        if (input.parentId !== undefined && input.parentId !== null) {
            if (input.parentId === id) {
                throw new BadRequestException('Danh mục không thể làm cha của chính nó.')
            }
            const parent = await this.catalogRepository.findCategoryById(input.parentId)
            if (!parent) {
                throw new BadRequestException('Danh mục cha không tồn tại.')
            }
        }

        const slug = input.slug?.trim()
        if (slug) {
            const existingSlug = await this.catalogRepository.findCategoryBySlug(slug)
            if (existingSlug && existingSlug.id !== id) {
                throw new BadRequestException(`Đường dẫn slug "${slug}" đã tồn tại. Vui lòng chọn slug khác.`)
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

        return toCategoryItem(updated)
    }

    async deleteCategory(id: string, _actorId: string): Promise<{ success: boolean }> {
        const existing = await this.catalogRepository.findCategoryById(id)
        if (!existing) {
            throw new NotFoundException('Không tìm thấy danh mục để xoá.')
        }

        if (existing.children && existing.children.length > 0) {
            throw new BadRequestException('Không thể xoá danh mục vì vẫn còn chứa danh mục con.')
        }

        if (existing._count?.products && existing._count.products > 0) {
            throw new BadRequestException(
                `Không thể xoá danh mục vì đang có ${existing._count.products} sản phẩm liên kết.`,
            )
        }

        await this.catalogRepository.deleteCategory(id)
        return { success: true }
    }
}
