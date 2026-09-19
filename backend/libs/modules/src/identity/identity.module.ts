import { Module } from '@nestjs/common'

import { IdentityEventsListener } from './events/identity.events'
import { IdentityController } from './identity.controller'
import { IdentityRepository } from './identity.repository'
import { IdentityService } from './identity.service'

@Module({
    controllers: [IdentityController],
    providers: [IdentityService, IdentityRepository, IdentityEventsListener],
    exports: [IdentityService],
})
export class IdentityModule {}
