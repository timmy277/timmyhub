import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import type { PingResponse } from './dto/index'
import { IDENTITY_EVENT } from './identity.constants'
import { IdentityRepository } from './identity.repository'

@Injectable()
export class IdentityService {
    // ===== Dependencies =====
    constructor(
        private readonly identityRepository: IdentityRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    // ===== Queries =====
    ping(): PingResponse {
        this.eventEmitter.emit(IDENTITY_EVENT.USER_PINGED)
        return { module: 'identity', status: 'ok' }
    }

    countUsers(): Promise<number> {
        return this.identityRepository.countUsers()
    }
}
