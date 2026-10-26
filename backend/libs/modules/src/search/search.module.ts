import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { PrismaModule } from '@timmyhub/prisma'

import { SearchController } from './search.controller'
import { SearchService } from './search.service'

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [SearchController],
    providers: [SearchService],
    exports: [SearchService],
})
export class SearchModule {}
