import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { CatalogModule } from '@timmyhub/modules/catalog'
import { IdentityModule } from '@timmyhub/modules/identity'
import { MediaModule } from '@timmyhub/modules/media'
import { PlatformModule } from '@timmyhub/modules/platform'
import { SellerModule } from '@timmyhub/modules/seller'
import { CartModule } from '@timmyhub/modules/cart'
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
    ],
})
export class AppModule {}
