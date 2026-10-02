import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { CatalogModule } from '@timmyhub/modules/catalog'
import { IdentityModule } from '@timmyhub/modules/identity'
import { MediaModule } from '@timmyhub/modules/media'
import { PlatformModule } from '@timmyhub/modules/platform'
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
    ],
})
export class AppModule {}
