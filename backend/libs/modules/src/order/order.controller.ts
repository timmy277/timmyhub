import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { ZodValidationPipe } from '@timmyhub/common'
import type { CancelOrderInput, CheckoutInput, CheckoutResult, OrderDetail } from '@timmyhub/contracts'
import { CancelOrderInputSchema, CheckoutInputSchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser, Public } from '@timmyhub/modules/platform/auth'

import { ORDER_ROUTE } from './order.constants'
import { OrderService } from './order.service'
import { VnpayService } from './vnpay.service'

@Controller(ORDER_ROUTE.ROOT)
export class OrderController {
    constructor(
        private readonly orderService: OrderService,
        private readonly vnpayService: VnpayService,
        private readonly config: ConfigService,
    ) {}

    // REQ-CRT-016: Khởi tạo checkout / đặt hàng với Idempotency-Key
    @AuthenticatedOnly()
    @Post('checkout')
    checkout(
        @Body(new ZodValidationPipe(CheckoutInputSchema)) body: CheckoutInput,
        @CurrentUser() actor: AuthUser,
        @Req() req: Request,
        @Headers('idempotency-key') idempotencyKey?: string,
    ): Promise<CheckoutResult> {
        const clientIp = this.vnpayService.getClientIp(req)
        return this.orderService.checkout(actor.id, body, idempotencyKey, clientIp)
    }

    // Danh sách đơn hàng của người mua
    @AuthenticatedOnly()
    @Get()
    getMyOrders(@Query('status') status: string | undefined, @CurrentUser() actor: AuthUser): Promise<OrderDetail[]> {
        return this.orderService.getMyOrders(actor.id, status)
    }

    // VNPay return callback (browser redirect sau khi khách thanh toán)
    @Public()
    @Get('vnpay/return')
    async vnpayReturn(@Req() req: Request, @Res() res: Response): Promise<void> {
        const query = req.query as Record<string, string>
        const result = await this.vnpayService.processReturn(query)

        const frontendUrl = this.config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() || 'http://localhost:3000'

        // Nếu thành công: chuyển thẳng đến trang checkout success
        // Nếu thất bại: chuyển đến trang payment result thông báo lỗi
        const targetPath = result.success ? '/checkout/success' : '/payment/result'
        const redirectUrl = new URL(targetPath, frontendUrl)

        if (result.orderId) {
            redirectUrl.searchParams.set('orderId', result.orderId)
        }
        redirectUrl.searchParams.set('success', String(result.success))
        redirectUrl.searchParams.set('message', result.message)
        if (result.code) {
            redirectUrl.searchParams.set('code', result.code)
        }

        res.redirect(302, redirectUrl.toString())
    }

    // VNPay IPN callback (server-to-server qua GET hoặc POST)
    @Public()
    @Get('vnpay/ipn')
    async vnpayIpnGet(@Req() req: Request, @Res() res: Response): Promise<void> {
        const query = req.query as Record<string, string>
        const result = await this.vnpayService.processIpn(query)
        res.status(200).json(result)
    }

    @Public()
    @Post('vnpay/ipn')
    async vnpayIpnPost(@Body() body: Record<string, string>, @Req() req: Request, @Res() res: Response): Promise<void> {
        const payload = (body && Object.keys(body).length > 0 ? body : req.query) as Record<string, string>
        const result = await this.vnpayService.processIpn(payload)
        res.status(200).json(result)
    }

    // Chi tiết 1 đơn hàng
    @AuthenticatedOnly()
    @Get(':id')
    getOrderById(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<OrderDetail> {
        return this.orderService.getOrderById(actor.id, id)
    }

    // Huỷ đơn hàng của người mua
    @AuthenticatedOnly()
    @Patch(':id/cancel')
    cancelOrder(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(CancelOrderInputSchema)) body: CancelOrderInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<OrderDetail> {
        return this.orderService.cancelOrder(actor.id, id, body.reason)
    }
}
