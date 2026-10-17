import { Module } from '@nestjs/common'
import { PrismaModule } from '@timmyhub/prisma'

import { ChatController } from './chat.controller'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'

@Module({
    imports: [PrismaModule],
    controllers: [ChatController],
    providers: [ChatService, ChatGateway],
    exports: [ChatService, ChatGateway],
})
export class ChatModule {}
