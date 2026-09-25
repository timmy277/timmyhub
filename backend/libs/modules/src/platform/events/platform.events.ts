import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { PLATFORM_EVENT } from '../platform.constants'

@Injectable()
export class PlatformEventsListener {
    // ===== Dependencies =====
    private readonly logger = new Logger(PlatformEventsListener.name)

    // ===== Event handlers =====
    @OnEvent(PLATFORM_EVENT.HEALTH_CHECKED)
    handleHealthChecked(): void {
        this.logger.debug(`Nhận event ${PLATFORM_EVENT.HEALTH_CHECKED}`)
    }
}
