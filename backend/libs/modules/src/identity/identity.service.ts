import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { IDENTITY_USER_PINGED_EVENT } from './events/identity.events'
import { IdentityRepository } from './identity.repository'
import type { PingResponse } from './dto/ping.dto'

@Injectable()
export class IdentityService {
    constructor(
        private readonly identityRepository: IdentityRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    ping(): PingResponse {
        this.eventEmitter.emit(IDENTITY_USER_PINGED_EVENT)
        return { module: 'identity', status: 'ok' }
    }

    countUsers(): Promise<number> {
        return this.identityRepository.countUsers()
    }
}
