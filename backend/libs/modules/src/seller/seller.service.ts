import { Injectable } from '@nestjs/common'

import type {
    CreateSellerApplicationInput,
    PublicShopDetail,
    ReviewSellerApplicationInput,
    SellerApplicationDetail,
    SellerApplicationListResult,
    SellerApplicationQuery,
    SellerProfileDetail,
    UpdateSellerProfileInput,
} from '@timmyhub/contracts'
import { ApiError, ResourceStatus } from '@timmyhub/contracts'

import { REAPPLICATION_COOLDOWN_MS } from './seller.constants'
import { slugifyShopName, toPublicShopDetail, toSellerApplicationDetail, toSellerProfileDetail } from './seller.mapper'
import { SellerRepository } from './seller.repository'

@Injectable()
export class SellerService {
    // ===== Dependencies =====
    constructor(private readonly repository: SellerRepository) {}

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
    async getPublicShopBySlug(slug: string): Promise<PublicShopDetail> {
        const profile = await this.repository.findProfileBySlug(slug)
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
            // Thêm hậu tố ngẫu nhiên nếu trùng
            shopSlug = `${shopSlug}-${Math.random().toString(36).substring(2, 6)}`
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
}
