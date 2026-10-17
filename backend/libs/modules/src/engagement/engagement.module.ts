import { Module } from '@nestjs/common'
import { PrismaModule } from '@timmyhub/prisma'

import { EngagementController } from './engagement.controller'
import { EngagementRepository } from './engagement.repository'
import { EngagementService } from './engagement.service'
import { WishlistController } from './wishlist.controller'

@Module({
    imports: [PrismaModule],
    controllers: [EngagementController, WishlistController],
    providers: [EngagementRepository, EngagementService],
    exports: [EngagementService, EngagementRepository],
})
export class EngagementModule {}
