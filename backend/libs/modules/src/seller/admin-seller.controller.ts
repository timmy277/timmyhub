import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    ReviewSellerApplicationInput,
    SellerApplicationDetail,
    SellerApplicationListResult,
    SellerApplicationQuery,
    SellerProfileDetail,
    SuspendShopInput,
} from '@timmyhub/contracts'
import { ReviewSellerApplicationSchema, SellerApplicationQuerySchema, SuspendShopSchema } from '@timmyhub/contracts'
import { CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { SellerService } from './seller.service'

// Controller dành cho Admin quản lý đơn đăng ký bán hàng và shop (FEAT-SEL-002, FEAT-SEL-006, FEAT-SEL-007)
@Controller('v1/admin/seller')
export class AdminSellerController {
    // ===== Dependencies =====
    constructor(private readonly sellerService: SellerService) {}

    // ===== Queries =====

    // Xem danh sách đơn đăng ký bán hàng
    @Permissions('seller:applications:list')
    @Get('applications')
    listApplications(
        @Query(new ZodValidationPipe(SellerApplicationQuerySchema)) query: SellerApplicationQuery,
    ): Promise<SellerApplicationListResult> {
        return this.sellerService.listApplications(query)
    }

    // Xem chi tiết đơn đăng ký
    @Permissions('seller:applications:read')
    @Get('applications/:id')
    getApplicationDetail(@Param('id') id: string): Promise<SellerApplicationDetail> {
        return this.sellerService.getApplicationDetail(id)
    }

    // ===== Commands =====

    // REQ-SEL-006: Duyệt đơn đăng ký bán hàng
    @Permissions('seller:applications:approve')
    @Post('applications/:id/approve')
    approveApplication(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<SellerApplicationDetail> {
        return this.sellerService.approveApplication(id, actor.id)
    }

    // REQ-SEL-007: Từ chối đơn đăng ký bán hàng kèm lý do
    @Permissions('seller:applications:reject')
    @Post('applications/:id/reject')
    rejectApplication(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(ReviewSellerApplicationSchema)) body: ReviewSellerApplicationInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<SellerApplicationDetail> {
        return this.sellerService.rejectApplication(id, actor.id, body)
    }

    // REQ-SEL-015: Cấp huy hiệu xác minh cho shop
    @Permissions('seller:shops:update:any')
    @Post('shops/:id/verify')
    verifyShop(@Param('id') id: string): Promise<SellerProfileDetail> {
        return this.sellerService.verifyShop(id)
    }

    // REQ-SEL-016: Tạm ngưng shop vi phạm
    @Permissions('seller:shops:suspend')
    @Post('shops/:id/suspend')
    suspendShop(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(SuspendShopSchema)) body: SuspendShopInput,
    ): Promise<SellerProfileDetail> {
        return this.sellerService.suspendShop(id, body.reason)
    }

    // REQ-SEL-017: Khôi phục shop tạm ngưng
    @Permissions('seller:shops:suspend')
    @Post('shops/:id/restore')
    restoreShop(@Param('id') id: string): Promise<SellerProfileDetail> {
        return this.sellerService.restoreShop(id)
    }
}
