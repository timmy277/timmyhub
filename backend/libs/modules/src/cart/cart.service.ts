import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'

import type {
    AddToCartInput,
    CartDetail,
    CartItemDetail,
    CartShopGroup,
    UpdateCartItemInput,
} from '@timmyhub/contracts'
import { CART_INVALID_REASON } from '@timmyhub/contracts'
import { PrismaService } from '@timmyhub/prisma'

import { CartRepository } from './cart.repository'

@Injectable()
export class CartService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cartRepo: CartRepository,
    ) {}

    /**
     * Thêm sản phẩm vào giỏ hàng với ACID Transaction
     * FEAT-CRT-002, REQ-CRT-002, REQ-CRT-003
     */
    async addToCart(userId: string, input: AddToCartInput): Promise<CartDetail> {
        if (input.quantity <= 0) {
            throw new BadRequestException('Số lượng thêm vào giỏ phải lớn hơn 0')
        }

        // 1. Kiểm tra biến thể và sản phẩm tồn tại
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: input.variantId },
            include: {
                product: true,
                inventory: true,
            },
        })

        if (!variant) {
            throw new NotFoundException('Biến thể sản phẩm không tồn tại')
        }

        const { product } = variant

        // 2. Kiểm tra trạng thái sản phẩm (phải APPROVED, không suspended)
        if (product.status !== 'APPROVED' || product.isSuspended) {
            throw new UnprocessableEntityException('Sản phẩm hiện không khả dụng để đặt mua')
        }

        // 3. Kiểm tra biến thể có đang kinh doanh không
        if (!variant.isActive) {
            throw new UnprocessableEntityException('Phiên bản sản phẩm này hiện đã ngừng kinh doanh')
        }

        // 4. Kiểm tra anti-self-dealing: Người bán không thể mua sản phẩm từ shop của chính mình
        const userSellerProfile = await this.prisma.sellerProfile.findUnique({
            where: { userId },
        })
        if (userSellerProfile && userSellerProfile.id === product.shopId) {
            throw new BadRequestException('Bạn không thể thêm sản phẩm từ gian hàng của chính mình vào giỏ hàng')
        }

        // 5. Kiểm tra tồn kho khả dụng (available = onHand - reserved)
        const availableStock = variant.inventory
            ? Math.max(0, variant.inventory.onHand - variant.inventory.reserved)
            : 0
        if (availableStock <= 0) {
            throw new UnprocessableEntityException('Sản phẩm này hiện đã hết hàng')
        }
        if (input.quantity > availableStock) {
            throw new UnprocessableEntityException(
                `Số lượng yêu cầu (${input.quantity}) vượt quá tồn kho khả dụng (Kho còn: ${availableStock})`,
            )
        }

        // 6. Thực thi trong PostgreSQL ACID Transaction
        await this.prisma.$transaction(async (tx) => {
            // Bước A: Tạo hoặc lấy Cart của user
            const cart = await this.cartRepo.upsertCart(userId, tx)

            // Bước B: Kiểm tra CartItem đã tồn tại chưa
            const existingItem = await this.cartRepo.findItemByCartAndVariant(cart.id, variant.id, tx)

            if (existingItem) {
                // Cộng dồn số lượng
                const newQuantity = existingItem.quantity + input.quantity
                if (newQuantity > availableStock) {
                    throw new UnprocessableEntityException(
                        `Tổng số lượng trong giỏ (${newQuantity}) vượt quá tồn kho khả dụng (${availableStock})`,
                    )
                }

                await this.cartRepo.updateItemQuantity(existingItem.id, newQuantity, variant.price, tx)
            } else {
                // Tạo mới dòng giỏ hàng với cachedPriceSnapshot từ giá hiện tại
                await this.cartRepo.createItem(
                    {
                        cartId: cart.id,
                        productId: product.id,
                        variantId: variant.id,
                        quantity: input.quantity,
                        cachedPriceSnapshot: variant.price,
                        isValid: true,
                    },
                    tx,
                )
            }
        })

        // 7. Trả về thông tin giỏ hàng mới nhất
        return this.getCart(userId)
    }

    /**
     * Lấy toàn bộ giỏ hàng của user với đầy đủ thông tin nhóm theo shop
     * REQ-CRT-001, REQ-CRT-008
     */
    async getCart(userId: string): Promise<CartDetail> {
        const cart = await this.cartRepo.findCartByUserId(userId)
        if (!cart || cart.items.length === 0) {
            return {
                id: cart?.id ?? '',
                userId,
                totalItems: 0,
                totalUniqueItems: 0,
                totalAmount: '0',
                shopGroups: [],
                items: [],
            }
        }

        // Lấy danh sách variantIds và productIds
        const variantIds = cart.items.map((item) => item.variantId)
        const productIds = Array.from(new Set(cart.items.map((item) => item.productId)))

        // Truy vấn thông tin sản phẩm và biến thể
        const [variants, products] = await Promise.all([
            this.prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                include: { inventory: true },
            }),
            this.prisma.product.findMany({
                where: { id: { in: productIds } },
            }),
        ])

        const variantMap = new Map(variants.map((v) => [v.id, v]))
        const productMap = new Map(products.map((p) => [p.id, p]))

        // Lấy danh sách shopIds
        const shopIds = Array.from(new Set(products.map((p) => p.shopId)))
        const shops = await this.prisma.sellerProfile.findMany({
            where: { id: { in: shopIds } },
        })
        const shopMap = new Map(shops.map((s) => [s.id, s]))

        // Lấy Option Values nếu có để hiển thị tên thuộc tính (Màu sắc, Size...)
        const allOptionValueIds = Array.from(
            new Set(variants.flatMap((v) => (v.optionKey ? v.optionKey.split(':') : [])).filter(Boolean)),
        )
        const optionValues =
            allOptionValueIds.length > 0
                ? await this.prisma.productOptionValue.findMany({
                      where: { id: { in: allOptionValueIds } },
                      include: { option: true },
                  })
                : []
        const optionValueMap = new Map(
            optionValues.map((ov) => [ov.id, { optionName: ov.option.name, value: ov.value }]),
        )

        let totalItems = 0
        let totalAmountDecimal = 0
        const detailedItems: CartItemDetail[] = []

        for (const item of cart.items) {
            const variant = variantMap.get(item.variantId)
            const product = productMap.get(item.productId)
            const shop = product ? shopMap.get(product.shopId) : undefined

            if (!variant || !product) {
                detailedItems.push({
                    id: item.id,
                    cartId: item.cartId,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    productName: 'Sản phẩm không còn khả dụng',
                    productSlug: '',
                    productImage: null,
                    variantSku: null,
                    variantOptions: {},
                    price: item.cachedPriceSnapshot?.toString() ?? '0',
                    stock: 0,
                    shopId: '',
                    shopName: 'Không xác định',
                    isValid: false,
                    invalidReason: CART_INVALID_REASON.PRODUCT_DEACTIVATED,
                })
                continue
            }

            const availableStock = variant.inventory
                ? Math.max(0, variant.inventory.onHand - variant.inventory.reserved)
                : 0

            // Kiểm tra tính hợp lệ
            let isValid = true
            let invalidReason: string | null = null

            if (product.status !== 'APPROVED' || product.isSuspended) {
                isValid = false
                invalidReason = CART_INVALID_REASON.PRODUCT_NOT_APPROVED
            } else if (!variant.isActive) {
                isValid = false
                invalidReason = CART_INVALID_REASON.PRODUCT_DEACTIVATED
            } else if (availableStock <= 0) {
                isValid = false
                invalidReason = CART_INVALID_REASON.OUT_OF_STOCK
            } else if (item.quantity > availableStock) {
                isValid = false
                invalidReason = CART_INVALID_REASON.EXCEEDS_STOCK
            }

            // Giải mã options
            const variantOptions: Record<string, string> = {}
            if (variant.optionKey) {
                const parts = variant.optionKey.split(':')
                for (const part of parts) {
                    const info = optionValueMap.get(part)
                    if (info) {
                        variantOptions[info.optionName] = info.value
                    }
                }
            }

            const currentPriceStr = variant.price.toString()
            const itemPriceNum = Number(currentPriceStr)

            if (isValid) {
                totalItems += item.quantity
                totalAmountDecimal += itemPriceNum * item.quantity
            }

            detailedItems.push({
                id: item.id,
                cartId: item.cartId,
                productId: product.id,
                variantId: variant.id,
                quantity: item.quantity,
                productName: product.name,
                productSlug: product.slug,
                productImage: product.images?.[0] ?? null,
                variantSku: variant.sku,
                variantOptions,
                price: currentPriceStr,
                stock: availableStock,
                shopId: shop?.id ?? product.shopId,
                shopName: shop?.shopName ?? 'TimmyHub Mall',
                isValid,
                invalidReason,
            })
        }

        // Nhóm item theo gian hàng (REQ-CRT-008)
        const groupsByShop = new Map<string, CartItemDetail[]>()
        for (const item of detailedItems) {
            const list = groupsByShop.get(item.shopId) ?? []
            list.push(item)
            groupsByShop.set(item.shopId, list)
        }

        const shopGroups: CartShopGroup[] = []
        for (const [shopId, items] of groupsByShop.entries()) {
            const subtotal = items
                .filter((i) => i.isValid)
                .reduce((acc, curr) => acc + Number(curr.price) * curr.quantity, 0)
                .toString()

            const shopName = items[0]?.shopName ?? 'Gian hàng'
            shopGroups.push({
                shopId,
                shopName,
                items,
                subtotal,
            })
        }

        return {
            id: cart.id,
            userId,
            totalItems,
            totalUniqueItems: detailedItems.length,
            totalAmount: totalAmountDecimal.toString(),
            shopGroups,
            items: detailedItems,
        }
    }

    /**
     * Sửa số lượng item trong giỏ (REQ-CRT-004)
     */
    async updateItemQuantity(userId: string, itemId: string, input: UpdateCartItemInput): Promise<CartDetail> {
        if (input.quantity <= 0) {
            throw new BadRequestException('Số lượng phải lớn hơn 0. Sử dụng nút xoá nếu bạn muốn loại bỏ sản phẩm')
        }

        const cart = await this.cartRepo.findCartByUserId(userId)
        if (!cart) {
            throw new NotFoundException('Giỏ hàng không tồn tại')
        }

        const item = cart.items.find((i) => i.id === itemId)
        if (!item) {
            throw new NotFoundException('Sản phẩm không có trong giỏ hàng')
        }

        // Kiểm tra tồn kho khả dụng
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: item.variantId },
            include: { inventory: true },
        })
        if (!variant) {
            throw new NotFoundException('Biến thể sản phẩm không tồn tại')
        }

        const availableStock = variant.inventory
            ? Math.max(0, variant.inventory.onHand - variant.inventory.reserved)
            : 0

        if (input.quantity > availableStock) {
            throw new UnprocessableEntityException(
                `Số lượng yêu cầu (${input.quantity}) vượt quá tồn kho khả dụng (${availableStock})`,
            )
        }

        await this.prisma.$transaction(async (tx) => {
            await this.cartRepo.updateItemQuantity(itemId, input.quantity, variant.price, tx)
        })

        return this.getCart(userId)
    }

    /**
     * Xoá item khỏi giỏ (REQ-CRT-005)
     */
    async removeItem(userId: string, itemId: string): Promise<CartDetail> {
        const cart = await this.cartRepo.findCartByUserId(userId)
        if (!cart) {
            throw new NotFoundException('Giỏ hàng không tồn tại')
        }

        const item = cart.items.find((i) => i.id === itemId)
        if (!item) {
            throw new NotFoundException('Sản phẩm không có trong giỏ hàng')
        }

        await this.prisma.$transaction(async (tx) => {
            await this.cartRepo.deleteItem(itemId, tx)
        })

        return this.getCart(userId)
    }

    /**
     * Làm trống giỏ hàng
     */
    async clearCart(userId: string): Promise<void> {
        const cart = await this.cartRepo.findCartByUserId(userId)
        if (!cart) return

        await this.prisma.$transaction(async (tx) => {
            await this.cartRepo.clearCart(cart.id, tx)
        })
    }
}
