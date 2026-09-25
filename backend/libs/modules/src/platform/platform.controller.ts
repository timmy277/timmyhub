import { Controller, Get } from '@nestjs/common'

import { Public } from './auth/index'
import type { HealthResponse } from './dto/index'
import { PLATFORM_ROUTE } from './platform.constants'
import { PlatformService } from './platform.service'

@Controller(PLATFORM_ROUTE.HEALTH)
export class PlatformController {
    // ===== Dependencies =====
    constructor(private readonly platformService: PlatformService) {}

    // ===== Queries =====
    @Public()
    @Get()
    check(): HealthResponse {
        return this.platformService.checkHealth()
    }
}
