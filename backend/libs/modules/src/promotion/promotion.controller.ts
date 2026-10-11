import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CampaignProductItem,
    CreatePromotionCampaignInput,
    CreateVoucherInput,
    PromotionCampaignDetail,
    PromotionCampaignItem,
    PromotionCampaignListQuery,
    UpdatePromotionCampaignInput,
    UpdateVoucherInput,
    VoucherDetail,
    VoucherItem,
    VoucherListQuery,
} from '@timmyhub/contracts'
import {
    CreatePromotionCampaignInputSchema,
    CreateVoucherInputSchema,
    PromotionCampaignListQuerySchema,
    UpdatePromotionCampaignInputSchema,
    UpdateVoucherInputSchema,
    VoucherListQuerySchema,
} from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'

import { PromotionService } from './promotion.service'

@Controller('v1/admin')
export class PromotionController {
    constructor(private readonly promotionService: PromotionService) {}

    // ==========================================
    // VOUCHERS (ADMIN)
    // ==========================================

    @Permissions('promotion:vouchers:list:any')
    @Get('vouchers')
    listVouchers(
        @Query(new ZodValidationPipe(VoucherListQuerySchema)) query: VoucherListQuery,
    ): Promise<{ items: VoucherItem[]; total: number; page: number; pageSize: number }> {
        return this.promotionService.listAdminVouchers(query)
    }

    @Permissions('promotion:vouchers:list:any')
    @Get('vouchers/:id')
    getVoucherDetail(@Param('id') id: string): Promise<VoucherDetail> {
        return this.promotionService.getVoucherDetail(id)
    }

    @Permissions('promotion:vouchers:create:any')
    @Post('vouchers')
    createVoucher(
        @Body(new ZodValidationPipe(CreateVoucherInputSchema)) body: CreateVoucherInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<VoucherItem> {
        return this.promotionService.createVoucher(body, actor.id)
    }

    @Permissions('promotion:vouchers:update:any')
    @Patch('vouchers/:id')
    updateVoucher(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateVoucherInputSchema)) body: UpdateVoucherInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<VoucherItem> {
        return this.promotionService.updateVoucher(id, body, actor.id)
    }

    @Permissions('promotion:vouchers:update:any')
    @Patch('vouchers/:id/status')
    toggleVoucherStatus(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
        @CurrentUser() actor: AuthUser,
    ): Promise<VoucherItem> {
        return this.promotionService.toggleVoucherStatus(id, isActive, actor.id)
    }

    @Permissions('promotion:vouchers:delete:any')
    @Delete('vouchers/:id')
    deleteVoucher(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.promotionService.deleteVoucher(id, actor.id)
    }

    // ==========================================
    // CAMPAIGNS (ADMIN)
    // ==========================================

    @Permissions('promotion:campaigns:create')
    @Get('campaigns')
    listCampaigns(
        @Query(new ZodValidationPipe(PromotionCampaignListQuerySchema)) query: PromotionCampaignListQuery,
    ): Promise<{ items: PromotionCampaignItem[]; total: number; page: number; pageSize: number }> {
        return this.promotionService.listAdminCampaigns(query)
    }

    @Permissions('promotion:campaigns:create')
    @Get('campaigns/:id')
    getCampaignDetail(@Param('id') id: string): Promise<PromotionCampaignDetail> {
        return this.promotionService.getCampaignDetail(id)
    }

    @Permissions('promotion:campaigns:create')
    @Post('campaigns')
    createCampaign(
        @Body(new ZodValidationPipe(CreatePromotionCampaignInputSchema)) body: CreatePromotionCampaignInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<PromotionCampaignItem> {
        return this.promotionService.createCampaign(body, actor.id)
    }

    @Permissions('promotion:campaigns:update')
    @Patch('campaigns/:id')
    updateCampaign(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdatePromotionCampaignInputSchema)) body: UpdatePromotionCampaignInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<PromotionCampaignItem> {
        return this.promotionService.updateCampaign(id, body, actor.id)
    }

    @Permissions('promotion:campaigns:update')
    @Patch('campaigns/:id/status')
    toggleCampaignStatus(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
        @CurrentUser() actor: AuthUser,
    ): Promise<PromotionCampaignItem> {
        return this.promotionService.toggleCampaignStatus(id, isActive, actor.id)
    }

    @Permissions('promotion:campaigns:delete')
    @Delete('campaigns/:id')
    deleteCampaign(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.promotionService.deleteCampaign(id, actor.id)
    }

    @Permissions('promotion:campaigns:approve')
    @Patch('campaigns/:campaignId/products/:productId/review')
    reviewCampaignProduct(
        @Param('campaignId') campaignId: string,
        @Param('productId') productId: string,
        @Body('status') status: 'APPROVED' | 'REJECTED',
    ): Promise<CampaignProductItem> {
        return this.promotionService.reviewCampaignProduct(campaignId, productId, status)
    }
}
