import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Address, OrderItem, OrderStatus } from '@timmyhub/prisma'
import { Prisma, PrismaService } from '@timmyhub/prisma'
import type {
    AddressDetail,
    CheckoutInput,
    CheckoutResult,
    CreateAddressInput,
    OrderDetail,
    OrderItemDetail,
    UpdateAddressInput,
} from '@timmyhub/contracts'
import { ORDER_STATUS } from '@timmyhub/contracts'

import type { OrderWithRelations } from './order.repository'
import { OrderRepository } from './order.repository'
import { VnpayService } from './vnpay.service'

@Injectable()
export class OrderService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly orderRepo: OrderRepository,
        private readonly vnpayService: VnpayService,
    ) {}

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
                    orders: existingOrders.map((o) => this.formatOrder(o)),
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
                const shopMap = new Map(shops.map((s) => [s.id, s.shopName]))

                const ordersList: Array<OrderWithRelations & { shopName: string }> = []
                const baseIdempotency = key || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

                // Bước D: Tạo từng Order cho từng Shop và giữ tồn kho
                let shopIndex = 0
                for (const [shopId, items] of shopGroups.entries()) {
                    shopIndex++
                    const subtotal = items.reduce((acc, it) => acc.add(it.lineTotal), new Prisma.Decimal(0))
                    const shippingFee = new Prisma.Decimal(0) // Miễn phí vận chuyển
                    const totalAmount = subtotal.add(shippingFee)
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

                    const order = await tx.order.create({
                        data: {
                            buyerId: userId,
                            sellerId: shopId,
                            status: 'PENDING',
                            totalAmount,
                            currency: 'VND',
                            shippingFee,
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

                    ordersList.push({
                        ...order,
                        shopName: shopMap.get(shopId) || 'TimmyHub Mall',
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

        let paymentUrl: string | null = null
        if (input.paymentMethod === 'VNPAY') {
            const vnpayRes = await this.vnpayService.createPaymentUrl(
                createdOrders.map((o) => ({ id: o.id, totalAmount: o.totalAmount })),
                clientIp,
            )
            paymentUrl = vnpayRes.url
        }

        return {
            orders: createdOrders.map((o) => this.formatOrder(o)),
            totalAmount,
            paymentMethod: input.paymentMethod,
            paymentUrl,
        }
    }

    async getMyOrders(userId: string, status?: string): Promise<OrderDetail[]> {
        const orderStatus = status && status in ORDER_STATUS ? (status as OrderStatus) : undefined
        const orders = await this.orderRepo.findOrdersByBuyerId(userId, orderStatus)
        const sellerIds = Array.from(new Set(orders.map((o) => o.sellerId)))
        const sellers =
            sellerIds.length > 0
                ? await this.prisma.sellerProfile.findMany({
                      where: { id: { in: sellerIds } },
                  })
                : []
        const shopMap = new Map(sellers.map((s) => [s.id, s.shopName]))
        return orders.map((o) => this.formatOrder({ ...o, shopName: shopMap.get(o.sellerId) }))
    }

    async getOrderById(userId: string, orderId: string): Promise<OrderDetail> {
        const order = await this.orderRepo.findOrderById(orderId, userId)
        if (!order) {
            throw new NotFoundException('Không tìm thấy đơn hàng')
        }
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { id: order.sellerId },
        })
        return this.formatOrder({ ...order, shopName: seller?.shopName })
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

        return this.formatOrder({ ...updatedOrder, shopName: seller?.shopName })
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
                const shopMap = new Map(sellers.map((s) => [s.id, s.shopName]))
                return orders.map((o) => this.formatOrder({ ...o, shopName: shopMap.get(o.sellerId) }))
            }

            const isSeller = user?.roles?.some((r) => r === 'SELLER')
            if (isSeller) {
                return []
            }

            throw new ForbiddenException('Bạn chưa có hồ sơ người bán hoặc chưa được phê duyệt')
        }

        const orderStatus = status && status in ORDER_STATUS ? (status as OrderStatus) : undefined
        const orders = await this.orderRepo.findOrdersBySellerId(seller.id, orderStatus)
        return orders.map((o) => this.formatOrder({ ...o, shopName: seller.shopName }))
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
                }

                // Nếu đơn chuyển sang COMPLETED hoặc DELIVERED và đã thanh toán COD
                const isPaid = order.paymentStatus === 'PAID' || toStatus === 'DELIVERED' || toStatus === 'COMPLETED'

                return tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: toStatus,
                        ...(isPaid && order.paymentStatus !== 'PAID' ? { paymentStatus: 'PAID' } : {}),
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

        return this.formatOrder({ ...updatedOrder, shopName: shop?.shopName })
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

    private formatOrder(o: OrderWithRelations & { shopName?: string | undefined }): OrderDetail {
        return {
            id: o.id,
            buyerId: o.buyerId,
            sellerId: o.sellerId,
            ...(o.shopName ? { shopName: o.shopName } : {}),
            status: o.status,
            totalAmount: o.totalAmount != null ? o.totalAmount.toString() : '0',
            currency: o.currency || 'VND',
            voucherId: o.voucherId ?? null,
            voucherDiscount: o.voucherDiscount != null ? o.voucherDiscount.toString() : null,
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
}
