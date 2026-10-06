import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    ProductDetail,
    ProductListResult,
    ProductQuery,
    ReviewProductInput,
    SuspendProductInput,
    UpdateProductInput,
} from '@timmyhub/contracts'
import {
    ProductQuerySchema,
    ReviewProductSchema,
    SuspendProductSchema,
    UpdateProductInputSchema,
} from '@timmyhub/contracts'
import { CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { CatalogService } from './catalog.service'

@Controller('v1/admin/products')
export class AdminProductController {
    // ===== Dependencies =====
    constructor(private readonly catalogService: CatalogService) {}

    // ===== Queries =====

    @Permissions('catalog:products:list:any')
    @Get()
    listProducts(@Query(new ZodValidationPipe(ProductQuerySchema)) query: ProductQuery): Promise<ProductListResult> {
        return this.catalogService.listAdminProducts(query)
    }

    @Permissions('catalog:products:read:any')
    @Get(':id')
    getProductDetail(@Param('id') id: string): Promise<ProductDetail> {
        return this.catalogService.getAdminProductDetail(id)
    }

    // ===== Commands =====

    @Permissions('catalog:products:approve')
    @Post(':id/approve')
    approveProduct(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<ProductDetail> {
        return this.catalogService.adminReviewProduct(id, actor.id, { action: 'APPROVE' })
    }

    @Permissions('catalog:products:reject')
    @Post(':id/reject')
    rejectProduct(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(ReviewProductSchema)) body: ReviewProductInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<ProductDetail> {
        return this.catalogService.adminReviewProduct(id, actor.id, {
            action: 'REJECT',
            reviewNote: body.reviewNote,
        })
    }

    @Permissions('catalog:products:update:any')
    @Patch(':id')
    updateProduct(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateProductInputSchema)) body: UpdateProductInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<ProductDetail> {
        return this.catalogService.adminUpdateProduct(id, actor.id, body)
    }

    @Permissions('catalog:products:delete:any')
    @Delete(':id')
    deleteProduct(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.catalogService.adminDeleteProduct(id, actor.id)
    }

    @Permissions('catalog:products:suspend:any')
    @Post(':id/suspend')
    suspendProduct(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(SuspendProductSchema)) body: SuspendProductInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<ProductDetail> {
        return this.catalogService.adminSuspendProduct(id, actor.id, body)
    }

    @Permissions('catalog:products:restore:any')
    @Post(':id/restore')
    restoreProduct(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<ProductDetail> {
        return this.catalogService.adminRestoreProduct(id, actor.id)
    }
}
