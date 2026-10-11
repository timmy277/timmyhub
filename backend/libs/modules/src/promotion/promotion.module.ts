import { Module } from '@nestjs/common'
import { PrismaModule } from '@timmyhub/prisma'

import { PromotionPublicController } from './promotion-public.controller'
import { PromotionController } from './promotion.controller'
import { PromotionService } from './promotion.service'

@Module({
    imports: [PrismaModule],
    controllers: [PromotionController, PromotionPublicController],
    providers: [PromotionService],
    exports: [PromotionService],
})
export class PromotionModule {}
