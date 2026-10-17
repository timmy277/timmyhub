import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type {
    ChatMessageDto,
    ChatMessageListResponseDto,
    ConversationDto,
    ConversationListResponseDto,
    CreateConversationInput,
    SendChatMessageInput,
} from '@timmyhub/contracts'
import { CreateConversationSchema, SendChatMessageSchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser } from '@timmyhub/modules/platform/auth'

import { CHAT_ROUTE } from './chat.constants'
import { ChatService } from './chat.service'

@Controller(CHAT_ROUTE.ROOT)
export class ChatController {
    // ===== Dependencies =====
    constructor(private readonly chatService: ChatService) {}

    // ===== Queries =====

    @AuthenticatedOnly()
    @Get(CHAT_ROUTE.CONVERSATIONS)
    getConversations(@CurrentUser() actor: AuthUser): Promise<ConversationListResponseDto> {
        return this.chatService.getConversations(actor.id)
    }

    @AuthenticatedOnly()
    @Get(CHAT_ROUTE.CONVERSATION_DETAIL)
    getConversationDetail(
        @Param('id') id: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<ConversationDto> {
        return this.chatService.getConversationDetail(actor.id, id)
    }

    @AuthenticatedOnly()
    @Get(CHAT_ROUTE.MESSAGES)
    getMessages(
        @Param('id') id: string,
        @CurrentUser() actor: AuthUser,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ): Promise<ChatMessageListResponseDto> {
        const parsedLimit = limit ? Number.parseInt(limit, 10) : 50
        return this.chatService.getMessages(actor.id, id, parsedLimit, cursor)
    }

    // ===== Commands =====

    @AuthenticatedOnly()
    @Post(CHAT_ROUTE.CONVERSATIONS)
    createConversation(
        @CurrentUser() actor: AuthUser,
        @Body(new ZodValidationPipe(CreateConversationSchema)) body: CreateConversationInput,
    ): Promise<ConversationDto> {
        return this.chatService.createConversation(actor.id, body)
    }

    @AuthenticatedOnly()
    @Post(CHAT_ROUTE.MESSAGES)
    sendMessageInConversation(
        @Param('id') id: string,
        @CurrentUser() actor: AuthUser,
        @Body(new ZodValidationPipe(SendChatMessageSchema)) body: SendChatMessageInput,
    ): Promise<ChatMessageDto> {
        return this.chatService.sendMessage(actor.id, {
            ...body,
            conversationId: id,
        })
    }

    @AuthenticatedOnly()
    @Post(CHAT_ROUTE.SEND)
    sendMessage(
        @CurrentUser() actor: AuthUser,
        @Body(new ZodValidationPipe(SendChatMessageSchema)) body: SendChatMessageInput,
    ): Promise<ChatMessageDto> {
        return this.chatService.sendMessage(actor.id, body)
    }

    @AuthenticatedOnly()
    @Patch(CHAT_ROUTE.READ)
    markConversationRead(
        @Param('id') id: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<{ success: boolean }> {
        return this.chatService.markConversationRead(actor.id, id)
    }
}
