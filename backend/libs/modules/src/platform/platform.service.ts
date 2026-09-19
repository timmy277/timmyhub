import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { PLATFORM_HEALTH_CHECKED_EVENT } from './events/platform.events'
import type { HealthResponse } from './dto/health.dto'

// Module platform giữ biên HTTP/WS (ADR-0015) — không sở hữu dữ liệu nghiệp vụ nên không có repository/Prisma.
@Injectable()
export class PlatformService {
    constructor(private readonly eventEmitter: EventEmitter2) {}

    checkHealth(): HealthResponse {
        this.eventEmitter.emit(PLATFORM_HEALTH_CHECKED_EVENT)
        return { status: 'ok' }
    }
}
