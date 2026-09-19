import { Controller, Get } from '@nestjs/common'

import { PlatformService } from './platform.service'
import type { HealthResponse } from './dto/health.dto'

@Controller('health')
export class PlatformController {
    constructor(private readonly platformService: PlatformService) {}

    @Get()
    check(): HealthResponse {
        return this.platformService.checkHealth()
    }
}
