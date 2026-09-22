import { Controller, Get } from '@nestjs/common'

import { Public } from '@timmyhub/modules/platform/auth'
import { IdentityService } from './identity.service'
import type { PingResponse } from './dto/ping.dto'

@Controller('identity')
export class IdentityController {
    constructor(private readonly identityService: IdentityService) {}

    @Public()
    @Get('ping')
    ping(): PingResponse {
        return this.identityService.ping()
    }
}
