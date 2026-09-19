import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

export const PLATFORM_HEALTH_CHECKED_EVENT = 'platform.health.checked'

@Injectable()
export class PlatformEventsListener {
    private readonly logger = new Logger(PlatformEventsListener.name)

    @OnEvent(PLATFORM_HEALTH_CHECKED_EVENT)
    handleHealthChecked(): void {
        this.logger.debug(`Nhận event ${PLATFORM_HEALTH_CHECKED_EVENT}`)
    }
}
