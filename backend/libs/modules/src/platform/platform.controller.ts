import { Controller, Get } from '@nestjs/common'

import { Public } from './auth/decorators/index'
import { PlatformService } from './platform.service'
import type { HealthResponse } from './dto/health.dto'

@Controller('health')
export class PlatformController {
    constructor(private readonly platformService: PlatformService) {}

    @Public()
    @Get()
    check(): HealthResponse {
        return this.platformService.checkHealth()
    }
}
