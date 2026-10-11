import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type { ValidateVoucherInput, ValidateVoucherResult, VoucherItem } from '@timmyhub/contracts'
import { ValidateVoucherInputSchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { CurrentUser, Public } from '@timmyhub/modules/platform/auth'

import { PromotionService } from './promotion.service'

@Controller('v1/promotions')
export class PromotionPublicController {
    constructor(private readonly promotionService: PromotionService) {}

    @Public()
    @Post('validate-voucher')
    validateVoucher(
        @Body(new ZodValidationPipe(ValidateVoucherInputSchema)) body: ValidateVoucherInput,
        @CurrentUser() actor?: AuthUser,
    ): Promise<ValidateVoucherResult> {
        return this.promotionService.validateVoucherForCheckout(body, actor?.id)
    }

    @Public()
    @Get('available-vouchers')
    getAvailableVouchers(
        @Query('subtotal') subtotal?: string,
        @CurrentUser() actor?: AuthUser,
    ): Promise<VoucherItem[]> {
        const numSubtotal = subtotal ? Number(subtotal) : undefined
        return this.promotionService.getAvailableVouchersForCheckout(numSubtotal, actor?.id)
    }
}
