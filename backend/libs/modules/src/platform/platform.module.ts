import { Module } from '@nestjs/common'

import { PlatformEventsListener } from './events/platform.events'
import { PlatformController } from './platform.controller'
import { PlatformService } from './platform.service'

@Module({
    controllers: [PlatformController],
    providers: [PlatformService, PlatformEventsListener],
    exports: [PlatformService],
})
export class PlatformModule {}
