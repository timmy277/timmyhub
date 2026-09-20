import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

export const IDENTITY_USER_PINGED_EVENT = 'identity.user.pinged'
export const IDENTITY_USER_REGISTERED_EVENT = 'identity.user.registered'
export const IDENTITY_USER_LOCKED_EVENT = 'identity.user.locked'

// Ví dụ tối giản một listener nội bộ (EventEmitter2) theo ADR-0015 — không cần outbox vì hệ quả chỉ ở trong process.
@Injectable()
export class IdentityEventsListener {
    private readonly logger = new Logger(IdentityEventsListener.name)

    @OnEvent(IDENTITY_USER_PINGED_EVENT)
    handleUserPinged(): void {
        this.logger.debug(`Nhận event ${IDENTITY_USER_PINGED_EVENT}`)
    }

    @OnEvent(IDENTITY_USER_REGISTERED_EVENT)
    handleUserRegistered(payload: { userId: string; email: string }): void {
        this.logger.log(`User ${payload.userId} (${payload.email}) vừa đăng ký.`)
    }

    @OnEvent(IDENTITY_USER_LOCKED_EVENT)
    handleUserLocked(payload: { userId: string; lockedUntil: Date; reason: string }): void {
        this.logger.warn(
            `User ${payload.userId} bị tạm khoá đến ${payload.lockedUntil.toISOString()} (${payload.reason}).`,
        )
    }
}
