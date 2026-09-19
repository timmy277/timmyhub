import { Controller, Get } from '@nestjs/common'

import { CatalogService } from './catalog.service'
import type { PingResponse } from './dto/ping.dto'

@Controller('catalog')
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) {}

    @Get('ping')
    ping(): PingResponse {
        return this.catalogService.ping()
    }
}
