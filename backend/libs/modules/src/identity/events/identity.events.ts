import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { IDENTITY_EVENT } from '../identity.constants'

// Ví dụ tối giản một listener nội bộ (EventEmitter2) theo ADR-0015 — không cần outbox vì hệ quả chỉ ở trong process.
@Injectable()
export class IdentityEventsListener {
    // ===== Dependencies =====
    private readonly logger = new Logger(IdentityEventsListener.name)

    // ===== Event handlers =====
    @OnEvent(IDENTITY_EVENT.USER_PINGED)
    handleUserPinged(): void {
        this.logger.debug(`Nhận event ${IDENTITY_EVENT.USER_PINGED}`)
    }

    // Chỉ log userId — email là dữ liệu cá nhân, không được ghi ra log (security.md).
    @OnEvent(IDENTITY_EVENT.USER_REGISTERED)
    handleUserRegistered(payload: { userId: string }): void {
        this.logger.log(`User ${payload.userId} vừa đăng ký.`)
    }

    @OnEvent(IDENTITY_EVENT.USER_LOCKED)
    handleUserLocked(payload: { userId: string; lockedUntil: Date; reason: string }): void {
        this.logger.warn(
            `User ${payload.userId} bị tạm khoá đến ${payload.lockedUntil.toISOString()} (${payload.reason}).`,
        )
    }
}
