import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type { UserVoucherItem, ValidateVoucherInput, ValidateVoucherResult, VoucherItem } from '@timmyhub/contracts'
import { ValidateVoucherInputSchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser, Public } from '@timmyhub/modules/platform/auth'

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

    @AuthenticatedOnly()
    @Post('vouchers/:id/save')
    saveVoucher(
        @Param('id') id: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<{ saved: boolean; voucherId: string }> {
        return this.promotionService.saveUserVoucher(actor.id, id)
    }

    @AuthenticatedOnly()
    @Get('my-saved-vouchers')
    getMySavedVouchers(@CurrentUser() actor: AuthUser): Promise<string[]> {
        return this.promotionService.getUserSavedVoucherIds(actor.id)
    }

    @AuthenticatedOnly()
    @Get('my-vouchers')
    getMyVouchers(
        @CurrentUser() actor: AuthUser,
        @Query('status') status?: 'SAVED' | 'USED' | 'EXPIRED',
    ): Promise<UserVoucherItem[]> {
        return this.promotionService.getMyUserVouchers(actor.id, status)
    }

    @AuthenticatedOnly()
    @Post('claim-code')
    claimCode(
        @Body('code') code: string,
        @CurrentUser() actor: AuthUser,
    ): Promise<{ saved: boolean; voucherId: string; code: string }> {
        return this.promotionService.claimVoucherByCode(actor.id, code)
    }
}
