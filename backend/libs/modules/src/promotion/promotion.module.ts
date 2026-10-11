import { Module } from '@nestjs/common'
import { PrismaModule } from '@timmyhub/prisma'

import { PromotionController } from './promotion.controller'
import { PromotionService } from './promotion.service'

@Module({
    imports: [PrismaModule],
    controllers: [PromotionController],
    providers: [PromotionService],
    exports: [PromotionService],
})
export class PromotionModule {}
