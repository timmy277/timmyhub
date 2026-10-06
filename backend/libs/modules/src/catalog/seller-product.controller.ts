import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CreateProductInput,
    ProductDetail,
    ProductListResult,
    ProductQuery,
    SuspendProductInput,
    UpdateProductInput,
} from '@timmyhub/contracts'
import {
    CreateProductInputSchema,
    ProductQuerySchema,
    SuspendProductSchema,
    UpdateProductInputSchema,
} from '@timmyhub/contracts'
import { CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { CatalogService } from './catalog.service'

@Controller('v1/seller/products')
export class SellerProductController {
    // ===== Dependencies =====
    constructor(private readonly catalogService: CatalogService) {}

    // ===== Commands =====

    @Permissions('catalog:products:create')
    @Post()
    createProduct(
        @Body(new ZodValidationPipe(CreateProductInputSchema)) body: CreateProductInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<ProductDetail> {
        return this.catalogService.createProduct(actor.id, body)
    }

    @Permissions('catalog:products:update')
    @Patch(':id')
    updateProduct(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateProductInputSchema)) body: UpdateProductInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<ProductDetail> {
        return this.catalogService.sellerUpdateProduct(actor.id, id, body)
    }

    @Permissions('catalog:products:suspend')
    @Post(':id/suspend')
    suspendProduct(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(SuspendProductSchema)) body: SuspendProductInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<ProductDetail> {
        return this.catalogService.sellerSuspendProduct(actor.id, id, body)
    }

    @Permissions('catalog:products:restore')
    @Post(':id/restore')
    restoreProduct(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<ProductDetail> {
        return this.catalogService.sellerRestoreProduct(actor.id, id)
    }

    @Permissions('catalog:products:delete')
    @Delete(':id')
    deleteProduct(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.catalogService.sellerDeleteProduct(actor.id, id)
    }

    // ===== Queries =====

    @Permissions('catalog:products:read')
    @Get()
    getMyProducts(
        @Query(new ZodValidationPipe(ProductQuerySchema)) query: ProductQuery,
        @CurrentUser() actor: AuthUser,
    ): Promise<ProductListResult> {
        return this.catalogService.getMyProducts(actor.id, query)
    }

    @Permissions('catalog:products:read')
    @Get(':id')
    getMyProductDetail(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<ProductDetail> {
        return this.catalogService.getMyProductDetail(actor.id, id)
    }
}
