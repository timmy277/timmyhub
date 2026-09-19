import { Controller, Get } from '@nestjs/common'

import { IdentityService } from './identity.service'
import type { PingResponse } from './dto/ping.dto'

@Controller('identity')
export class IdentityController {
    constructor(private readonly identityService: IdentityService) {}

    @Get('ping')
    ping(): PingResponse {
        return this.identityService.ping()
    }
}
