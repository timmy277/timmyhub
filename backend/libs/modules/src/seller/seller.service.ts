import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaService } from '@timmyhub/prisma'

import type {
    CreateSellerApplicationInput,
    CreateWithdrawalInput,
    PublicShopDetail,
    ReviewSellerApplicationInput,
    SellerApplicationDetail,
    SellerApplicationListResult,
    SellerApplicationQuery,
    SellerProfileDetail,
    UpdateSellerProfileInput,
    WalletDetail,
    WithdrawalDetail,
} from '@timmyhub/contracts'
import { ApiError, ResourceStatus, UserRole } from '@timmyhub/contracts'

import { REAPPLICATION_COOLDOWN_MS } from './seller.constants'
import { slugifyShopName, toPublicShopDetail, toSellerApplicationDetail, toSellerProfileDetail } from './seller.mapper'
import { SellerRepository } from './seller.repository'

@Injectable()
export class SellerService {
    // ===== Dependencies =====
    constructor(
        private readonly repository: SellerRepository,
        private readonly prisma: PrismaService,
    ) {}

    // ===== Queries (User / Seller) =====

    // Lấy lịch sử đơn đăng ký của user (REQ-SEL-004)
    async getMyApplications(userId: string): Promise<SellerApplicationDetail[]> {
        const apps = await this.repository.findApplicationsByUserId(userId)
        return apps.map((app) => toSellerApplicationDetail(app))
    }

    // Lấy thông tin shop của chính seller (REQ-SEL-020)
    async getMyShop(userId: string): Promise<SellerProfileDetail> {
        const profile = await this.repository.findProfileByUserId(userId)
        if (!profile) {
            throw new ApiError('SELLER_SHOP_NOT_FOUND', {
                messageKey: 'seller.shopNotFound',
            })
        }
        return toSellerProfileDetail(profile)
    }

    // Lấy thông tin shop công khai cho khách (REQ-SEL-011, REQ-SEL-012)
    async getPublicShopBySlug(slugOrId: string): Promise<PublicShopDetail> {
        let profile = await this.repository.findProfileBySlug(slugOrId)
        if (!profile) {
            profile = await this.repository.findProfileById(slugOrId)
        }
        // Nếu không tồn tại, chưa APPROVED hoặc đang bị tạm ngưng -> trả 404 (luật cứng #8)
        if (!profile || profile.status !== ResourceStatus.APPROVED || profile.isSuspended) {
            throw new ApiError('NOT_FOUND', {
                messageKey: 'seller.shopNotFound',
            })
        }
        return toPublicShopDetail(profile)
    }

    // ===== Queries (Admin) =====

    // Admin xem danh sách đơn đăng ký bán hàng
    async listApplications(query: SellerApplicationQuery): Promise<SellerApplicationListResult> {
        const { items, totalItems } = await this.repository.listApplications({
            page: query.page,
            pageSize: query.pageSize,
            status: query.status,
            q: query.q,
        })

        const totalPages = Math.ceil(totalItems / query.pageSize) || 1

        return {
            items: items.map(toSellerApplicationDetail),
            totalItems,
            page: query.page,
            pageSize: query.pageSize,
            totalPages,
        }
    }

    // Admin xem chi tiết 1 đơn đăng ký
    async getApplicationDetail(id: string): Promise<SellerApplicationDetail> {
        const app = await this.repository.findApplicationById(id)
        if (!app) {
            throw new ApiError('SELLER_APPLICATION_NOT_FOUND', {
                messageKey: 'seller.applicationNotFound',
            })
        }
        return toSellerApplicationDetail(app)
    }

    // ===== Commands (User / Seller) =====

    // REQ-SEL-001..005: Nộp đơn đăng ký bán hàng
    async submitApplication(userId: string, input: CreateSellerApplicationInput): Promise<SellerApplicationDetail> {
        // 0. Quản trị viên sàn không được phép đăng ký bán hàng
        const roles = await this.repository.findUserRoles(userId)
        if (
            roles.includes(UserRole.ADMIN) ||
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.MODERATOR)
        ) {
            throw new ApiError('FORBIDDEN', {
                messageKey: 'seller.adminCannotApply',
            })
        }

        // 1. Kiểm tra xem user đã có shop đã duyệt chưa (REQ-SEL-003)
        const existingProfile = await this.repository.findProfileByUserId(userId)
        if (existingProfile && existingProfile.status === ResourceStatus.APPROVED) {
            throw new ApiError('ALREADY_A_SELLER', {
                messageKey: 'seller.alreadyASeller',
            })
        }

        // 2. Kiểm tra xem user có đơn đang chờ duyệt (PENDING) không (REQ-SEL-003)
        const pendingApp = await this.repository.findPendingApplicationByUserId(userId)
        if (pendingApp) {
            throw new ApiError('SELLER_APPLICATION_ALREADY_PENDING', {
                messageKey: 'seller.applicationAlreadyPending',
            })
        }

        // 3. Kiểm tra cooldown 24h nếu đơn gần nhất bị REJECTED (REQ-SEL-005)
        const latestApp = await this.repository.findLatestApplicationByUserId(userId)
        if (latestApp && latestApp.status === ResourceStatus.REJECTED && latestApp.reviewedAt) {
            const timeSinceReview = Date.now() - latestApp.reviewedAt.getTime()
            if (timeSinceReview < REAPPLICATION_COOLDOWN_MS) {
                const retryAfterMs = REAPPLICATION_COOLDOWN_MS - timeSinceReview
                const retryAfterHours = Math.ceil(retryAfterMs / (60 * 60 * 1000))
                throw new ApiError('SELLER_APPLICATION_COOLDOWN', {
                    messageKey: 'seller.applicationCooldown',
                    details: { retryAfterHours },
                })
            }
        }

        // 4. Tạo đơn mới
        const application = await this.repository.createApplication(userId, input)
        return toSellerApplicationDetail(application)
    }

    // REQ-SEL-009: Cập nhật thông tin shop của mình
    async updateMyShop(userId: string, input: UpdateSellerProfileInput): Promise<SellerProfileDetail> {
        const profile = await this.repository.findProfileByUserId(userId)
        if (!profile) {
            throw new ApiError('SELLER_SHOP_NOT_FOUND', {
                messageKey: 'seller.shopNotFound',
            })
        }

        if (profile.isSuspended) {
            throw new ApiError('SELLER_SHOP_SUSPENDED', {
                messageKey: 'seller.shopSuspended',
            })
        }

        const updated = await this.repository.updateProfile(userId, input)
        return toSellerProfileDetail(updated)
    }

    // ===== Commands (Admin) =====

    // REQ-SEL-006: Admin duyệt đơn đăng ký bán hàng
    async approveApplication(applicationId: string, reviewedById: string): Promise<SellerApplicationDetail> {
        const app = await this.repository.findApplicationById(applicationId)
        if (!app) {
            throw new ApiError('SELLER_APPLICATION_NOT_FOUND', {
                messageKey: 'seller.applicationNotFound',
            })
        }

        if (app.status !== ResourceStatus.PENDING) {
            throw new ApiError('SELLER_APPLICATION_NOT_PENDING', {
                messageKey: 'seller.applicationNotPending',
            })
        }

        // Sinh slug cho shop và xử lý trùng lặp nếu có
        let shopSlug = slugifyShopName(app.shopName)
        const existingWithSlug = await this.repository.findProfileBySlug(shopSlug)
        if (existingWithSlug) {
            // Luật #4: hậu tố ngẫu nhiên dùng crypto.randomUUID thay Math.random để tránh tranh chấp
            shopSlug = `${shopSlug}-${randomUUID().slice(0, 8)}`
        }

        const result = await this.repository.approveApplication({
            applicationId,
            reviewedById,
            shopSlug,
        })

        if (!result) {
            throw new ApiError('SELLER_APPLICATION_NOT_PENDING', {
                messageKey: 'seller.applicationNotPending',
            })
        }

        return toSellerApplicationDetail({
            ...result.application,
            user: app.user ?? null,
        })
    }

    // REQ-SEL-007: Admin từ chối đơn đăng ký bán hàng kèm lý do
    async rejectApplication(
        applicationId: string,
        reviewedById: string,
        input: ReviewSellerApplicationInput,
    ): Promise<SellerApplicationDetail> {
        const app = await this.repository.findApplicationById(applicationId)
        if (!app) {
            throw new ApiError('SELLER_APPLICATION_NOT_FOUND', {
                messageKey: 'seller.applicationNotFound',
            })
        }

        if (app.status !== ResourceStatus.PENDING) {
            throw new ApiError('SELLER_APPLICATION_NOT_PENDING', {
                messageKey: 'seller.applicationNotPending',
            })
        }

        if (!input.reviewNote || !input.reviewNote.trim()) {
            throw new ApiError('VALIDATION_FAILED', {
                messageKey: 'seller.reviewNoteRequiredOnReject',
            })
        }

        const result = await this.repository.rejectApplication({
            applicationId,
            reviewedById,
            reviewNote: input.reviewNote.trim(),
        })

        if (!result) {
            throw new ApiError('SELLER_APPLICATION_NOT_PENDING', {
                messageKey: 'seller.applicationNotPending',
            })
        }

        return toSellerApplicationDetail({
            ...result,
            user: app.user ?? null,
        })
    }

    // REQ-SEL-015: Cấp huy hiệu xác minh shop
    async verifyShop(profileId: string): Promise<SellerProfileDetail> {
        const profile = await this.repository.findProfileById(profileId)
        if (!profile) {
            throw new ApiError('SELLER_SHOP_NOT_FOUND', {
                messageKey: 'seller.shopNotFound',
            })
        }
        const updated = await this.repository.verifyShop(profileId)
        return toSellerProfileDetail(updated)
    }

    // REQ-SEL-016: Tạm ngưng shop vi phạm
    async suspendShop(profileId: string, reason: string): Promise<SellerProfileDetail> {
        const profile = await this.repository.findProfileById(profileId)
        if (!profile) {
            throw new ApiError('SELLER_SHOP_NOT_FOUND', {
                messageKey: 'seller.shopNotFound',
            })
        }
        const updated = await this.repository.suspendShop(profileId, reason)
        return toSellerProfileDetail(updated)
    }

    // REQ-SEL-017: Khôi phục shop tạm ngưng
    async restoreShop(profileId: string): Promise<SellerProfileDetail> {
        const profile = await this.repository.findProfileById(profileId)
        if (!profile) {
            throw new ApiError('SELLER_SHOP_NOT_FOUND', {
                messageKey: 'seller.shopNotFound',
            })
        }
        const updated = await this.repository.restoreShop(profileId)
        return toSellerProfileDetail(updated)
    }

    // ===== Seller Wallet & Settlement (FEAT-WAL-001..006) =====

    // Lấy thông tin ví và sổ giao dịch của người bán
    async getSellerWallet(userId: string): Promise<WalletDetail> {
        const profile = await this.repository.findProfileByUserId(userId)
        if (!profile) {
            throw new ApiError('SELLER_SHOP_NOT_FOUND', {
                messageKey: 'seller.shopNotFound',
            })
        }

        const wallet = await this.prisma.wallet.upsert({
            where: { sellerId: profile.id },
            create: {
                sellerId: profile.id,
                availableBalance: 0,
                holdBalance: 0,
                currency: 'VND',
            },
            update: {},
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 30,
                },
            },
        })

        return {
            id: wallet.id,
            sellerId: wallet.sellerId,
            buyerId: wallet.buyerId,
            availableBalance: wallet.availableBalance.toString(),
            holdBalance: wallet.holdBalance.toString(),
            currency: wallet.currency,
            createdAt: wallet.createdAt.toISOString(),
            updatedAt: wallet.updatedAt.toISOString(),
            recentTransactions: wallet.transactions.map((tx) => ({
                id: tx.id,
                type: tx.type,
                amount: tx.amount.toString(),
                balanceAfter: tx.balanceAfter.toString(),
                description: tx.description,
                referenceKey: tx.referenceKey,
                createdAt: tx.createdAt.toISOString(),
            })),
        }
    }

    // Tạo yêu cầu rút tiền về ngân hàng
    async requestWithdrawal(userId: string, input: CreateWithdrawalInput): Promise<WithdrawalDetail> {
        const profile = await this.repository.findProfileByUserId(userId)
        if (!profile) {
            throw new ApiError('SELLER_SHOP_NOT_FOUND', {
                messageKey: 'seller.shopNotFound',
            })
        }

        const wallet = await this.prisma.wallet.findUnique({
            where: { sellerId: profile.id },
        })

        if (!wallet || wallet.availableBalance.lessThan(input.amount)) {
            throw new ApiError('BAD_REQUEST', {
                messageKey: 'seller.insufficientBalance',
            })
        }

        return this.prisma.$transaction(async (tx) => {
            // Trừ số dư khả dụng
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    availableBalance: { decrement: input.amount },
                },
            })

            // Tạo bản ghi yêu cầu rút tiền
            const withdrawal = await tx.withdrawal.create({
                data: {
                    walletId: wallet.id,
                    amount: input.amount,
                    bankName: input.bankName,
                    bankAccountNumber: input.bankAccountNumber,
                    bankAccountName: input.bankAccountName,
                    status: 'REQUESTED',
                },
            })

            // Ghi nhận biến động số dư trong sổ cái
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'WITHDRAWAL',
                    amount: input.amount,
                    balanceAfter: updatedWallet.availableBalance,
                    referenceKey: withdrawal.id,
                    description: `Yêu cầu rút tiền về ${input.bankName} - ${input.bankAccountNumber}`,
                },
            })

            return {
                id: withdrawal.id,
                walletId: withdrawal.walletId,
                amount: withdrawal.amount.toString(),
                bankName: withdrawal.bankName,
                bankAccountNumber: withdrawal.bankAccountNumber,
                bankAccountName: withdrawal.bankAccountName,
                status: 'REQUESTED' as const,
                rejectReason: withdrawal.rejectReason,
                createdAt: withdrawal.createdAt.toISOString(),
                updatedAt: withdrawal.updatedAt.toISOString(),
            }
        })
    }

    // Lấy lịch sử yêu cầu rút tiền của shop
    async getSellerWithdrawals(userId: string): Promise<WithdrawalDetail[]> {
        const profile = await this.repository.findProfileByUserId(userId)
        if (!profile) {
            return []
        }
        const wallet = await this.prisma.wallet.findUnique({
            where: { sellerId: profile.id },
        })
        if (!wallet) {
            return []
        }
        const items = await this.prisma.withdrawal.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })
        return items.map((w) => ({
            id: w.id,
            walletId: w.walletId,
            amount: w.amount.toString(),
            bankName: w.bankName,
            bankAccountNumber: w.bankAccountNumber,
            bankAccountName: w.bankAccountName,
            status: w.status as 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID',
            rejectReason: w.rejectReason,
            createdAt: w.createdAt.toISOString(),
            updatedAt: w.updatedAt.toISOString(),
        }))
    }

    // Admin: Xem danh sách yêu cầu rút tiền
    async listAdminWithdrawals(
        status?: string,
        page = 1,
        limit = 20,
    ): Promise<{ items: (WithdrawalDetail & { shopName?: string })[]; total: number }> {
        const where = status ? { status } : {}
        const [total, items] = await Promise.all([
            this.prisma.withdrawal.count({ where }),
            this.prisma.withdrawal.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    wallet: true,
                },
            }),
        ])

        const sellerIds = Array.from(new Set(items.map((i) => i.wallet.sellerId).filter(Boolean))) as string[]
        const shops = await this.prisma.sellerProfile.findMany({
            where: { id: { in: sellerIds } },
            select: { id: true, shopName: true },
        })
        const shopMap = new Map(shops.map((s) => [s.id, s.shopName]))

        return {
            total,
            items: items.map((w) => {
                const shopName = w.wallet.sellerId ? shopMap.get(w.wallet.sellerId) : undefined
                return {
                    id: w.id,
                    walletId: w.walletId,
                    amount: w.amount.toString(),
                    bankName: w.bankName,
                    bankAccountNumber: w.bankAccountNumber,
                    bankAccountName: w.bankAccountName,
                    status: w.status as 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID',
                    rejectReason: w.rejectReason,
                    createdAt: w.createdAt.toISOString(),
                    updatedAt: w.updatedAt.toISOString(),
                    ...(shopName ? { shopName } : {}),
                }
            }),
        }
    }

    // Admin: Duyệt chi yêu cầu rút tiền
    async approveWithdrawal(withdrawalId: string, adminUserId: string): Promise<WithdrawalDetail> {
        const item = await this.prisma.withdrawal.findUnique({
            where: { id: withdrawalId },
        })
        if (!item) {
            throw new ApiError('NOT_FOUND', { messageKey: 'seller.withdrawalNotFound' })
        }
        if (item.status !== 'REQUESTED') {
            throw new ApiError('BAD_REQUEST', { messageKey: 'seller.withdrawalAlreadyProcessed' })
        }

        const updated = await this.prisma.withdrawal.update({
            where: { id: withdrawalId },
            data: {
                status: 'PAID',
                approvedById: adminUserId,
                approvedAt: new Date(),
                paidAt: new Date(),
            },
        })

        return {
            id: updated.id,
            walletId: updated.walletId,
            amount: updated.amount.toString(),
            bankName: updated.bankName,
            bankAccountNumber: updated.bankAccountNumber,
            bankAccountName: updated.bankAccountName,
            status: 'PAID' as const,
            rejectReason: updated.rejectReason,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        }
    }

    // Admin: Từ chối yêu cầu rút tiền kèm lý do và hoàn trả số dư ví
    async rejectWithdrawal(withdrawalId: string, adminUserId: string, reason: string): Promise<WithdrawalDetail> {
        const item = await this.prisma.withdrawal.findUnique({
            where: { id: withdrawalId },
            include: { wallet: true },
        })
        if (!item) {
            throw new ApiError('NOT_FOUND', { messageKey: 'seller.withdrawalNotFound' })
        }
        if (item.status !== 'REQUESTED') {
            throw new ApiError('BAD_REQUEST', { messageKey: 'seller.withdrawalAlreadyProcessed' })
        }

        return this.prisma.$transaction(async (tx) => {
            // Hoàn lại số dư khả dụng cho ví
            const updatedWallet = await tx.wallet.update({
                where: { id: item.walletId },
                data: {
                    availableBalance: { increment: item.amount },
                },
            })

            const updated = await tx.withdrawal.update({
                where: { id: withdrawalId },
                data: {
                    status: 'REJECTED',
                    rejectReason: reason,
                    approvedById: adminUserId,
                    approvedAt: new Date(),
                },
            })

            // Ghi nhận giao dịch hoàn tiền REFUND trong sổ cái
            await tx.walletTransaction.create({
                data: {
                    walletId: item.walletId,
                    type: 'REFUND',
                    amount: item.amount,
                    balanceAfter: updatedWallet.availableBalance,
                    referenceKey: item.id,
                    description: `Hoàn tiền yêu cầu rút thất bại: ${reason}`,
                },
            })

            return {
                id: updated.id,
                walletId: updated.walletId,
                amount: updated.amount.toString(),
                bankName: updated.bankName,
                bankAccountNumber: updated.bankAccountNumber,
                bankAccountName: updated.bankAccountName,
                status: 'REJECTED' as const,
                rejectReason: updated.rejectReason,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            }
        })
    }
}
