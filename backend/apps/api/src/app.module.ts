import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { CatalogModule } from '@timmyhub/modules/catalog'
import { IdentityModule } from '@timmyhub/modules/identity'
import { MediaModule } from '@timmyhub/modules/media'
import { PlatformModule } from '@timmyhub/modules/platform'
import { SellerModule } from '@timmyhub/modules/seller'
import { CartModule } from '@timmyhub/modules/cart'
import { OrderModule } from '@timmyhub/modules/order'
import { PromotionModule } from '@timmyhub/modules/promotion'
import { EngagementModule } from '@timmyhub/modules/engagement'
import { NotificationModule } from '@timmyhub/modules/notification'
import { ChatModule } from '@timmyhub/modules/chat'
import { PrismaModule } from '@timmyhub/prisma'

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        PrismaModule,
        PlatformModule,
        IdentityModule,
        CatalogModule,
        MediaModule,
        SellerModule,
        CartModule,
        OrderModule,
        PromotionModule,
        EngagementModule,
        NotificationModule,
        ChatModule,
    ],
})
export class AppModule {}
