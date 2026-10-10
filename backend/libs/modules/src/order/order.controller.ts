import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type { CheckoutInput, CheckoutResult, OrderDetail } from '@timmyhub/contracts'
import { CheckoutInputSchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser } from '@timmyhub/modules/platform/auth'

import { ORDER_ROUTE } from './order.constants'
import { OrderService } from './order.service'

@Controller(ORDER_ROUTE.ROOT)
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    // REQ-CRT-016: Khởi tạo checkout / đặt hàng với Idempotency-Key
    @AuthenticatedOnly()
    @Post('checkout')
    checkout(
        @Body(new ZodValidationPipe(CheckoutInputSchema)) body: CheckoutInput,
        @CurrentUser() actor: AuthUser,
        @Headers('idempotency-key') idempotencyKey?: string,
    ): Promise<CheckoutResult> {
        return this.orderService.checkout(actor.id, body, idempotencyKey)
    }

    // Danh sách đơn hàng của người mua
    @AuthenticatedOnly()
    @Get()
    getMyOrders(@Query('status') status: string | undefined, @CurrentUser() actor: AuthUser): Promise<OrderDetail[]> {
        return this.orderService.getMyOrders(actor.id, status)
    }

    // Chi tiết 1 đơn hàng
    @AuthenticatedOnly()
    @Get(':id')
    getOrderById(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<OrderDetail> {
        return this.orderService.getOrderById(actor.id, id)
    }
}
