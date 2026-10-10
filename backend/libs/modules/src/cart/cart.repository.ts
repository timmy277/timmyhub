import { Injectable } from '@nestjs/common'
import { Prisma, PrismaService } from '@timmyhub/prisma'
import type { Cart, CartItem } from '@timmyhub/prisma'

@Injectable()
export class CartRepository {
    constructor(private readonly prisma: PrismaService) {}

    private getClient(tx?: Prisma.TransactionClient) {
        return tx ?? this.prisma
    }

    async upsertCart(userId: string, tx?: Prisma.TransactionClient): Promise<Cart> {
        const client = this.getClient(tx)
        return client.cart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        })
    }

    async findCartByUserId(
        userId: string,
        tx?: Prisma.TransactionClient,
    ): Promise<(Cart & { items: CartItem[] }) | null> {
        const client = this.getClient(tx)
        return client.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    orderBy: { addedAt: 'desc' },
                },
            },
        })
    }

    async findItemByCartAndVariant(
        cartId: string,
        variantId: string,
        tx?: Prisma.TransactionClient,
    ): Promise<CartItem | null> {
        const client = this.getClient(tx)
        return client.cartItem.findUnique({
            where: {
                cartId_variantId: {
                    cartId,
                    variantId,
                },
            },
        })
    }

    async findItemById(itemId: string, tx?: Prisma.TransactionClient): Promise<CartItem | null> {
        const client = this.getClient(tx)
        return client.cartItem.findUnique({
            where: { id: itemId },
        })
    }

    async createItem(data: Prisma.CartItemUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<CartItem> {
        const client = this.getClient(tx)
        return client.cartItem.create({
            data,
        })
    }

    async updateItemQuantity(
        itemId: string,
        quantity: number,
        priceSnapshot?: Prisma.Decimal | number,
        tx?: Prisma.TransactionClient,
    ): Promise<CartItem> {
        const client = this.getClient(tx)
        const updateData: Prisma.CartItemUpdateInput = { quantity }
        if (priceSnapshot !== undefined) {
            updateData.cachedPriceSnapshot = priceSnapshot
        }
        return client.cartItem.update({
            where: { id: itemId },
            data: updateData,
        })
    }

    async deleteItem(itemId: string, tx?: Prisma.TransactionClient): Promise<CartItem> {
        const client = this.getClient(tx)
        return client.cartItem.delete({
            where: { id: itemId },
        })
    }

    async clearCart(cartId: string, tx?: Prisma.TransactionClient): Promise<Prisma.BatchPayload> {
        const client = this.getClient(tx)
        return client.cartItem.deleteMany({
            where: { cartId },
        })
    }
}
