import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CreateNotificationInput,
    NotificationItemDto,
    NotificationListResponseDto,
    NotificationPreferencesDto,
    NotificationQueryDto,
    UnreadCountResponseDto,
    UpdateNotificationPreferencesInput,
} from '@timmyhub/contracts'
import {
    CreateNotificationInputSchema,
    NotificationPreferencesSchema,
    NotificationQuerySchema,
} from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser } from '@timmyhub/modules/platform/auth'

import { NOTIFICATION_ROUTE } from './notification.constants'
import { NotificationService } from './notification.service'

@Controller(NOTIFICATION_ROUTE.ROOT)
export class NotificationController {
    // ===== Dependencies =====
    constructor(private readonly service: NotificationService) {}

    // ===== Queries =====

    @AuthenticatedOnly()
    @Get()
    getMyNotifications(
        @CurrentUser() actor: AuthUser,
        @Query(new ZodValidationPipe<NotificationQueryDto>(NotificationQuerySchema)) query: NotificationQueryDto,
    ): Promise<NotificationListResponseDto> {
        return this.service.getMyNotifications(actor.id, query)
    }

    @AuthenticatedOnly()
    @Get(NOTIFICATION_ROUTE.UNREAD_COUNT)
    getUnreadCount(@CurrentUser() actor: AuthUser): Promise<UnreadCountResponseDto> {
        return this.service.getUnreadCount(actor.id)
    }

    @AuthenticatedOnly()
    @Get(NOTIFICATION_ROUTE.PREFERENCES)
    getMyPreferences(@CurrentUser() actor: AuthUser): Promise<NotificationPreferencesDto> {
        return this.service.getMyPreferences(actor.id)
    }

    // ===== Commands =====

    @AuthenticatedOnly()
    @Patch(NOTIFICATION_ROUTE.PREFERENCES)
    updateMyPreferences(
        @CurrentUser() actor: AuthUser,
        @Body(new ZodValidationPipe(NotificationPreferencesSchema)) body: UpdateNotificationPreferencesInput,
    ): Promise<NotificationPreferencesDto> {
        return this.service.updateMyPreferences(actor.id, body)
    }

    @AuthenticatedOnly()
    @Post()
    createNotification(
        @Body(new ZodValidationPipe(CreateNotificationInputSchema)) body: CreateNotificationInput,
    ): Promise<NotificationItemDto> {
        return this.service.createNotification(body)
    }

    @AuthenticatedOnly()
    @Patch(NOTIFICATION_ROUTE.READ_ALL)
    markAllAsRead(@CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.service.markAllAsRead(actor.id)
    }

    @AuthenticatedOnly()
    @Patch(':id/read')
    markAsRead(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.service.markAsRead(id, actor.id)
    }
}
