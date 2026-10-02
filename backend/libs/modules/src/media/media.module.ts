import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@timmyhub/prisma'

import { MediaController } from './media.controller'
import { MediaRepository } from './media.repository'
import { MediaService } from './media.service'
import { StorageService } from './storage.service'

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [MediaController],
    providers: [MediaService, MediaRepository, StorageService],
    exports: [MediaService, MediaRepository, StorageService],
})
export class MediaModule {}
