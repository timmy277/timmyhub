import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CreateSellerApplicationInput,
    CreateWithdrawalInput,
    PublicShopDetail,
    SellerApplicationDetail,
    SellerProfileDetail,
    UpdateSellerProfileInput,
    WalletDetail,
    WithdrawalDetail,
} from '@timmyhub/contracts'
import {
    CreateSellerApplicationSchema,
    CreateWithdrawalInputSchema,
    UpdateSellerProfileSchema,
} from '@timmyhub/contracts'

import { AuthenticatedOnly, CurrentUser, Permissions, Public } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { SELLER_ROUTE } from './seller.constants'
import { SellerService } from './seller.service'

// Controller dành cho người dùng và người bán (FEAT-SEL-001, FEAT-SEL-003)
@Controller('v1/seller')
export class SellerController {
    // ===== Dependencies =====
    constructor(private readonly sellerService: SellerService) {}

    // ===== Commands (User nộp đơn) =====

    // FEAT-SEL-001: Nộp đơn đăng ký bán hàng
    @AuthenticatedOnly()
    @Post('applications')
    submitApplication(
        @Body(new ZodValidationPipe(CreateSellerApplicationSchema)) body: CreateSellerApplicationInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<SellerApplicationDetail> {
        return this.sellerService.submitApplication(actor.id, body)
    }

    // ===== Queries (User xem lịch sử đơn) =====

    // REQ-SEL-004: Xem lịch sử đơn của mình
    @AuthenticatedOnly()
    @Get('applications/me')
    getMyApplications(@CurrentUser() actor: AuthUser): Promise<SellerApplicationDetail[]> {
        return this.sellerService.getMyApplications(actor.id)
    }

    // ===== Seller Shop Management =====

    // REQ-SEL-020: Xem thông tin shop của mình
    @AuthenticatedOnly()
    @Get('shop/me')
    getMyShop(@CurrentUser() actor: AuthUser): Promise<SellerProfileDetail> {
        return this.sellerService.getMyShop(actor.id)
    }

    // REQ-SEL-009: Cập nhật hồ sơ shop của mình
    @Permissions('seller:shops:update')
    @Patch('shop/me')
    updateMyShop(
        @Body(new ZodValidationPipe(UpdateSellerProfileSchema)) body: UpdateSellerProfileInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<SellerProfileDetail> {
        return this.sellerService.updateMyShop(actor.id, body)
    }

    // ===== Seller Wallet (FEAT-WAL-001..006) =====

    // Xem thông tin ví và lịch sử giao dịch của shop
    @Permissions('wallet:balance:read')
    @Get('shop/me/wallet')
    getSellerWallet(@CurrentUser() actor: AuthUser): Promise<WalletDetail> {
        return this.sellerService.getSellerWallet(actor.id)
    }

    // Yêu cầu rút tiền từ ví shop về ngân hàng
    @Permissions('wallet:withdrawals:create')
    @Post('shop/me/wallet/withdraw')
    requestWithdrawal(
        @Body(new ZodValidationPipe(CreateWithdrawalInputSchema)) body: CreateWithdrawalInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<WithdrawalDetail> {
        return this.sellerService.requestWithdrawal(actor.id, body)
    }

    // Lịch sử yêu cầu rút tiền của shop
    @Permissions('wallet:balance:read')
    @Get('shop/me/wallet/withdrawals')
    getSellerWithdrawals(@CurrentUser() actor: AuthUser): Promise<WithdrawalDetail[]> {
        return this.sellerService.getSellerWithdrawals(actor.id)
    }
}

// Controller xem trang shop công khai (FEAT-SEL-004)
@Controller(SELLER_ROUTE.PUBLIC_SHOPS)
export class PublicShopsController {
    // ===== Dependencies =====
    constructor(private readonly sellerService: SellerService) {}

    // REQ-SEL-011: Khách vãng lai xem trang shop công khai
    @Public()
    @Get(SELLER_ROUTE.PUBLIC_SHOP_SLUG)
    getPublicShop(@Param('slug') slug: string): Promise<PublicShopDetail> {
        return this.sellerService.getPublicShopBySlug(slug)
    }
}
