import { Module } from '@nestjs/common'
import { PrismaModule } from '@timmyhub/prisma'

import { ContentFeedController, ContentSellerController } from './content.controller'
import { ContentRepository } from './content.repository'
import { ContentService } from './content.service'
import { MediaQueueService } from './media-queue.service'
import { VideoTranscodeService } from './video-transcode.service'

@Module({
    imports: [PrismaModule],
    controllers: [ContentFeedController, ContentSellerController],
    providers: [ContentRepository, ContentService, VideoTranscodeService, MediaQueueService],
    exports: [ContentService, ContentRepository, VideoTranscodeService, MediaQueueService],
})
export class ContentModule {}
