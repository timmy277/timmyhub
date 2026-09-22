import { Controller, Get } from '@nestjs/common'

import { Public } from '@timmyhub/modules/platform/auth'
import { CatalogService } from './catalog.service'
import type { PingResponse } from './dto/ping.dto'

@Controller('catalog')
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) {}

    @Public()
    @Get('ping')
    ping(): PingResponse {
        return this.catalogService.ping()
    }
}
