import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type { AddToCartInput, CartDetail, UpdateCartItemInput } from '@timmyhub/contracts'
import { AddToCartInputSchema, UpdateCartItemInputSchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser } from '@timmyhub/modules/platform/auth'

import { CART_ROUTE } from './cart.constants'
import { CartService } from './cart.service'

@Controller(CART_ROUTE.ROOT)
export class CartController {
    constructor(private readonly cartService: CartService) {}

    // REQ-CRT-001: Xem giỏ hàng của chính mình
    @AuthenticatedOnly()
    @Get()
    getCart(@CurrentUser() actor: AuthUser): Promise<CartDetail> {
        return this.cartService.getCart(actor.id)
    }

    // REQ-CRT-002, REQ-CRT-003: Thêm sản phẩm vào giỏ hàng với ACID Transaction
    @AuthenticatedOnly()
    @Post('items')
    addToCart(
        @Body(new ZodValidationPipe(AddToCartInputSchema)) body: AddToCartInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<CartDetail> {
        return this.cartService.addToCart(actor.id, body)
    }

    // REQ-CRT-004: Sửa số lượng item trong giỏ
    @AuthenticatedOnly()
    @Patch('items/:id')
    updateItemQuantity(
        @Param('id') itemId: string,
        @Body(new ZodValidationPipe(UpdateCartItemInputSchema)) body: UpdateCartItemInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<CartDetail> {
        return this.cartService.updateItemQuantity(actor.id, itemId, body)
    }

    // REQ-CRT-005: Xoá item khỏi giỏ
    @AuthenticatedOnly()
    @Delete('items/:id')
    removeItem(@Param('id') itemId: string, @CurrentUser() actor: AuthUser): Promise<CartDetail> {
        return this.cartService.removeItem(actor.id, itemId)
    }

    // Làm trống toàn bộ giỏ hàng
    @AuthenticatedOnly()
    @Delete()
    async clearCart(@CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        await this.cartService.clearCart(actor.id)
        return { success: true }
    }
}
