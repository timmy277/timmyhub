import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CreateVoucherInput,
    UpdateVoucherInput,
    VoucherDetail,
    VoucherItem,
    VoucherListQuery,
} from '@timmyhub/contracts'
import { CreateVoucherInputSchema, UpdateVoucherInputSchema, VoucherListQuerySchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser } from '@timmyhub/modules/platform/auth'

import { PromotionService } from './promotion.service'

@Controller('v1/seller/vouchers')
export class SellerVoucherController {
    constructor(private readonly promotionService: PromotionService) {}

    @AuthenticatedOnly()
    @Get()
    listVouchers(
        @Query(new ZodValidationPipe(VoucherListQuerySchema)) query: VoucherListQuery,
        @CurrentUser() actor: AuthUser,
    ): Promise<{ items: VoucherItem[]; total: number; page: number; pageSize: number }> {
        return this.promotionService.listSellerVouchers(actor.id, query)
    }

    @AuthenticatedOnly()
    @Get(':id')
    getVoucherDetail(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<VoucherDetail> {
        return this.promotionService.getSellerVoucherDetail(actor.id, id)
    }

    @AuthenticatedOnly()
    @Post()
    createVoucher(
        @Body(new ZodValidationPipe(CreateVoucherInputSchema)) body: CreateVoucherInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<VoucherItem> {
        return this.promotionService.createSellerVoucher(actor.id, body)
    }

    @AuthenticatedOnly()
    @Patch(':id')
    updateVoucher(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateVoucherInputSchema)) body: UpdateVoucherInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<VoucherItem> {
        return this.promotionService.updateSellerVoucher(actor.id, id, body)
    }

    @AuthenticatedOnly()
    @Patch(':id/status')
    toggleVoucherStatus(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
        @CurrentUser() actor: AuthUser,
    ): Promise<VoucherItem> {
        return this.promotionService.toggleSellerVoucherStatus(actor.id, id, isActive)
    }

    @AuthenticatedOnly()
    @Delete(':id')
    deleteVoucher(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.promotionService.deleteSellerVoucher(actor.id, id)
    }
}
