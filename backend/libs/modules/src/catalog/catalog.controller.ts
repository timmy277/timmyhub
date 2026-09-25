import { Controller, Get } from '@nestjs/common'

import { Public } from '@timmyhub/modules/platform/auth'

import { CATALOG_ROUTE } from './catalog.constants'
import { CatalogService } from './catalog.service'
import type { PingResponse } from './dto/index'

@Controller(CATALOG_ROUTE.ROOT)
export class CatalogController {
    // ===== Dependencies =====
    constructor(private readonly catalogService: CatalogService) {}

    // ===== Queries =====
    @Public()
    @Get(CATALOG_ROUTE.PING)
    ping(): PingResponse {
        return this.catalogService.ping()
    }
}
