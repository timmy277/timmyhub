import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CreateReviewCommentInput,
    CreateReviewInput,
    PendingReviewItem,
    ProductRatingSummary,
    ReviewCommentItem,
    ReviewItem,
    ReviewListResult,
    ReviewQuery,
} from '@timmyhub/contracts'
import { CreateReviewCommentInputSchema, CreateReviewInputSchema, ReviewQuerySchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser, Public } from '@timmyhub/modules/platform/auth'

import { ENGAGEMENT_ROUTE } from './engagement.constants'
import { EngagementService } from './engagement.service'

@Controller(ENGAGEMENT_ROUTE.ROOT)
export class EngagementController {
    // ===== Dependencies =====
    constructor(private readonly service: EngagementService) {}

    // ===== Queries =====

    @Public()
    @Get()
    getProductReviews(
        @Query(new ZodValidationPipe(ReviewQuerySchema)) query: ReviewQuery,
        @CurrentUser() actor?: AuthUser,
    ): Promise<ReviewListResult> {
        return this.service.getProductReviews(query, actor?.id)
    }

    @Public()
    @Get('summary')
    getProductRatingSummary(@Query('productId') productId: string): Promise<ProductRatingSummary> {
        return this.service.getProductRatingSummary(productId)
    }

    @AuthenticatedOnly()
    @Get('pending')
    getPendingReviews(@CurrentUser() actor: AuthUser): Promise<PendingReviewItem[]> {
        return this.service.getPendingReviews(actor.id)
    }

    // ===== Commands =====

    @AuthenticatedOnly()
    @Post()
    createReview(
        @Body(new ZodValidationPipe(CreateReviewInputSchema)) body: CreateReviewInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<ReviewItem> {
        return this.service.createReview(actor.id, body)
    }

    @AuthenticatedOnly()
    @Post(':id/comments')
    createComment(
        @Param('id') reviewId: string,
        @Body(new ZodValidationPipe(CreateReviewCommentInputSchema)) body: CreateReviewCommentInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<ReviewCommentItem> {
        return this.service.createComment(actor.id, { ...body, reviewId })
    }

    @AuthenticatedOnly()
    @Post(':id/helpful')
    toggleHelpful(
        @Param('id') reviewId: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<{ voted: boolean; count: number }> {
        return this.service.toggleHelpful(actor.id, reviewId)
    }
}
