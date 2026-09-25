import { Controller, Get } from '@nestjs/common'

import { Public } from '@timmyhub/modules/platform/auth'

import type { PingResponse } from './dto/index'
import { IDENTITY_ROUTE } from './identity.constants'
import { IdentityService } from './identity.service'

@Controller(IDENTITY_ROUTE.ROOT)
export class IdentityController {
    // ===== Dependencies =====
    constructor(private readonly identityService: IdentityService) {}

    // ===== Queries =====
    @Public()
    @Get(IDENTITY_ROUTE.PING)
    ping(): PingResponse {
        return this.identityService.ping()
    }
}
