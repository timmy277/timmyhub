import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@timmyhub/prisma'
import { PrismaService } from '@timmyhub/prisma'
import type {
    CampaignProductApprovalValue,
    CampaignProductItem,
    CreatePromotionCampaignInput,
    CreateVoucherInput,
    PromotionCampaignDetail,
    PromotionCampaignItem,
    PromotionCampaignListQuery,
    UpdatePromotionCampaignInput,
    UpdateVoucherInput,
    ValidateVoucherInput,
    ValidateVoucherResult,
    VoucherDetail,
    VoucherItem,
    VoucherListQuery,
    VoucherTypeValue,
} from '@timmyhub/contracts'

interface VoucherDbPayload {
    id: string
    code: string
    type: string
    value: Prisma.Decimal | number
    minOrderValue?: Prisma.Decimal | number | null
    maxDiscount?: Prisma.Decimal | number | null
    usageLimit?: number | null
    usedCount: number
    perUserLimit: number
    isActive: boolean
    startDate: Date
    endDate: Date
    description?: string | null
    sellerId?: string | null
    campaignId?: string | null
    campaign?: { name: string } | null
    categoryIds: string[]
    productIds: string[]
    paymentMethods: string[]
    createdAt: Date
    updatedAt: Date
}

@Injectable()
export class PromotionService {
    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // VOUCHER MANAGEMENT
    // ==========================================

    async listAdminVouchers(query: VoucherListQuery): Promise<{
        items: VoucherItem[]
        total: number
        page: number
        pageSize: number
    }> {
        const { page = 1, pageSize = 20, q, type, isActive, scope, sellerId, campaignId } = query
        const skip = (page - 1) * pageSize

        const where: Prisma.VoucherWhereInput = {}

        if (q) {
            where.OR = [
                { code: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
            ]
        }

        if (type) {
            where.type = type
        }

        if (typeof isActive === 'boolean') {
            where.isActive = isActive
        }

        if (scope === 'PLATFORM') {
            where.sellerId = null
        } else if (scope === 'SELLER') {
            where.sellerId = { not: null }
        }

        if (sellerId) {
            where.sellerId = sellerId
        }

        if (campaignId) {
            where.campaignId = campaignId
        }

        const [records, total] = await Promise.all([
            this.prisma.voucher.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    campaign: {
                        select: { name: true },
                    },
                },
            }),
            this.prisma.voucher.count({ where }),
        ])

        const items: VoucherItem[] = records.map((v) => this.mapVoucherRecord(v))

        return { items, total, page, pageSize }
    }

    async getVoucherDetail(id: string): Promise<VoucherDetail> {
        const v = await this.prisma.voucher.findUnique({
            where: { id },
            include: {
                campaign: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        startDate: true,
                        endDate: true,
                        isActive: true,
                    },
                },
                usageLogs: {
                    select: {
                        id: true,
                        discount: true,
                    },
                },
            },
        })

        if (!v) {
            throw new NotFoundException('Không tìm thấy voucher')
        }

        const totalOrdersDiscounted = v.usageLogs.length
        const totalDiscountAmount = v.usageLogs.reduce((sum, log) => sum + Number(log.discount), 0)

        const base = this.mapVoucherRecord(v)

        return {
            ...base,
            campaign: v.campaign
                ? {
                      id: v.campaign.id,
                      name: v.campaign.name,
                      type: v.campaign.type,
                      startDate: v.campaign.startDate.toISOString(),
                      endDate: v.campaign.endDate.toISOString(),
                      isActive: v.campaign.isActive,
                  }
                : null,
            totalOrdersDiscounted,
            totalDiscountAmount,
        }
    }

    async createVoucher(body: CreateVoucherInput, _actorId: string): Promise<VoucherItem> {
        const startDate = new Date(body.startDate)
        const endDate = new Date(body.endDate)

        if (startDate >= endDate) {
            throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc')
        }

        const existing = await this.prisma.voucher.findUnique({
            where: { code: body.code },
        })

        if (existing) {
            throw new ConflictException(`Mã voucher "${body.code}" đã tồn tại`)
        }

        const data: Prisma.VoucherCreateInput = {
            code: body.code,
            type: body.type,
            value: new Prisma.Decimal(body.value),
            perUserLimit: body.perUserLimit ?? 1,
            isActive: body.isActive ?? true,
            startDate,
            endDate,
            categoryIds: body.categoryIds ?? [],
            productIds: body.productIds ?? [],
            paymentMethods: body.paymentMethods ?? [],
        }

        if (body.minOrderValue != null) data.minOrderValue = new Prisma.Decimal(body.minOrderValue)
        if (body.maxDiscount != null) data.maxDiscount = new Prisma.Decimal(body.maxDiscount)
        if (body.usageLimit != null) data.usageLimit = body.usageLimit
        if (body.description != null) data.description = body.description
        if (body.sellerId != null) data.sellerId = body.sellerId
        if (body.campaignId != null) {
            data.campaign = { connect: { id: body.campaignId } }
        }
        if (body.maxUsagePerDevice != null) data.maxUsagePerDevice = body.maxUsagePerDevice

        const created = await this.prisma.voucher.create({
            data,
            include: {
                campaign: {
                    select: { name: true },
                },
            },
        })

        return this.mapVoucherRecord(created)
    }

    async updateVoucher(id: string, body: UpdateVoucherInput, _actorId: string): Promise<VoucherItem> {
        const existing = await this.prisma.voucher.findUnique({ where: { id } })
        if (!existing) {
            throw new NotFoundException('Không tìm thấy voucher')
        }

        if (body.code && body.code !== existing.code) {
            const dup = await this.prisma.voucher.findUnique({ where: { code: body.code } })
            if (dup) {
                throw new ConflictException(`Mã voucher "${body.code}" đã được sử dụng`)
            }
        }

        const startDate = body.startDate ? new Date(body.startDate) : existing.startDate
        const endDate = body.endDate ? new Date(body.endDate) : existing.endDate

        if (startDate >= endDate) {
            throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc')
        }

        const data: Prisma.VoucherUpdateInput = {
            startDate,
            endDate,
        }

        if (body.code !== undefined) data.code = body.code
        if (body.type !== undefined) data.type = body.type
        if (body.value !== undefined) data.value = new Prisma.Decimal(body.value)
        if (body.minOrderValue !== undefined) {
            data.minOrderValue = body.minOrderValue != null ? new Prisma.Decimal(body.minOrderValue) : null
        }
        if (body.maxDiscount !== undefined) {
            data.maxDiscount = body.maxDiscount != null ? new Prisma.Decimal(body.maxDiscount) : null
        }
        if (body.usageLimit !== undefined) data.usageLimit = body.usageLimit
        if (body.perUserLimit !== undefined) data.perUserLimit = body.perUserLimit
        if (body.isActive !== undefined) data.isActive = body.isActive
        if (body.description !== undefined) data.description = body.description
        if (body.sellerId !== undefined) data.sellerId = body.sellerId
        if (body.campaignId !== undefined) {
            if (body.campaignId) {
                data.campaign = { connect: { id: body.campaignId } }
            } else {
                data.campaign = { disconnect: true }
            }
        }
        if (body.categoryIds !== undefined) data.categoryIds = body.categoryIds
        if (body.productIds !== undefined) data.productIds = body.productIds
        if (body.paymentMethods !== undefined) data.paymentMethods = body.paymentMethods
        if (body.maxUsagePerDevice !== undefined) data.maxUsagePerDevice = body.maxUsagePerDevice

        const updated = await this.prisma.voucher.update({
            where: { id },
            data,
            include: {
                campaign: {
                    select: { name: true },
                },
            },
        })

        return this.mapVoucherRecord(updated)
    }

    async toggleVoucherStatus(id: string, isActive: boolean, _actorId: string): Promise<VoucherItem> {
        const existing = await this.prisma.voucher.findUnique({ where: { id } })
        if (!existing) {
            throw new NotFoundException('Không tìm thấy voucher')
        }

        const updated = await this.prisma.voucher.update({
            where: { id },
            data: { isActive },
            include: {
                campaign: {
                    select: { name: true },
                },
            },
        })

        return this.mapVoucherRecord(updated)
    }

    async deleteVoucher(id: string, _actorId: string): Promise<{ success: boolean }> {
        const existing = await this.prisma.voucher.findUnique({
            where: { id },
            include: { usageLogs: { select: { id: true }, take: 1 } },
        })

        if (!existing) {
            throw new NotFoundException('Không tìm thấy voucher')
        }

        // Nếu voucher đã được sử dụng trong đơn hàng, chỉ tắt kích hoạt để bảo toàn audit trail
        if (existing.usageLogs.length > 0 || existing.usedCount > 0) {
            await this.prisma.voucher.update({
                where: { id },
                data: { isActive: false },
            })
            return { success: true }
        }

        await this.prisma.voucher.delete({ where: { id } })
        return { success: true }
    }

    // ==========================================
    // CAMPAIGN MANAGEMENT
    // ==========================================

    async listAdminCampaigns(query: PromotionCampaignListQuery): Promise<{
        items: PromotionCampaignItem[]
        total: number
        page: number
        pageSize: number
    }> {
        const { page = 1, pageSize = 20, q, type, isActive, ownerType } = query
        const skip = (page - 1) * pageSize

        const where: Prisma.PromotionCampaignWhereInput = {}

        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
            ]
        }

        if (type) {
            where.type = type
        }

        if (typeof isActive === 'boolean') {
            where.isActive = isActive
        }

        if (ownerType) {
            where.ownerType = ownerType
        }

        const [records, total] = await Promise.all([
            this.prisma.promotionCampaign.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            campaignProducts: true,
                            vouchers: true,
                        },
                    },
                },
            }),
            this.prisma.promotionCampaign.count({ where }),
        ])

        const items: PromotionCampaignItem[] = records.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description ?? null,
            type: c.type as PromotionCampaignItem['type'],
            ownerType: c.ownerType as PromotionCampaignItem['ownerType'],
            ownerId: c.ownerId ?? null,
            startDate: c.startDate.toISOString(),
            endDate: c.endDate.toISOString(),
            isActive: c.isActive,
            requiresApproval: c.requiresApproval,
            banner: c.banner ?? null,
            icon: c.icon ?? null,
            backgroundColor: c.backgroundColor ?? null,
            titleColor: c.titleColor ?? null,
            badgeText: c.badgeText ?? null,
            createdBy: c.createdBy ?? null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            productCount: c._count.campaignProducts,
            voucherCount: c._count.vouchers,
        }))

        return { items, total, page, pageSize }
    }

    async getCampaignDetail(id: string): Promise<PromotionCampaignDetail> {
        const c = await this.prisma.promotionCampaign.findUnique({
            where: { id },
            include: {
                campaignProducts: {
                    take: 100,
                },
                vouchers: {
                    take: 50,
                },
            },
        })

        if (!c) {
            throw new NotFoundException('Không tìm thấy chiến dịch')
        }

        // Lấy thông tin variant & product cho campaignProducts nếu có
        const variantIds = c.campaignProducts.map((p) => p.variantId)
        const variants =
            variantIds.length > 0
                ? await this.prisma.productVariant.findMany({
                      where: { id: { in: variantIds } },
                      include: {
                          product: {
                              select: {
                                  name: true,
                                  images: true,
                              },
                          },
                      },
                  })
                : []

        const variantMap = new Map(variants.map((v) => [v.id, v]))

        const campaignProducts: CampaignProductItem[] = c.campaignProducts.map((cp) => {
            const v = variantMap.get(cp.variantId)
            return {
                id: cp.id,
                campaignId: cp.campaignId,
                variantId: cp.variantId,
                campaignPrice: cp.campaignPrice != null ? Number(cp.campaignPrice) : null,
                discountPercent: cp.discountPercent ?? null,
                maxQuantity: cp.maxQuantity ?? null,
                soldQuantity: cp.soldQuantity,
                approvalStatus: cp.approvalStatus as CampaignProductApprovalValue,
                productName: v?.product?.name,
                variantSku: v?.sku,
                originalPrice: v ? Number(v.price) : undefined,
                imageUrl: v?.product?.images?.[0],
            }
        })

        const vouchers: VoucherItem[] = c.vouchers.map((v) => this.mapVoucherRecord(v))

        return {
            id: c.id,
            name: c.name,
            description: c.description ?? null,
            type: c.type as PromotionCampaignItem['type'],
            ownerType: c.ownerType as PromotionCampaignItem['ownerType'],
            ownerId: c.ownerId ?? null,
            startDate: c.startDate.toISOString(),
            endDate: c.endDate.toISOString(),
            isActive: c.isActive,
            requiresApproval: c.requiresApproval,
            banner: c.banner ?? null,
            icon: c.icon ?? null,
            backgroundColor: c.backgroundColor ?? null,
            titleColor: c.titleColor ?? null,
            badgeText: c.badgeText ?? null,
            createdBy: c.createdBy ?? null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
            productCount: c.campaignProducts.length,
            voucherCount: c.vouchers.length,
            campaignProducts,
            vouchers,
        }
    }

    async createCampaign(body: CreatePromotionCampaignInput, actorId: string): Promise<PromotionCampaignItem> {
        const startDate = new Date(body.startDate)
        const endDate = new Date(body.endDate)

        if (startDate >= endDate) {
            throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc')
        }

        const data: Prisma.PromotionCampaignCreateInput = {
            name: body.name,
            type: body.type,
            ownerType: body.ownerType ?? 'PLATFORM',
            startDate,
            endDate,
            isActive: body.isActive ?? true,
            requiresApproval: body.requiresApproval ?? false,
        }

        if (body.description != null) data.description = body.description
        if (body.ownerId != null) data.ownerId = body.ownerId
        if (body.banner != null) data.banner = body.banner
        if (body.icon != null) data.icon = body.icon
        if (body.backgroundColor != null) data.backgroundColor = body.backgroundColor
        if (body.titleColor != null) data.titleColor = body.titleColor
        if (body.badgeText != null) data.badgeText = body.badgeText
        if (actorId != null) data.createdBy = actorId

        const created = await this.prisma.promotionCampaign.create({
            data,
        })

        return {
            id: created.id,
            name: created.name,
            description: created.description ?? null,
            type: created.type as PromotionCampaignItem['type'],
            ownerType: created.ownerType as PromotionCampaignItem['ownerType'],
            ownerId: created.ownerId ?? null,
            startDate: created.startDate.toISOString(),
            endDate: created.endDate.toISOString(),
            isActive: created.isActive,
            requiresApproval: created.requiresApproval,
            banner: created.banner ?? null,
            icon: created.icon ?? null,
            backgroundColor: created.backgroundColor ?? null,
            titleColor: created.titleColor ?? null,
            badgeText: created.badgeText ?? null,
            createdBy: created.createdBy ?? null,
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
            productCount: 0,
            voucherCount: 0,
        }
    }

    async updateCampaign(
        id: string,
        body: UpdatePromotionCampaignInput,
        _actorId: string,
    ): Promise<PromotionCampaignItem> {
        const existing = await this.prisma.promotionCampaign.findUnique({ where: { id } })
        if (!existing) {
            throw new NotFoundException('Không tìm thấy chiến dịch')
        }

        const startDate = body.startDate ? new Date(body.startDate) : existing.startDate
        const endDate = body.endDate ? new Date(body.endDate) : existing.endDate

        if (startDate >= endDate) {
            throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc')
        }

        const data: Prisma.PromotionCampaignUpdateInput = {
            startDate,
            endDate,
        }

        if (body.name !== undefined) data.name = body.name
        if (body.description !== undefined) data.description = body.description
        if (body.type !== undefined) data.type = body.type
        if (body.ownerType !== undefined) data.ownerType = body.ownerType
        if (body.ownerId !== undefined) data.ownerId = body.ownerId
        if (body.isActive !== undefined) data.isActive = body.isActive
        if (body.requiresApproval !== undefined) data.requiresApproval = body.requiresApproval
        if (body.banner !== undefined) data.banner = body.banner
        if (body.icon !== undefined) data.icon = body.icon
        if (body.backgroundColor !== undefined) data.backgroundColor = body.backgroundColor
        if (body.titleColor !== undefined) data.titleColor = body.titleColor
        if (body.badgeText !== undefined) data.badgeText = body.badgeText

        const updated = await this.prisma.promotionCampaign.update({
            where: { id },
            data,
            include: {
                _count: {
                    select: {
                        campaignProducts: true,
                        vouchers: true,
                    },
                },
            },
        })

        return {
            id: updated.id,
            name: updated.name,
            description: updated.description ?? null,
            type: updated.type as PromotionCampaignItem['type'],
            ownerType: updated.ownerType as PromotionCampaignItem['ownerType'],
            ownerId: updated.ownerId ?? null,
            startDate: updated.startDate.toISOString(),
            endDate: updated.endDate.toISOString(),
            isActive: updated.isActive,
            requiresApproval: updated.requiresApproval,
            banner: updated.banner ?? null,
            icon: updated.icon ?? null,
            backgroundColor: updated.backgroundColor ?? null,
            titleColor: updated.titleColor ?? null,
            badgeText: updated.badgeText ?? null,
            createdBy: updated.createdBy ?? null,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            productCount: updated._count.campaignProducts,
            voucherCount: updated._count.vouchers,
        }
    }

    async toggleCampaignStatus(id: string, isActive: boolean, _actorId: string): Promise<PromotionCampaignItem> {
        const existing = await this.prisma.promotionCampaign.findUnique({ where: { id } })
        if (!existing) {
            throw new NotFoundException('Không tìm thấy chiến dịch')
        }

        const updated = await this.prisma.promotionCampaign.update({
            where: { id },
            data: { isActive },
            include: {
                _count: {
                    select: {
                        campaignProducts: true,
                        vouchers: true,
                    },
                },
            },
        })

        return {
            id: updated.id,
            name: updated.name,
            description: updated.description ?? null,
            type: updated.type as PromotionCampaignItem['type'],
            ownerType: updated.ownerType as PromotionCampaignItem['ownerType'],
            ownerId: updated.ownerId ?? null,
            startDate: updated.startDate.toISOString(),
            endDate: updated.endDate.toISOString(),
            isActive: updated.isActive,
            requiresApproval: updated.requiresApproval,
            banner: updated.banner ?? null,
            icon: updated.icon ?? null,
            backgroundColor: updated.backgroundColor ?? null,
            titleColor: updated.titleColor ?? null,
            badgeText: updated.badgeText ?? null,
            createdBy: updated.createdBy ?? null,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            productCount: updated._count.campaignProducts,
            voucherCount: updated._count.vouchers,
        }
    }

    async deleteCampaign(id: string, _actorId: string): Promise<{ success: boolean }> {
        const existing = await this.prisma.promotionCampaign.findUnique({ where: { id } })
        if (!existing) {
            throw new NotFoundException('Không tìm thấy chiến dịch')
        }

        // Tách voucher ra khỏi campaign trước khi xóa (onDelete là SetNull)
        await this.prisma.voucher.updateMany({
            where: { campaignId: id },
            data: { campaignId: null },
        })

        await this.prisma.promotionCampaign.delete({ where: { id } })
        return { success: true }
    }

    async reviewCampaignProduct(
        campaignId: string,
        campaignProductId: string,
        status: CampaignProductApprovalValue,
    ): Promise<CampaignProductItem> {
        const cp = await this.prisma.campaignProduct.findFirst({
            where: { id: campaignProductId, campaignId },
        })

        if (!cp) {
            throw new NotFoundException('Không tìm thấy sản phẩm trong chiến dịch')
        }

        const updated = await this.prisma.campaignProduct.update({
            where: { id: campaignProductId },
            data: { approvalStatus: status },
        })

        return {
            id: updated.id,
            campaignId: updated.campaignId,
            variantId: updated.variantId,
            campaignPrice: cp.campaignPrice != null ? Number(cp.campaignPrice) : null,
            discountPercent: updated.discountPercent ?? null,
            maxQuantity: updated.maxQuantity ?? null,
            soldQuantity: updated.soldQuantity,
            approvalStatus: updated.approvalStatus as CampaignProductApprovalValue,
        }
    }

    // ==========================================
    // SHOPPER CHECKOUT & VALIDATION
    // ==========================================

    async validateVoucherForCheckout(input: ValidateVoucherInput, userId?: string): Promise<ValidateVoucherResult> {
        const code = input.code.trim().toUpperCase()
        const voucher = await this.prisma.voucher.findUnique({
            where: { code },
            include: { campaign: { select: { name: true } } },
        })

        if (!voucher) {
            throw new BadRequestException('Mã voucher không tồn tại')
        }

        if (!voucher.isActive) {
            throw new BadRequestException('Mã voucher hiện đang bị tạm khóa')
        }

        const now = new Date()
        if (voucher.startDate > now) {
            throw new BadRequestException('Mã voucher chưa đến thời gian áp dụng')
        }
        if (voucher.endDate < now) {
            throw new BadRequestException('Mã voucher đã hết hạn sử dụng')
        }

        if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) {
            throw new BadRequestException('Mã voucher đã hết lượt sử dụng')
        }

        if (userId && voucher.perUserLimit) {
            const userUsedCount = await this.prisma.voucherUsageLog.count({
                where: { voucherId: voucher.id, userId },
            })
            if (userUsedCount >= voucher.perUserLimit) {
                throw new BadRequestException(`Bạn đã sử dụng tối đa (${voucher.perUserLimit} lần) mã voucher này`)
            }
        }

        if (voucher.minOrderValue != null && input.subtotal < Number(voucher.minOrderValue)) {
            throw new BadRequestException(
                `Đơn hàng chưa đạt giá trị tối thiểu ${new Intl.NumberFormat('vi-VN').format(Number(voucher.minOrderValue))} ₫`,
            )
        }

        if (voucher.sellerId && input.shopIds && input.shopIds.length > 0) {
            if (!input.shopIds.includes(voucher.sellerId)) {
                throw new BadRequestException('Mã voucher này không áp dụng cho gian hàng bạn đang mua')
            }
        }

        if (voucher.paymentMethods && voucher.paymentMethods.length > 0 && input.paymentMethod) {
            if (!voucher.paymentMethods.includes(input.paymentMethod)) {
                throw new BadRequestException('Mã voucher không áp dụng cho phương thức thanh toán đã chọn')
            }
        }

        // Tính số tiền giảm giá
        let discountAmount = 0
        const subtotal = input.subtotal
        if (voucher.type === 'PERCENTAGE') {
            const rawDiscount = subtotal * (Number(voucher.value) / 100)
            discountAmount =
                voucher.maxDiscount != null ? Math.min(rawDiscount, Number(voucher.maxDiscount)) : rawDiscount
        } else if (voucher.type === 'FIXED_AMOUNT') {
            discountAmount = Math.min(Number(voucher.value), subtotal)
        } else if (voucher.type === 'FREE_SHIPPING') {
            discountAmount = Math.min(Number(voucher.value), 30000)
        }

        discountAmount = Math.round(discountAmount)
        const finalTotal = Math.max(0, subtotal - discountAmount)

        return {
            valid: true,
            voucher: {
                id: voucher.id,
                code: voucher.code,
                type: voucher.type,
                value: Number(voucher.value),
                minOrderValue: voucher.minOrderValue != null ? Number(voucher.minOrderValue) : null,
                maxDiscount: voucher.maxDiscount != null ? Number(voucher.maxDiscount) : null,
                description: voucher.description ?? null,
                campaignName: voucher.campaign?.name ?? null,
            },
            discountAmount,
            finalTotal,
        }
    }

    async getAvailableVouchersForCheckout(_subtotal?: number, _userId?: string): Promise<VoucherItem[]> {
        const now = new Date()
        const vouchers = await this.prisma.voucher.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            orderBy: [{ value: 'desc' }, { createdAt: 'desc' }],
            take: 30,
            include: { campaign: { select: { name: true } } },
        })

        const available = vouchers.filter((v) => {
            if (v.usageLimit != null && v.usedCount >= v.usageLimit) return false
            return true
        })

        return available.map((v) => this.mapVoucherRecord(v as unknown as VoucherDbPayload))
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private mapVoucherRecord(v: VoucherDbPayload): VoucherItem {
        return {
            id: v.id,
            code: v.code,
            type: v.type as VoucherTypeValue,
            value: Number(v.value),
            minOrderValue: v.minOrderValue != null ? Number(v.minOrderValue) : null,
            maxDiscount: v.maxDiscount != null ? Number(v.maxDiscount) : null,
            usageLimit: v.usageLimit ?? null,
            usedCount: v.usedCount,
            perUserLimit: v.perUserLimit,
            isActive: v.isActive,
            startDate: v.startDate.toISOString(),
            endDate: v.endDate.toISOString(),
            description: v.description ?? null,
            sellerId: v.sellerId ?? null,
            campaignId: v.campaignId ?? null,
            campaignName: v.campaign?.name ?? null,
            categoryIds: v.categoryIds,
            productIds: v.productIds,
            paymentMethods: v.paymentMethods,
            createdAt: v.createdAt.toISOString(),
            updatedAt: v.updatedAt.toISOString(),
        }
    }
}
