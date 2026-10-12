import { Module } from '@nestjs/common'
import { PrismaModule } from '@timmyhub/prisma'

import { EngagementController } from './engagement.controller'
import { EngagementRepository } from './engagement.repository'
import { EngagementService } from './engagement.service'

@Module({
    imports: [PrismaModule],
    controllers: [EngagementController],
    providers: [EngagementRepository, EngagementService],
    exports: [EngagementService, EngagementRepository],
})
export class EngagementModule {}
