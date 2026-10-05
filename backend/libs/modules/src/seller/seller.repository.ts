import { Injectable } from '@nestjs/common'

import { OUTBOX_AGGREGATE, OUTBOX_EVENT, ResourceStatus, UserRole } from '@timmyhub/contracts'
import type { CreateSellerApplicationInput, ResourceStatusType, UpdateSellerProfileInput } from '@timmyhub/contracts'
import { Prisma, PrismaService } from '@timmyhub/prisma'
import type { SellerApplication, SellerProfile } from '@timmyhub/prisma'

import type { SellerApplicationWithUser } from './seller.mapper'

@Injectable()
export class SellerRepository {
    // ===== Dependencies =====
    constructor(private readonly prisma: PrismaService) {}

    // ===== Queries =====
    async findPendingApplicationByUserId(userId: string): Promise<SellerApplication | null> {
        return this.prisma.sellerApplication.findFirst({
            where: {
                userId,
                status: ResourceStatus.PENDING,
            },
        })
    }

    async findLatestApplicationByUserId(userId: string): Promise<SellerApplication | null> {
        return this.prisma.sellerApplication.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findApplicationsByUserId(userId: string): Promise<SellerApplication[]> {
        return this.prisma.sellerApplication.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findProfileByUserId(userId: string): Promise<SellerProfile | null> {
        return this.prisma.sellerProfile.findUnique({
            where: { userId },
        })
    }

    async findProfileById(id: string): Promise<SellerProfile | null> {
        return this.prisma.sellerProfile.findUnique({
            where: { id },
        })
    }

    async findProfileBySlug(shopSlug: string): Promise<SellerProfile | null> {
        return this.prisma.sellerProfile.findUnique({
            where: { shopSlug },
        })
    }

    async findApplicationById(id: string): Promise<SellerApplicationWithUser | null> {
        const app = await this.prisma.sellerApplication.findUnique({
            where: { id },
        })
        if (!app) return null

        const user = await this.prisma.user.findUnique({
            where: { id: app.userId },
            include: { profile: true },
        })

        return {
            ...app,
            user,
        }
    }

    async listApplications(params: {
        page: number
        pageSize: number
        status?: ResourceStatusType | undefined
        q?: string | undefined
    }): Promise<{ items: SellerApplicationWithUser[]; totalItems: number }> {
        const where: Prisma.SellerApplicationWhereInput = {}

        if (params.status) {
            where.status = params.status
        }

        if (params.q) {
            where.OR = [
                { shopName: { contains: params.q, mode: 'insensitive' } },
                { shopDescription: { contains: params.q, mode: 'insensitive' } },
            ]
        }

        const [items, totalItems] = await Promise.all([
            this.prisma.sellerApplication.findMany({
                where,
                skip: (params.page - 1) * params.pageSize,
                take: params.pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.sellerApplication.count({ where }),
        ])

        // Nạp thông tin user tương ứng
        const userIds = [...new Set(items.map((i) => i.userId))]
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            include: { profile: true },
        })
        const userMap = new Map(users.map((u) => [u.id, u]))

        const mappedItems: SellerApplicationWithUser[] = items.map((app) => ({
            ...app,
            user: userMap.get(app.userId) ?? null,
        }))

        return { items: mappedItems, totalItems }
    }

    // ===== Commands =====

    // REQ-SEL-001: Nộp đơn và ghi OutboxEvent trong cùng một transaction
    async createApplication(userId: string, input: CreateSellerApplicationInput): Promise<SellerApplication> {
        return this.prisma.$transaction(async (tx) => {
            const application = await tx.sellerApplication.create({
                data: {
                    userId,
                    shopName: input.shopName,
                    shopDescription: input.shopDescription ?? null,
                    idDocumentUrl: input.idDocumentUrl,
                    taxCode: input.taxCode || null,
                    status: ResourceStatus.PENDING,
                },
            })

            // Transactional outbox event (CLAUDE.md luật #3)
            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.SELLER,
                    aggregateId: application.id,
                    eventType: OUTBOX_EVENT.SELLER_APPLICATION_SUBMITTED,
                    payload: {
                        applicationId: application.id,
                        userId,
                        shopName: application.shopName,
                    },
                },
            })

            return application
        })
    }

    // REQ-SEL-006: Duyệt đơn, tạo shop, gán role SELLER cho user và ghi outbox event
    async approveApplication(params: {
        applicationId: string
        reviewedById: string
        shopSlug: string
        warehouseAddressLine?: string | undefined
        provinceCode?: string | undefined
        districtCode?: string | undefined
        wardCode?: string | undefined
    }): Promise<{ application: SellerApplication; profile: SellerProfile } | null> {
        return this.prisma.$transaction(async (tx) => {
            // Concurrency lock (REQ-SEL-008): chỉ update nếu đơn còn PENDING
            const updated = await tx.sellerApplication.updateMany({
                where: {
                    id: params.applicationId,
                    status: ResourceStatus.PENDING,
                },
                data: {
                    status: ResourceStatus.APPROVED,
                    reviewedById: params.reviewedById,
                    reviewedAt: new Date(),
                },
            })

            if (updated.count === 0) {
                return null // Đơn đã được xử lý bởi admin khác
            }

            const application = await tx.sellerApplication.findUniqueOrThrow({
                where: { id: params.applicationId },
            })

            // Tạo SellerProfile mới
            const profile = await tx.sellerProfile.create({
                data: {
                    userId: application.userId,
                    shopName: application.shopName,
                    shopSlug: params.shopSlug,
                    description: application.shopDescription,
                    warehouseAddressLine: params.warehouseAddressLine ?? null,
                    provinceCode: params.provinceCode ?? null,
                    districtCode: params.districtCode ?? null,
                    wardCode: params.wardCode ?? null,
                    status: ResourceStatus.APPROVED,
                },
            })

            // Liên kết đơn đăng ký với profile đã tạo
            await tx.sellerApplication.update({
                where: { id: application.id },
                data: { sellerProfileId: profile.id },
            })

            // Gán role SELLER cho user nếu chưa có
            const user = await tx.user.findUniqueOrThrow({
                where: { id: application.userId },
            })
            if (!user.roles.includes(UserRole.SELLER)) {
                await tx.user.update({
                    where: { id: user.id },
                    data: {
                        roles: [...user.roles, UserRole.SELLER],
                    },
                })
            }

            const sellerRole = await tx.systemRole.findUnique({ where: { name: UserRole.SELLER } })
            if (sellerRole) {
                await tx.userSystemRole.upsert({
                    where: { userId_roleId: { userId: user.id, roleId: sellerRole.id } },
                    update: {},
                    create: { userId: user.id, roleId: sellerRole.id },
                })
            }

            // Ghi OutboxEvent cho seller.application.approved
            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.SELLER,
                    aggregateId: application.id,
                    eventType: OUTBOX_EVENT.SELLER_APPLICATION_APPROVED,
                    payload: {
                        applicationId: application.id,
                        sellerProfileId: profile.id,
                        userId: application.userId,
                        shopSlug: profile.shopSlug,
                    },
                },
            })

            return { application, profile }
        })
    }

    // REQ-SEL-007: Từ chối đơn đăng ký kèm lý do
    async rejectApplication(params: {
        applicationId: string
        reviewedById: string
        reviewNote: string
    }): Promise<SellerApplication | null> {
        return this.prisma.$transaction(async (tx) => {
            // Concurrency lock (REQ-SEL-008): chỉ update nếu đơn còn PENDING
            const updated = await tx.sellerApplication.updateMany({
                where: {
                    id: params.applicationId,
                    status: ResourceStatus.PENDING,
                },
                data: {
                    status: ResourceStatus.REJECTED,
                    reviewedById: params.reviewedById,
                    reviewedAt: new Date(),
                    reviewNote: params.reviewNote,
                },
            })

            if (updated.count === 0) {
                return null // Đơn đã được xử lý bởi admin khác
            }

            const application = await tx.sellerApplication.findUniqueOrThrow({
                where: { id: params.applicationId },
            })

            // Ghi OutboxEvent cho seller.application.rejected
            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.SELLER,
                    aggregateId: application.id,
                    eventType: OUTBOX_EVENT.SELLER_APPLICATION_REJECTED,
                    payload: {
                        applicationId: application.id,
                        userId: application.userId,
                        reviewNote: params.reviewNote,
                    },
                },
            })

            return application
        })
    }

    // REQ-SEL-009: Cập nhật hồ sơ shop của seller
    async updateProfile(userId: string, data: UpdateSellerProfileInput): Promise<SellerProfile> {
        const updateData: Prisma.SellerProfileUpdateInput = {}
        if (data.shopName !== undefined) updateData.shopName = data.shopName
        if (data.description !== undefined) updateData.description = data.description
        if (data.shopLogo !== undefined) updateData.shopLogo = data.shopLogo
        if (data.shopBanner !== undefined) updateData.shopBanner = data.shopBanner
        if (data.warehouseAddressLine !== undefined) updateData.warehouseAddressLine = data.warehouseAddressLine
        if (data.provinceCode !== undefined) updateData.provinceCode = data.provinceCode
        if (data.districtCode !== undefined) updateData.districtCode = data.districtCode
        if (data.wardCode !== undefined) updateData.wardCode = data.wardCode
        if (data.returnPolicyDays !== undefined) updateData.returnPolicyDays = data.returnPolicyDays
        if (data.prepTimeHours !== undefined) updateData.prepTimeHours = data.prepTimeHours

        return this.prisma.sellerProfile.update({
            where: { userId },
            data: updateData,
        })
    }

    // REQ-SEL-015: Cấp huy hiệu xác minh shop
    async verifyShop(profileId: string): Promise<SellerProfile> {
        return this.prisma.sellerProfile.update({
            where: { id: profileId },
            data: {
                isVerified: true,
                verifiedAt: new Date(),
            },
        })
    }

    // REQ-SEL-016: Tạm ngưng shop vi phạm
    async suspendShop(profileId: string, reason: string): Promise<SellerProfile> {
        return this.prisma.$transaction(async (tx) => {
            const profile = await tx.sellerProfile.update({
                where: { id: profileId },
                data: {
                    isSuspended: true,
                    suspendedReason: reason,
                },
            })

            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.SELLER,
                    aggregateId: profile.id,
                    eventType: OUTBOX_EVENT.SELLER_SHOP_SUSPENDED,
                    payload: {
                        sellerProfileId: profile.id,
                        suspendedReason: reason,
                    },
                },
            })

            return profile
        })
    }

    // REQ-SEL-017: Khôi phục shop tạm ngưng
    async restoreShop(profileId: string): Promise<SellerProfile> {
        return this.prisma.$transaction(async (tx) => {
            const profile = await tx.sellerProfile.update({
                where: { id: profileId },
                data: {
                    isSuspended: false,
                    suspendedReason: null,
                },
            })

            await tx.outboxEvent.create({
                data: {
                    aggregateType: OUTBOX_AGGREGATE.SELLER,
                    aggregateId: profile.id,
                    eventType: OUTBOX_EVENT.SELLER_SHOP_RESTORED,
                    payload: {
                        sellerProfileId: profile.id,
                    },
                },
            })

            return profile
        })
    }
}
