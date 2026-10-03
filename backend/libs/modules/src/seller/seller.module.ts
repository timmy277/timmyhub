import { Module } from '@nestjs/common'
import { PrismaModule } from '@timmyhub/prisma'

import { AdminSellerController } from './admin-seller.controller'
import { PublicShopsController, SellerController } from './seller.controller'
import { SellerRepository } from './seller.repository'
import { SellerService } from './seller.service'

@Module({
    imports: [PrismaModule],
    controllers: [SellerController, PublicShopsController, AdminSellerController],
    providers: [SellerService, SellerRepository],
    exports: [SellerService, SellerRepository],
})
export class SellerModule {}
