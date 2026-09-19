import { Module } from '@nestjs/common'

import { CatalogController } from './catalog.controller'
import { CatalogRepository } from './catalog.repository'
import { CatalogService } from './catalog.service'
import { CatalogEventsListener } from './events/catalog.events'

@Module({
    controllers: [CatalogController],
    providers: [CatalogService, CatalogRepository, CatalogEventsListener],
    exports: [CatalogService],
})
export class CatalogModule {}
