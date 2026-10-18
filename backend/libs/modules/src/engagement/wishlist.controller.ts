import { Controller, Delete, Get, Param, Post } from '@nestjs/common'

import type { ToggleWishlistResponseDto, WishlistListResponseDto } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser } from '@timmyhub/modules/platform/auth'

import { EngagementService } from './engagement.service'

@Controller('v1/wishlist')
export class WishlistController {
    // ===== Dependencies =====
    constructor(private readonly service: EngagementService) {}

    // ===== Queries =====

    @AuthenticatedOnly()
    @Get()
    getWishlist(@CurrentUser() actor: AuthUser): Promise<WishlistListResponseDto> {
        return this.service.getWishlist(actor.id)
    }

    @AuthenticatedOnly()
    @Get('ids')
    getWishlistProductIds(@CurrentUser() actor: AuthUser): Promise<string[]> {
        return this.service.getWishlistProductIds(actor.id)
    }

    // ===== Commands =====

    @AuthenticatedOnly()
    @Post(':productId/toggle')
    toggleWishlist(
        @Param('productId') productId: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<ToggleWishlistResponseDto> {
        return this.service.toggleWishlist(actor.id, productId)
    }

    @AuthenticatedOnly()
    @Delete(':productId')
    removeFromWishlist(
        @Param('productId') productId: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<{ success: boolean }> {
        return this.service.removeFromWishlist(actor.id, productId)
    }
}
