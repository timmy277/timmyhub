import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleDestroy,
    OnModuleInit,
    Optional,
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { Address, OrderItem, OrderStatus } from '@timmyhub/prisma'
import { PaymentStatus, Prisma, PrismaService } from '@timmyhub/prisma'
import type {
    AddressDetail,
    CheckoutInput,
    CheckoutResult,
    CreateAddressInput,
    OrderDetail,
    OrderItemDetail,
    OrderVoucherDetail,
    UpdateAddressInput,
} from '@timmyhub/contracts'
import { ORDER_STATUS } from '@timmyhub/contracts'

import type { OrderWithRelations } from './order.repository'
import { OrderRepository } from './order.repository'
import { VnpayService } from './vnpay.service'

@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OrderService.name)
    private cleanupTimer: NodeJS.Timeout | null = null

    constructor(
        private readonly prisma: PrismaService,
        private readonly orderRepo: OrderRepository,
        private readonly vnpayService: VnpayService,
        @Optional() private readonly eventEmitter?: EventEmitter2,
    ) {}

    onModuleInit(): void {
        // Quét đơn quá hạn sau 10s khởi động, sau đó lặp lại mỗi 60 giây
        setTimeout(() => void this.cancelExpiredOrders(), 10000)
        this.cleanupTimer = setInterval(() => void this.cancelExpiredOrders(), 60000)
    }

    onModuleDestroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer)
            this.cleanupTimer = null
        }
    }

    // ===== Address Management =====

    async getAddresses(userId: string): Promise<AddressDetail[]> {
        const addresses = await this.orderRepo.findAddressesByUserId(userId)
        return addresses.map((a) => this.formatAddress(a))
    }

    async createAddress(userId: string, input: CreateAddressInput): Promise<AddressDetail> {
        // Nếu đặt làm mặc định hoặc đây là địa chỉ đầu tiên của user
        const existing = await this.orderRepo.findAddressesByUserId(userId)
        const isDefault = input.isDefault || existing.length === 0

        if (isDefault && existing.length > 0) {
            await this.orderRepo.clearDefaultAddresses(userId)
        }

        const address = await this.orderRepo.createAddress({
            userId,
            fullName: input.fullName,
            phone: input.phone,
            provinceCode: input.provinceCode,
            provinceName: input.provinceName,
            districtCode: input.districtCode,
            districtName: input.districtName,
            wardCode: input.wardCode,
            wardName: input.wardName,
            addressLine1: input.addressLine1,
            addressLine2: input.addressLine2 ?? null,
            label: input.label ?? null,
            isDefault,
        })

        return this.formatAddress(address)
    }

    async updateAddress(userId: string, addressId: string, input: UpdateAddressInput): Promise<AddressDetail> {
        const existing = await this.orderRepo.findAddressById(userId, addressId)
        if (!existing) {
            throw new NotFoundException('Không tìm thấy địa chỉ')
        }

        if (input.isDefault) {
            await this.orderRepo.clearDefaultAddresses(userId, addressId)
        }

        const data: Prisma.AddressUpdateInput = {}
        if (input.fullName !== undefined) data.fullName = input.fullName
        if (input.phone !== undefined) data.phone = input.phone
        if (input.provinceCode !== undefined) data.provinceCode = input.provinceCode
        if (input.provinceName !== undefined) data.provinceName = input.provinceName
        if (input.districtCode !== undefined) data.districtCode = input.districtCode
        if (input.districtName !== undefined) data.districtName = input.districtName
        if (input.wardCode !== undefined) data.wardCode = input.wardCode
        if (input.wardName !== undefined) data.wardName = input.wardName
        if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1
        if (input.addressLine2 !== undefined) data.addressLine2 = input.addressLine2 ?? null
        if (input.label !== undefined) data.label = input.label ?? null
        if (input.isDefault !== undefined) data.isDefault = input.isDefault

        const updated = await this.orderRepo.updateAddress(addressId, data)

        return this.formatAddress(updated)
    }

    async deleteAddress(userId: string, addressId: string): Promise<{ success: boolean }> {
        const existing = await this.orderRepo.findAddressById(userId, addressId)
        if (!existing) {
            throw new NotFoundException('Không tìm thấy địa chỉ')
        }

        await this.orderRepo.deleteAddress(addressId)

        // Nếu xoá địa chỉ mặc định mà còn địa chỉ khác, gán cái đầu tiên làm mặc định
        if (existing.isDefault) {
            const remaining = await this.orderRepo.findAddressesByUserId(userId)
            if (remaining.length > 0) {
                await this.orderRepo.updateAddress(remaining[0]!.id, { isDefault: true })
            }
        }

        return { success: true }
    }

    async setDefaultAddress(userId: string, addressId: string): Promise<AddressDetail> {
        const existing = await this.orderRepo.findAddressById(userId, addressId)
        if (!existing) {
            throw new NotFoundException('Không tìm thấy địa chỉ')
        }

        await this.orderRepo.clearDefaultAddresses(userId, addressId)
        const updated = await this.orderRepo.updateAddress(addressId, { isDefault: true })
        return this.formatAddress(updated)
    }

    // ===== Checkout & Orders =====

    async checkout(
        userId: string,
        input: CheckoutInput,
        idempotencyKeyHeader?: string,
        clientIp = '127.0.0.1',
    ): Promise<CheckoutResult> {
        const key = idempotencyKeyHeader || input.idempotencyKey

        // 1. Kiểm tra Idempotency để chống duplicate submit
        if (key) {
            const existingOrders = await this.orderRepo.findOrdersByIdempotencyPrefix(key)
            if (existingOrders.length > 0) {
                const totalAmount = existingOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0).toString()
                let paymentUrl: string | null = null

                if (existingOrders[0]!.paymentMethod === 'VNPAY') {
                    const existingPayment = await this.prisma.payment.findUnique({
                        where: { orderId: existingOrders[0]!.id },
                    })
                    if (!existingPayment || existingPayment.status === 'PENDING') {
                        const vnpayRes = await this.vnpayService.createPaymentUrl(
                            existingOrders.map((o) => ({ id: o.id, totalAmount: o.totalAmount })),
                            clientIp,
                        )
                        paymentUrl = vnpayRes.url
                    }
                }

                return {
                    orders: await this.attachVoucherDetailsToOrders(existingOrders),
                    totalAmount,
                    paymentMethod: existingOrders[0]!.paymentMethod,
                    paymentUrl,
                }
            }
        }

        // 2. Chạy toàn bộ giao dịch Checkout trong Prisma ACID $transaction
        const createdOrders = await this.prisma.$transaction(
            async (tx) => {
                // Bước A: Xác định địa chỉ giao hàng
                let address: Address
                if (input.newAddress) {
                    // Tạo địa chỉ mới
                    const isDefault = input.newAddress.isDefault || false
                    if (isDefault) {
                        await tx.address.updateMany({
                            where: { userId, isDefault: true },
                            data: { isDefault: false },
                        })
                    }
                    address = await tx.address.create({
                        data: {
                            userId,
                            fullName: input.newAddress.fullName,
                            phone: input.newAddress.phone,
                            provinceCode: input.newAddress.provinceCode,
                            provinceName: input.newAddress.provinceName,
                            districtCode: input.newAddress.districtCode,
                            districtName: input.newAddress.districtName,
                            wardCode: input.newAddress.wardCode,
                            wardName: input.newAddress.wardName,
                            addressLine1: input.newAddress.addressLine1,
                            addressLine2: input.newAddress.addressLine2 ?? null,
                            label: input.newAddress.label ?? null,
                            isDefault,
                        },
                    })
                } else if (input.addressId) {
                    const foundAddress = await tx.address.findFirst({
                        where: { id: input.addressId, userId },
                    })
                    if (!foundAddress) {
                        throw new BadRequestException('Địa chỉ giao hàng không hợp lệ')
                    }
                    address = foundAddress
                } else {
                    // Lấy địa chỉ mặc định của user
                    const defaultAddress = await tx.address.findFirst({
                        where: { userId },
                        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
                    })
                    if (!defaultAddress) {
                        throw new BadRequestException('Vui lòng cung cấp địa chỉ nhận hàng')
                    }
                    address = defaultAddress
                }

                // Bước B: Xác định danh sách mặt hàng cần mua
                let orderLineItems: Array<{ variantId: string; quantity: number; cartItemId?: string }> = []

                if (input.directItem) {
                    // Luồng "Mua ngay"
                    orderLineItems = [
                        {
                            variantId: input.directItem.variantId,
                            quantity: input.directItem.quantity,
                        },
                    ]
                } else {
                    // Luồng Checkout từ giỏ hàng
                    const cart = await tx.cart.findUnique({
                        where: { userId },
                        include: { items: true },
                    })

                    if (!cart || cart.items.length === 0) {
                        throw new BadRequestException('Giỏ hàng trống, không thể thanh toán')
                    }

                    const selectedCartItems =
                        input.cartItemIds && input.cartItemIds.length > 0
                            ? cart.items.filter((item) => input.cartItemIds!.includes(item.id))
                            : cart.items

                    if (selectedCartItems.length === 0) {
                        throw new BadRequestException('Vui lòng chọn ít nhất một sản phẩm để thanh toán')
                    }

                    orderLineItems = selectedCartItems.map((item) => ({
                        variantId: item.variantId,
                        quantity: item.quantity,
                        cartItemId: item.id,
                    }))
                }

                // Bước C: Khóa và kiểm tra các variants & tồn kho
                const variantIds = orderLineItems.map((item) => item.variantId)
                const variants = await tx.productVariant.findMany({
                    where: { id: { in: variantIds } },
                    include: {
                        product: true,
                        inventory: true,
                    },
                })

                const variantMap = new Map(variants.map((v) => [v.id, v]))

                // Lấy option values để sinh nhãn variant
                const allOptionValueIds = Array.from(
                    new Set(variants.flatMap((v) => (v.optionKey ? v.optionKey.split(':') : [])).filter(Boolean)),
                )
                const optionValues =
                    allOptionValueIds.length > 0
                        ? await tx.productOptionValue.findMany({
                              where: { id: { in: allOptionValueIds } },
                              include: { option: true },
                          })
                        : []
                const optionValueMap = new Map(optionValues.map((ov) => [ov.id, `${ov.option.name}: ${ov.value}`]))

                // Nhóm theo shopId
                const shopGroups = new Map<
                    string,
                    Array<{
                        variant: (typeof variants)[number]
                        quantity: number
                        unitPrice: Prisma.Decimal
                        lineTotal: Prisma.Decimal
                        variantLabel: string
                        imageUrl: string
                    }>
                >()

                for (const item of orderLineItems) {
                    const variant = variantMap.get(item.variantId)
                    if (!variant) {
                        throw new BadRequestException(`Biến thể sản phẩm không tồn tại (ID: ${item.variantId})`)
                    }

                    const product = variant.product
                    if (product.status !== 'APPROVED' || product.isSuspended || !variant.isActive) {
                        throw new BadRequestException(`Sản phẩm "${product.name}" hiện không còn mở bán`)
                    }

                    // Kiểm tra tồn kho
                    const availableStock = variant.inventory
                        ? Math.max(0, variant.inventory.onHand - variant.inventory.reserved)
                        : 0

                    if (availableStock < item.quantity) {
                        throw new BadRequestException(
                            `Sản phẩm "${product.name}" (${variant.sku}) chỉ còn ${availableStock} sản phẩm, không đủ số lượng yêu cầu (${item.quantity})`,
                        )
                    }

                    const unitPrice = variant.price
                    const lineTotal = new Prisma.Decimal(unitPrice).mul(item.quantity)

                    // Nhãn thuộc tính
                    const variantLabel = variant.optionKey
                        ? variant.optionKey
                              .split(':')
                              .map((ovId) => optionValueMap.get(ovId) || '')
                              .filter(Boolean)
                              .join(', ') || 'Mặc định'
                        : 'Mặc định'

                    const imageUrl =
                        product.images && product.images.length > 0
                            ? product.images[0]!
                            : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'

                    const shopItems = shopGroups.get(product.shopId) || []
                    shopItems.push({
                        variant,
                        quantity: item.quantity,
                        unitPrice,
                        lineTotal,
                        variantLabel,
                        imageUrl,
                    })
                    shopGroups.set(product.shopId, shopItems)
                }

                // Lấy thông tin các shops
                const shopIds = Array.from(shopGroups.keys())
                const shops = await tx.sellerProfile.findMany({
                    where: { id: { in: shopIds } },
                })
                const shopMap = new Map(shops.map((s) => [s.id, { shopName: s.shopName, shopSlug: s.shopSlug }]))

                const ordersList: Array<OrderWithRelations & { shopName: string; shopSlug?: string | undefined }> = []
                const baseIdempotency = key || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

                // Bước C.2: Xác thực & tính toán voucher đa tầng (Shopee-Style: Freeship + Sàn + Shop)
                const rawCodes: string[] = []
                const inputVoucherCodes: unknown = input.voucherCodes
                if (Array.isArray(inputVoucherCodes)) {
                    for (const c of inputVoucherCodes) {
                        if (typeof c === 'string' && c.trim()) {
                            rawCodes.push(c.trim())
                        }
                    }
                }
                const inputVoucherCode: unknown = input.voucherCode
                if (typeof inputVoucherCode === 'string') {
                    const singleCode = inputVoucherCode.trim()
                    if (singleCode && !rawCodes.includes(singleCode)) {
                        rawCodes.push(singleCode)
                    }
                }
                const voucherCodes = Array.from(new Set(rawCodes.map((c) => c.toUpperCase()))).filter(Boolean)

                const appliedVouchers: Array<{
                    id: string
                    code: string
                    type: string
                    value: Prisma.Decimal
                    maxDiscount: Prisma.Decimal | null
                    sellerId: string | null
                    paymentMethods: string[]
                    minOrderValue: Prisma.Decimal | null
                }> = []

                const now = new Date()
                const overallSubtotal = Array.from(shopGroups.values()).reduce(
                    (sum, items) => sum.add(items.reduce((acc, it) => acc.add(it.lineTotal), new Prisma.Decimal(0))),
                    new Prisma.Decimal(0),
                )

                for (const vCode of voucherCodes) {
                    const voucher = await tx.voucher.findUnique({
                        where: { code: vCode },
                    })

                    if (!voucher) {
                        throw new BadRequestException(`Mã voucher "${vCode}" không tồn tại`)
                    }

                    if (!voucher.isActive) {
                        throw new BadRequestException(`Mã voucher "${vCode}" hiện đang bị khóa`)
                    }

                    if (voucher.startDate > now) {
                        throw new BadRequestException(`Mã voucher "${vCode}" chưa đến thời gian áp dụng`)
                    }
                    if (voucher.endDate < now) {
                        throw new BadRequestException(`Mã voucher "${vCode}" đã hết hạn sử dụng`)
                    }

                    if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) {
                        throw new BadRequestException(`Mã voucher "${vCode}" đã hết lượt sử dụng`)
                    }

                    if (voucher.perUserLimit) {
                        const userUsedCount = await tx.voucherUsageLog.count({
                            where: { voucherId: voucher.id, userId },
                        })
                        if (userUsedCount >= voucher.perUserLimit) {
                            throw new BadRequestException(
                                `Bạn đã sử dụng tối đa (${voucher.perUserLimit} lần) mã voucher "${vCode}"`,
                            )
                        }
                    }

                    if (voucher.paymentMethods.length > 0 && !voucher.paymentMethods.includes(input.paymentMethod)) {
                        throw new BadRequestException(
                            `Mã voucher "${vCode}" không áp dụng cho phương thức thanh toán đã chọn`,
                        )
                    }

                    if (voucher.sellerId) {
                        const shopItems = shopGroups.get(voucher.sellerId)
                        if (!shopItems || shopItems.length === 0) {
                            throw new BadRequestException(
                                `Mã voucher "${vCode}" chỉ áp dụng cho sản phẩm của shop tương ứng`,
                            )
                        }
                        const shopSubtotal = shopItems.reduce((acc, it) => acc.add(it.lineTotal), new Prisma.Decimal(0))
                        if (voucher.minOrderValue != null && shopSubtotal.lessThan(voucher.minOrderValue)) {
                            throw new BadRequestException(
                                `Đơn hàng tại Shop chưa đạt giá trị tối thiểu để áp dụng voucher "${vCode}"`,
                            )
                        }
                    } else {
                        if (voucher.minOrderValue != null && overallSubtotal.lessThan(voucher.minOrderValue)) {
                            throw new BadRequestException(
                                `Đơn hàng chưa đạt giá trị tối thiểu để áp dụng voucher "${vCode}"`,
                            )
                        }
                    }

                    // Quy tắc xếp chồng Shopee: Tối đa 1 Freeship, 1 mã sàn TimmyHub, 1 mã cho mỗi Shop
                    if (voucher.type === 'FREE_SHIPPING') {
                        const hasFreeship = appliedVouchers.some((v) => v.type === 'FREE_SHIPPING')
                        if (hasFreeship) {
                            throw new BadRequestException(
                                'Chỉ được áp dụng tối đa 1 mã miễn phí vận chuyển cho mỗi đơn hàng',
                            )
                        }
                    } else if (!voucher.sellerId) {
                        const hasPlatform = appliedVouchers.some((v) => v.type !== 'FREE_SHIPPING' && !v.sellerId)
                        if (hasPlatform) {
                            throw new BadRequestException(
                                'Chỉ được áp dụng tối đa 1 mã giảm giá TimmyHub cho mỗi đơn hàng',
                            )
                        }
                    } else {
                        const hasShopVoucher = appliedVouchers.some((v) => v.sellerId === voucher.sellerId)
                        if (hasShopVoucher) {
                            throw new BadRequestException('Chỉ được áp dụng tối đa 1 mã giảm giá của Shop này')
                        }
                    }

                    appliedVouchers.push(voucher)
                }

                // Phí vận chuyển tiêu chuẩn 30.000₫ cho mỗi shop trong đơn
                const standardShippingPerShop = new Prisma.Decimal(30000)
                const totalStandardShipping = standardShippingPerShop.mul(shopGroups.size)

                // 1. Tính mức giảm phí vận chuyển (Freeship)
                const freeshipVoucher = appliedVouchers.find((v) => v.type === 'FREE_SHIPPING')
                let totalShippingDiscount = new Prisma.Decimal(0)
                if (freeshipVoucher) {
                    const cap = freeshipVoucher.value.greaterThan(0) ? freeshipVoucher.value : totalStandardShipping
                    totalShippingDiscount = totalStandardShipping.greaterThan(cap) ? cap : totalStandardShipping
                }

                // 2. Tính mức giảm giá của từng Shop
                const shopDiscountMap = new Map<
                    string,
                    { voucher: (typeof appliedVouchers)[0]; amount: Prisma.Decimal }
                >()
                for (const v of appliedVouchers) {
                    if (v.type !== 'FREE_SHIPPING' && v.sellerId) {
                        const items = shopGroups.get(v.sellerId) || []
                        const shopSub = items.reduce((acc, it) => acc.add(it.lineTotal), new Prisma.Decimal(0))
                        let disc = new Prisma.Decimal(0)
                        if (v.type === 'PERCENTAGE') {
                            const raw = shopSub.mul(v.value).div(100)
                            disc = v.maxDiscount != null && raw.greaterThan(v.maxDiscount) ? v.maxDiscount : raw
                        } else {
                            disc = shopSub.greaterThan(v.value) ? v.value : shopSub
                        }
                        shopDiscountMap.set(v.sellerId, { voucher: v, amount: disc })
                    }
                }

                // 3. Tính mức giảm giá sàn TimmyHub
                const platformVoucher = appliedVouchers.find((v) => v.type !== 'FREE_SHIPPING' && !v.sellerId)
                let totalPlatformDiscount = new Prisma.Decimal(0)
                if (platformVoucher) {
                    if (platformVoucher.type === 'PERCENTAGE') {
                        const raw = overallSubtotal.mul(platformVoucher.value).div(100)
                        totalPlatformDiscount =
                            platformVoucher.maxDiscount != null && raw.greaterThan(platformVoucher.maxDiscount)
                                ? platformVoucher.maxDiscount
                                : raw
                    } else {
                        totalPlatformDiscount = overallSubtotal.greaterThan(platformVoucher.value)
                            ? platformVoucher.value
                            : overallSubtotal
                    }
                }

                // Bước D: Tạo từng Order cho từng Shop và phân bổ ưu đãi chính xác
                let remainingShippingDiscount = totalShippingDiscount
                let remainingPlatformDiscount = totalPlatformDiscount
                let shopIndex = 0

                for (const [shopId, items] of shopGroups.entries()) {
                    shopIndex++
                    const subtotal = items.reduce((acc, it) => acc.add(it.lineTotal), new Prisma.Decimal(0))

                    // Giảm phí vận chuyển cho shop này (tối đa 30.000₫)
                    const shopShippingDiscount = remainingShippingDiscount.greaterThan(standardShippingPerShop)
                        ? standardShippingPerShop
                        : remainingShippingDiscount
                    remainingShippingDiscount = remainingShippingDiscount.sub(shopShippingDiscount)
                    const netShippingFee = standardShippingPerShop.sub(shopShippingDiscount)

                    // Giảm giá từ shop voucher
                    const shopVoucherEntry = shopDiscountMap.get(shopId)
                    const shopDiscount = shopVoucherEntry ? shopVoucherEntry.amount : new Prisma.Decimal(0)

                    // Giảm giá từ sàn TimmyHub (phân bổ phần còn lại của shop)
                    const availableForPlatform = subtotal.sub(shopDiscount)
                    let shopPlatformDiscount = new Prisma.Decimal(0)
                    if (availableForPlatform.greaterThan(0)) {
                        shopPlatformDiscount = remainingPlatformDiscount.greaterThan(availableForPlatform)
                            ? availableForPlatform
                            : remainingPlatformDiscount
                        remainingPlatformDiscount = remainingPlatformDiscount.sub(shopPlatformDiscount)
                    }

                    const orderVoucherDiscount = shopShippingDiscount.add(shopDiscount).add(shopPlatformDiscount)
                    const rawTotal = subtotal.add(netShippingFee).sub(shopDiscount).sub(shopPlatformDiscount)
                    const totalAmount = rawTotal.greaterThan(0) ? rawTotal : new Prisma.Decimal(0)
                    const orderKey = `${baseIdempotency}-${shopIndex}`

                    const fullAddressString = [
                        address.addressLine1,
                        address.addressLine2,
                        address.wardName,
                        address.districtName,
                        address.provinceName,
                    ]
                        .filter(Boolean)
                        .join(', ')

                    const primaryVoucherId =
                        platformVoucher?.id || shopVoucherEntry?.voucher.id || freeshipVoucher?.id || null

                    const order = await tx.order.create({
                        data: {
                            buyerId: userId,
                            sellerId: shopId,
                            status: 'PENDING',
                            totalAmount,
                            currency: 'VND',
                            voucherId: orderVoucherDiscount.greaterThan(0) ? primaryVoucherId : null,
                            voucherDiscount: orderVoucherDiscount.greaterThan(0) ? orderVoucherDiscount : null,
                            shippingFee: netShippingFee,
                            paymentStatus: 'PENDING',
                            paymentMethod: input.paymentMethod,
                            address: {
                                connect: { id: address.id },
                            },
                            shippingFullName: address.fullName,
                            shippingPhone: address.phone,
                            shippingAddress: fullAddressString,
                            customerNote: input.customerNote ?? null,
                            idempotencyKey: orderKey,
                            orderItems: {
                                create: items.map((it) => ({
                                    productId: it.variant.productId,
                                    variantId: it.variant.id,
                                    productName: it.variant.product.name,
                                    variantLabel: it.variantLabel,
                                    sku: it.variant.sku,
                                    imageUrl: it.imageUrl,
                                    unitPrice: it.unitPrice,
                                    quantity: it.quantity,
                                    lineTotal: it.lineTotal,
                                })),
                            },
                            statusHistory: {
                                create: {
                                    toStatus: 'PENDING',
                                    reason: 'Đặt hàng thành công',
                                    actorId: userId,
                                    actorRole: 'BUYER',
                                },
                            },
                        },
                        include: {
                            orderItems: true,
                            address: true,
                        },
                    })

                    // Ghi nhận VoucherUsageLog cho từng voucher đóng góp vào đơn hàng này
                    if (freeshipVoucher && shopShippingDiscount.greaterThan(0)) {
                        await tx.voucherUsageLog.create({
                            data: {
                                voucherId: freeshipVoucher.id,
                                userId,
                                orderId: order.id,
                                discount: shopShippingDiscount,
                            },
                        })
                    }
                    if (shopVoucherEntry && shopDiscount.greaterThan(0)) {
                        await tx.voucherUsageLog.create({
                            data: {
                                voucherId: shopVoucherEntry.voucher.id,
                                userId,
                                orderId: order.id,
                                discount: shopDiscount,
                            },
                        })
                    }
                    if (platformVoucher && shopPlatformDiscount.greaterThan(0)) {
                        await tx.voucherUsageLog.create({
                            data: {
                                voucherId: platformVoucher.id,
                                userId,
                                orderId: order.id,
                                discount: shopPlatformDiscount,
                            },
                        })
                    }

                    // Trừ tồn kho & tăng số lượng bán
                    for (const it of items) {
                        if (it.variant.inventory) {
                            await tx.inventoryItem.update({
                                where: { id: it.variant.inventory.id },
                                data: {
                                    reserved: { increment: it.quantity },
                                },
                            })
                        }

                        await tx.product.update({
                            where: { id: it.variant.productId },
                            data: {
                                totalStock: { decrement: it.quantity },
                                soldCount: { increment: it.quantity },
                            },
                        })
                    }

                    const shopInfo = shopMap.get(shopId)
                    ordersList.push({
                        ...order,
                        shopName: shopInfo?.shopName || 'TimmyHub Mall',
                        shopSlug: shopInfo?.shopSlug,
                    })
                }

                // Cập nhật lượt dùng & đánh dấu trạng thái USED trong ví voucher của khách
                for (const v of appliedVouchers) {
                    await tx.voucher.update({
                        where: { id: v.id },
                        data: {
                            usedCount: { increment: 1 },
                        },
                    })
                    await tx.userVoucher.updateMany({
                        where: { userId, voucherId: v.id },
                        data: {
                            status: 'USED',
                        },
                    })
                }

                // Bước E: Xoá các mặt hàng đã đặt khỏi Cart (nếu mua từ cart)
                const cartItemIdsToDelete = orderLineItems
                    .map((it) => it.cartItemId)
                    .filter((id): id is string => Boolean(id))

                if (cartItemIdsToDelete.length > 0) {
                    await tx.cartItem.deleteMany({
                        where: { id: { in: cartItemIdsToDelete } },
                    })
                }

                return ordersList
            },
            {
                maxWait: 10000,
                timeout: 30000,
            },
        )

        const totalAmount = createdOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0).toString()

        if (this.eventEmitter) {
            for (const o of createdOrders) {
                this.eventEmitter.emit('order.created', {
                    orderId: o.id,
                    orderNumber: o.id.slice(-8).toUpperCase(),
                    userId: o.buyerId,
                    shopId: o.sellerId,
                    totalAmount: o.totalAmount.toString(),
                })
            }
        }

        let paymentUrl: string | null = null
        if (input.paymentMethod === 'VNPAY') {
            const vnpayRes = await this.vnpayService.createPaymentUrl(
                createdOrders.map((o) => ({ id: o.id, totalAmount: o.totalAmount })),
                clientIp,
            )
            paymentUrl = vnpayRes.url
        }

        return {
            orders: await this.attachVoucherDetailsToOrders(createdOrders),
            totalAmount,
            paymentMethod: input.paymentMethod,
            paymentUrl,
        }
    }

    async getMyOrders(userId: string, status?: string, search?: string): Promise<OrderDetail[]> {
        let orderStatus: OrderStatus | OrderStatus[] | undefined
        if (status === 'DELIVERED') {
            orderStatus = [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED]
        } else if (status && status in ORDER_STATUS) {
            orderStatus = status as OrderStatus
        }

        const rawSearch = search?.trim() || undefined
        const cleanSearch = rawSearch?.startsWith('#') ? rawSearch.slice(1).trim() : rawSearch

        let matchingSellerIds: string[] | undefined
        if (cleanSearch) {
            const matchingSellers = await this.prisma.sellerProfile.findMany({
                where: { shopName: { contains: cleanSearch, mode: 'insensitive' } },
                select: { id: true },
            })
            if (matchingSellers.length > 0) {
                matchingSellerIds = matchingSellers.map((s) => s.id)
            }
        }

        const orders = await this.orderRepo.findOrdersByBuyerId(userId, orderStatus, cleanSearch, matchingSellerIds)
        const sellerIds = Array.from(new Set(orders.map((o) => o.sellerId)))
        const sellers =
            sellerIds.length > 0
                ? await this.prisma.sellerProfile.findMany({
                      where: { id: { in: sellerIds } },
                  })
                : []
        const shopMap = new Map(sellers.map((s) => [s.id, { shopName: s.shopName, shopSlug: s.shopSlug }]))
        return this.attachVoucherDetailsToOrders(
            orders.map((o) => {
                const s = shopMap.get(o.sellerId)
                return { ...o, shopName: s?.shopName, shopSlug: s?.shopSlug }
            }),
        )
    }

    async getOrderById(userId: string, orderId: string): Promise<OrderDetail> {
        let order = await this.orderRepo.findOrderById(orderId, userId)
        if (!order) {
            const seller = await this.prisma.sellerProfile.findUnique({
                where: { userId },
            })
            if (seller) {
                order = await this.orderRepo.findOrderByIdForSeller(orderId, seller.id)
            }
        }
        if (!order) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { roles: true },
            })
            if (user?.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN')) {
                order = await this.orderRepo.findOrderById(orderId)
            }
        }
        if (!order) {
            throw new NotFoundException('Không tìm thấy đơn hàng')
        }
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { id: order.sellerId },
        })
        const [formatted] = await this.attachVoucherDetailsToOrders([
            { ...order, shopName: seller?.shopName, shopSlug: seller?.shopSlug },
        ])
        return formatted!
    }

    async cancelOrder(userId: string, orderId: string, reason?: string): Promise<OrderDetail> {
        const order = await this.orderRepo.findOrderById(orderId, userId)
        if (!order) {
            throw new NotFoundException('Không tìm thấy đơn hàng')
        }

        if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
            throw new BadRequestException('Chỉ có thể huỷ đơn hàng khi đang ở trạng thái Chờ xử lý hoặc Đã xác nhận')
        }

        const cancelReason = reason?.trim() || 'Người mua huỷ đơn hàng'

        const updatedOrder = await this.prisma.$transaction(
            async (tx) => {
                // Hoàn lại tồn kho đã giữ (reserved)
                for (const item of order.orderItems) {
                    const variant = await tx.productVariant.findUnique({
                        where: { id: item.variantId },
                        include: { inventory: true },
                    })

                    if (variant?.inventory) {
                        await tx.inventoryItem.update({
                            where: { id: variant.inventory.id },
                            data: {
                                reserved: { decrement: Math.min(variant.inventory.reserved, item.quantity) },
                            },
                        })
                    }

                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            totalStock: { increment: item.quantity },
                            soldCount: { decrement: item.quantity },
                        },
                    })
                }

                // Hoàn lại voucher nếu có
                await this.refundOrderVouchers(tx, {
                    id: order.id,
                    buyerId: order.buyerId,
                    idempotencyKey: order.idempotencyKey,
                })

                // Cập nhật trạng thái đơn
                const cancelled = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: 'CANCELLED',
                        cancelReason,
                        statusHistory: {
                            create: {
                                fromStatus: order.status,
                                toStatus: 'CANCELLED',
                                reason: cancelReason,
                                actorId: userId,
                                actorRole: 'BUYER',
                            },
                        },
                    },
                    include: {
                        orderItems: true,
                        address: true,
                        statusHistory: { orderBy: { createdAt: 'desc' } },
                    },
                })

                return cancelled
            },
            { maxWait: 10000, timeout: 20000 },
        )

        const seller = await this.prisma.sellerProfile.findUnique({
            where: { id: updatedOrder.sellerId },
        })

        if (this.eventEmitter) {
            this.eventEmitter.emit('order.cancelled', {
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.id.slice(-8).toUpperCase(),
                userId: updatedOrder.buyerId,
                cancelledBy: userId,
                reason: cancelReason,
                shopId: updatedOrder.sellerId,
            })
        }

        const [formatted] = await this.attachVoucherDetailsToOrders([
            { ...updatedOrder, shopName: seller?.shopName, shopSlug: seller?.shopSlug },
        ])
        return formatted!
    }

    async getSellerOrders(userId: string, status?: string): Promise<OrderDetail[]> {
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { userId },
        })

        if (!seller) {
            // Nếu là ADMIN hoặc SUPER_ADMIN, cho phép xem toàn bộ đơn hàng của sàn
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { roles: true },
            })
            const isAdmin = user?.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN')
            if (isAdmin) {
                const orderStatus = status && status in ORDER_STATUS ? (status as OrderStatus) : undefined
                const orders = await this.orderRepo.findAllOrders(orderStatus)
                const sellerIds = Array.from(new Set(orders.map((o) => o.sellerId)))
                const sellers =
                    sellerIds.length > 0
                        ? await this.prisma.sellerProfile.findMany({
                              where: { id: { in: sellerIds } },
                          })
                        : []
                const shopMap = new Map(sellers.map((s) => [s.id, { shopName: s.shopName, shopSlug: s.shopSlug }]))
                return this.attachVoucherDetailsToOrders(
                    orders.map((o) => {
                        const s = shopMap.get(o.sellerId)
                        return { ...o, shopName: s?.shopName, shopSlug: s?.shopSlug }
                    }),
                )
            }

            const isSeller = user?.roles?.some((r) => r === 'SELLER')
            if (isSeller) {
                return []
            }

            throw new ForbiddenException('Bạn chưa có hồ sơ người bán hoặc chưa được phê duyệt')
        }

        const orderStatus = status && status in ORDER_STATUS ? (status as OrderStatus) : undefined
        const orders = await this.orderRepo.findOrdersBySellerId(seller.id, orderStatus)
        return this.attachVoucherDetailsToOrders(
            orders.map((o) => ({ ...o, shopName: seller.shopName, shopSlug: seller.shopSlug })),
        )
    }

    async updateSellerOrderStatus(
        userId: string,
        orderId: string,
        toStatus: OrderStatus,
        note?: string,
    ): Promise<OrderDetail> {
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { userId },
        })

        let isPlatformAdmin = false
        if (!seller) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { roles: true },
            })
            const isAdmin = user?.roles?.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN')
            if (isAdmin) {
                isPlatformAdmin = true
            } else {
                throw new ForbiddenException('Bạn chưa có hồ sơ người bán')
            }
        }

        const order = seller
            ? await this.orderRepo.findOrderByIdForSeller(orderId, seller.id)
            : isPlatformAdmin
              ? await this.orderRepo.findOrderById(orderId)
              : null

        if (!order) {
            throw new NotFoundException('Không tìm thấy đơn hàng của gian hàng bạn')
        }

        const updatedOrder = await this.prisma.$transaction(
            async (tx) => {
                // Nếu huỷ đơn hàng, hoàn lại tồn kho
                if (toStatus === 'CANCELLED' && order.status !== 'CANCELLED') {
                    for (const item of order.orderItems) {
                        const variant = await tx.productVariant.findUnique({
                            where: { id: item.variantId },
                            include: { inventory: true },
                        })
                        if (variant?.inventory) {
                            await tx.inventoryItem.update({
                                where: { id: variant.inventory.id },
                                data: {
                                    reserved: { decrement: Math.min(variant.inventory.reserved, item.quantity) },
                                },
                            })
                        }
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                totalStock: { increment: item.quantity },
                                soldCount: { decrement: item.quantity },
                            },
                        })
                    }

                    // Hoàn lại voucher nếu người bán huỷ đơn
                    await this.refundOrderVouchers(tx, {
                        id: order.id,
                        buyerId: order.buyerId,
                        idempotencyKey: order.idempotencyKey,
                    })
                }

                // Nếu đơn chuyển sang COMPLETED hoặc DELIVERED và đã thanh toán COD
                const isPaid =
                    order.paymentStatus === 'PAID' ||
                    order.paymentStatus === 'COMPLETED' ||
                    toStatus === 'DELIVERED' ||
                    toStatus === 'COMPLETED'

                return tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: toStatus,
                        ...(isPaid && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'COMPLETED'
                            ? { paymentStatus: 'COMPLETED' }
                            : {}),
                        cancelReason: toStatus === 'CANCELLED' ? (note ?? 'Người bán huỷ đơn') : order.cancelReason,
                        statusHistory: {
                            create: {
                                fromStatus: order.status,
                                toStatus,
                                reason: note ?? `Người bán chuyển trạng thái sang ${toStatus}`,
                                actorId: userId,
                                actorRole: 'SELLER',
                            },
                        },
                    },
                    include: {
                        orderItems: true,
                        address: true,
                        statusHistory: { orderBy: { createdAt: 'desc' } },
                    },
                })
            },
            { maxWait: 10000, timeout: 20000 },
        )

        const shop = seller
            ? seller
            : await this.prisma.sellerProfile.findUnique({
                  where: { id: updatedOrder.sellerId },
              })

        if (this.eventEmitter) {
            this.eventEmitter.emit('order.status_updated', {
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.id.slice(-8).toUpperCase(),
                userId: updatedOrder.buyerId,
                newStatus: toStatus,
                shopId: updatedOrder.sellerId,
            })
        }

        const [formatted] = await this.attachVoucherDetailsToOrders([
            { ...updatedOrder, shopName: shop?.shopName, shopSlug: shop?.shopSlug },
        ])
        return formatted!
    }

    // ===== Helpers =====

    private formatAddress(a: Address): AddressDetail {
        return {
            id: a.id,
            userId: a.userId,
            label: a.label ?? null,
            fullName: a.fullName,
            phone: a.phone,
            addressLine1: a.addressLine1,
            addressLine2: a.addressLine2 ?? null,
            provinceCode: a.provinceCode,
            districtCode: a.districtCode,
            wardCode: a.wardCode,
            provinceName: a.provinceName,
            districtName: a.districtName,
            wardName: a.wardName,
            isDefault: a.isDefault,
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
        }
    }

    private async refundOrderVouchers(
        tx: Prisma.TransactionClient,
        order: { id: string; buyerId: string; idempotencyKey?: string | null },
    ): Promise<void> {
        const usageLogs = await tx.voucherUsageLog.findMany({
            where: { orderId: order.id },
        })

        if (usageLogs.length === 0) {
            return
        }

        // Tìm các đơn hàng cùng đợt checkout (nếu có) mà vẫn đang hoạt động
        const batchPrefix =
            order.idempotencyKey && order.idempotencyKey.includes('-')
                ? order.idempotencyKey.substring(0, order.idempotencyKey.lastIndexOf('-'))
                : null

        const activeSiblingOrderIds: string[] = []
        if (batchPrefix) {
            const siblings = await tx.order.findMany({
                where: {
                    idempotencyKey: { startsWith: `${batchPrefix}-` },
                    id: { not: order.id },
                    status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
                },
                select: { id: true },
            })
            activeSiblingOrderIds.push(...siblings.map((s) => s.id))
        }

        for (const log of usageLogs) {
            // Kiểm tra xem có đơn hàng khác trong cùng đợt checkout đang còn dùng voucher này không
            let isStillUsedBySibling = false
            if (activeSiblingOrderIds.length > 0) {
                const siblingLog = await tx.voucherUsageLog.findFirst({
                    where: {
                        voucherId: log.voucherId,
                        orderId: { in: activeSiblingOrderIds },
                    },
                })
                if (siblingLog) {
                    isStillUsedBySibling = true
                }
            }

            // Nếu không còn đơn nào khác trong đợt checkout đang dùng voucher này
            if (!isStillUsedBySibling) {
                // 1. Giảm usedCount của voucher (không để âm)
                await tx.voucher.updateMany({
                    where: { id: log.voucherId, usedCount: { gt: 0 } },
                    data: {
                        usedCount: { decrement: 1 },
                    },
                })

                // 2. Chuyển UserVoucher từ 'USED' trở lại 'SAVED'
                await tx.userVoucher.updateMany({
                    where: {
                        userId: order.buyerId,
                        voucherId: log.voucherId,
                        status: 'USED',
                    },
                    data: {
                        status: 'SAVED',
                    },
                })
            }
        }

        // 3. Xoá log sử dụng của đơn hàng này để giải phóng perUserLimit
        await tx.voucherUsageLog.deleteMany({
            where: { orderId: order.id },
        })
    }

    private async attachVoucherDetailsToOrders(
        orders: Array<OrderWithRelations & { shopName?: string | undefined; shopSlug?: string | undefined }>,
    ): Promise<OrderDetail[]> {
        if (orders.length === 0) return []
        const orderIds = orders.map((o) => o.id)
        const usageLogs = await this.prisma.voucherUsageLog.findMany({
            where: { orderId: { in: orderIds } },
            include: { voucher: true },
        })

        const logsByOrderId = new Map<
            string,
            Array<{ id: string; code: string; type: string; discount: string; description: string | null }>
        >()
        for (const log of usageLogs) {
            const list = logsByOrderId.get(log.orderId) || []
            list.push({
                id: log.voucher.id,
                code: log.voucher.code,
                type: log.voucher.type,
                discount: log.discount.toString(),
                description: log.voucher.description,
            })
            logsByOrderId.set(log.orderId, list)
        }

        return orders.map((o) => {
            const orderVouchers = logsByOrderId.get(o.id) || []
            const voucherCode = orderVouchers.map((v) => v.code).join(', ') || null
            return this.formatOrder(o, orderVouchers, voucherCode)
        })
    }

    private formatOrder(
        o: OrderWithRelations & { shopName?: string | undefined; shopSlug?: string | undefined },
        orderVouchers?: OrderVoucherDetail[],
        voucherCode?: string | null,
    ): OrderDetail {
        return {
            id: o.id,
            buyerId: o.buyerId,
            sellerId: o.sellerId,
            ...(o.shopName ? { shopName: o.shopName } : {}),
            ...(o.shopSlug ? { shopSlug: o.shopSlug } : {}),
            status: o.status,
            totalAmount: o.totalAmount != null ? o.totalAmount.toString() : '0',
            currency: o.currency || 'VND',
            voucherId: o.voucherId ?? null,
            voucherDiscount: o.voucherDiscount != null ? o.voucherDiscount.toString() : null,
            voucherCode: voucherCode ?? null,
            vouchers: orderVouchers && orderVouchers.length > 0 ? orderVouchers : undefined,
            shippingFee: o.shippingFee != null ? o.shippingFee.toString() : '0',
            paymentStatus: o.paymentStatus || 'PENDING',
            paymentMethod: o.paymentMethod,
            addressId: o.addressId,
            shippingFullName: o.shippingFullName || '',
            shippingPhone: o.shippingPhone || '',
            shippingAddress: o.shippingAddress || '',
            customerNote: o.customerNote ?? null,
            cancelReason: o.cancelReason ?? null,
            createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: o.updatedAt ? o.updatedAt.toISOString() : new Date().toISOString(),
            items: (o.orderItems || []).map((it: OrderItem): OrderItemDetail => ({
                id: it.id,
                productId: it.productId,
                variantId: it.variantId,
                productName: it.productName || '',
                variantLabel: it.variantLabel || '',
                sku: it.sku || '',
                imageUrl: it.imageUrl || '',
                unitPrice: it.unitPrice != null ? it.unitPrice.toString() : '0',
                quantity: it.quantity,
                lineTotal: it.lineTotal != null ? it.lineTotal.toString() : '0',
                isReviewed: it.isReviewed,
            })),
            statusHistory: o.statusHistory
                ? o.statusHistory.map((sh) => ({
                      id: sh.id,
                      fromStatus: sh.fromStatus,
                      toStatus: sh.toStatus,
                      reason: sh.reason,
                      actorRole: sh.actorRole,
                      createdAt: sh.createdAt ? sh.createdAt.toISOString() : new Date().toISOString(),
                  }))
                : undefined,
        }
    }

    /**
     * Tự động quét và huỷ các đơn hàng quá hạn thanh toán (FEAT-INV-004 & FEAT-PAY-003):
     * - Đơn VNPAY ở trạng thái PENDING quá 15 phút mà chưa thanh toán.
     * - Hoàn lại tồn kho đã giữ (reserved), hoàn lại tổng tồn (totalStock) và giảm soldCount.
     * - Hoàn trả lại voucher cho người mua.
     * - Cập nhật trạng thái đơn thành CANCELLED, Payment thành FAILED.
     */
    async cancelExpiredOrders(): Promise<number> {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

        // Tìm các đơn hàng VNPAY PENDING đã quá 15 phút
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: 'PENDING',
                paymentStatus: 'PENDING',
                paymentMethod: 'VNPAY',
                createdAt: { lt: fifteenMinutesAgo },
            },
            include: {
                orderItems: true,
            },
            take: 50,
        })

        if (expiredOrders.length === 0) {
            return 0
        }

        this.logger.log(
            `Tìm thấy ${expiredOrders.length} đơn hàng quá hạn thanh toán, đang tiến hành giải phóng tồn kho...`,
        )

        let cancelledCount = 0

        for (const order of expiredOrders) {
            try {
                await this.prisma.$transaction(
                    async (tx) => {
                        // 1. Hoàn lại tồn kho đã giữ
                        for (const item of order.orderItems) {
                            const variant = await tx.productVariant.findUnique({
                                where: { id: item.variantId },
                                include: { inventory: true },
                            })

                            if (variant?.inventory) {
                                await tx.inventoryItem.update({
                                    where: { id: variant.inventory.id },
                                    data: {
                                        reserved: { decrement: Math.min(variant.inventory.reserved, item.quantity) },
                                    },
                                })
                            }

                            await tx.product.update({
                                where: { id: item.productId },
                                data: {
                                    totalStock: { increment: item.quantity },
                                    soldCount: { decrement: item.quantity },
                                },
                            })
                        }

                        // 2. Hoàn lại voucher nếu có
                        await this.refundOrderVouchers(tx, {
                            id: order.id,
                            buyerId: order.buyerId,
                            idempotencyKey: order.idempotencyKey,
                        })

                        // 3. Đánh dấu đơn hàng CANCELLED
                        await tx.order.update({
                            where: { id: order.id },
                            data: {
                                status: 'CANCELLED',
                                cancelReason: 'Hết thời hạn thanh toán VNPay (15 phút)',
                                statusHistory: {
                                    create: {
                                        fromStatus: 'PENDING',
                                        toStatus: 'CANCELLED',
                                        reason: 'Hết thời hạn thanh toán đơn hàng (15 phút)',
                                        actorId: 'SYSTEM',
                                        actorRole: 'SYSTEM',
                                    },
                                },
                            },
                        })

                        // 4. Đánh dấu Payment FAILED
                        await tx.payment.updateMany({
                            where: { orderId: order.id, status: PaymentStatus.PENDING },
                            data: { status: PaymentStatus.FAILED },
                        })
                    },
                    { maxWait: 10000, timeout: 20000 },
                )

                cancelledCount++

                if (this.eventEmitter) {
                    this.eventEmitter.emit('order.cancelled', {
                        orderId: order.id,
                        orderNumber: order.id.slice(-8).toUpperCase(),
                        userId: order.buyerId,
                        cancelledBy: 'SYSTEM',
                        reason: 'Hết thời hạn thanh toán VNPay (15 phút)',
                        shopId: order.sellerId,
                    })
                }
            } catch (err) {
                this.logger.error(`Lỗi khi tự động huỷ đơn quá hạn ${order.id}:`, err)
            }
        }

        if (cancelledCount > 0) {
            this.logger.log(`Đã tự động huỷ ${cancelledCount} đơn hàng quá hạn và hoàn trả tồn kho thành công.`)
        }

        return cancelledCount
    }
}
