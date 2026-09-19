import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

export const IDENTITY_USER_PINGED_EVENT = 'identity.user.pinged'

// Ví dụ tối giản một listener nội bộ (EventEmitter2) theo ADR-0015 — không cần outbox vì hệ quả chỉ ở trong process.
@Injectable()
export class IdentityEventsListener {
    private readonly logger = new Logger(IdentityEventsListener.name)

    @OnEvent(IDENTITY_USER_PINGED_EVENT)
    handleUserPinged(): void {
        this.logger.debug(`Nhận event ${IDENTITY_USER_PINGED_EVENT}`)
    }
}
