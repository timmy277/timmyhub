import { Module } from '@nestjs/common'
import { SellerModule } from '@timmyhub/modules/seller'
import { PrismaModule } from '@timmyhub/prisma'

import { AdminCategoryController } from './admin-category.controller'
import { AdminProductController } from './admin-product.controller'
import { CatalogController } from './catalog.controller'
import { CatalogRepository } from './catalog.repository'
import { CatalogService } from './catalog.service'
import { CatalogEventsListener } from './events/index'
import { CategoriesController, PublicProductController } from './public-product.controller'
import { SellerProductController } from './seller-product.controller'

@Module({
    imports: [PrismaModule, SellerModule],
    controllers: [
        CatalogController,
        PublicProductController,
        CategoriesController,
        SellerProductController,
        AdminProductController,
        AdminCategoryController,
    ],
    providers: [CatalogService, CatalogRepository, CatalogEventsListener],
    exports: [CatalogService, CatalogRepository],
})
export class CatalogModule {}
