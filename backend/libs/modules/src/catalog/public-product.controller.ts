import { Controller, Get, Param, Query } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type { CategorySummary, ProductDetail, ProductListResult, ProductQuery } from '@timmyhub/contracts'
import { ProductQuerySchema } from '@timmyhub/contracts'
import { Public } from '@timmyhub/modules/platform/auth'

import { CatalogService } from './catalog.service'

@Controller('v1/products')
export class PublicProductController {
    // ===== Dependencies =====
    constructor(private readonly catalogService: CatalogService) {}

    @Public()
    @Get()
    listProducts(@Query(new ZodValidationPipe(ProductQuerySchema)) query: ProductQuery): Promise<ProductListResult> {
        return this.catalogService.listPublicProducts(query)
    }

    @Public()
    @Get(':idOrSlug')
    getProductDetail(@Param('idOrSlug') idOrSlug: string): Promise<ProductDetail> {
        return this.catalogService.getPublicProductDetail(idOrSlug)
    }
}

@Controller('v1/categories')
export class CategoriesController {
    // ===== Dependencies =====
    constructor(private readonly catalogService: CatalogService) {}

    @Public()
    @Get()
    getCategories(): Promise<CategorySummary[]> {
        return this.catalogService.getCategories()
    }
}
