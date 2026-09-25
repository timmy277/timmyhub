import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import type { HealthResponse } from './dto/index'
import { PLATFORM_EVENT } from './platform.constants'

// Module platform giữ biên HTTP/WS (ADR-0015) — không sở hữu dữ liệu nghiệp vụ nên không có repository/Prisma.
@Injectable()
export class PlatformService {
    // ===== Dependencies =====
    constructor(private readonly eventEmitter: EventEmitter2) {}

    // ===== Queries =====
    checkHealth(): HealthResponse {
        this.eventEmitter.emit(PLATFORM_EVENT.HEALTH_CHECKED)
        return { status: 'ok' }
    }
}
