import { Injectable } from '@nestjs/common'
import { Prisma, PrismaService } from '@timmyhub/prisma'
import type { Address, Order, OrderItem, OrderStatus, OrderStatusHistory } from '@timmyhub/prisma'

export type OrderWithRelations = Order & {
    orderItems: OrderItem[]
    address: Address
    statusHistory?: OrderStatusHistory[]
}

@Injectable()
export class OrderRepository {
    constructor(private readonly prisma: PrismaService) {}

    private getClient(tx?: Prisma.TransactionClient) {
        return tx ?? this.prisma
    }

    // ===== Address Methods =====

    async findAddressesByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<Address[]> {
        const client = this.getClient(tx)
        return client.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        })
    }

    async findAddressById(userId: string, id: string, tx?: Prisma.TransactionClient): Promise<Address | null> {
        const client = this.getClient(tx)
        return client.address.findFirst({
            where: { id, userId },
        })
    }

    async clearDefaultAddresses(
        userId: string,
        excludeId?: string,
        tx?: Prisma.TransactionClient,
    ): Promise<Prisma.BatchPayload> {
        const client = this.getClient(tx)
        return client.address.updateMany({
            where: {
                userId,
                ...(excludeId ? { id: { not: excludeId } } : {}),
                isDefault: true,
            },
            data: { isDefault: false },
        })
    }

    async createAddress(data: Prisma.AddressUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Address> {
        const client = this.getClient(tx)
        return client.address.create({ data })
    }

    async updateAddress(id: string, data: Prisma.AddressUpdateInput, tx?: Prisma.TransactionClient): Promise<Address> {
        const client = this.getClient(tx)
        return client.address.update({
            where: { id },
            data,
        })
    }

    async deleteAddress(id: string, tx?: Prisma.TransactionClient): Promise<Address> {
        const client = this.getClient(tx)
        return client.address.delete({
            where: { id },
        })
    }

    // ===== Order Methods =====

    async findOrdersByIdempotencyPrefix(prefix: string, tx?: Prisma.TransactionClient): Promise<OrderWithRelations[]> {
        const client = this.getClient(tx)
        return client.order.findMany({
            where: {
                idempotencyKey: {
                    startsWith: prefix,
                },
            },
            include: {
                orderItems: true,
                address: true,
            },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findOrdersByBuyerId(
        buyerId: string,
        status?: OrderStatus,
        tx?: Prisma.TransactionClient,
    ): Promise<OrderWithRelations[]> {
        const client = this.getClient(tx)
        return client.order.findMany({
            where: {
                buyerId,
                ...(status ? { status } : {}),
            },
            include: {
                orderItems: true,
                address: true,
                statusHistory: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findOrderById(
        orderId: string,
        buyerId?: string,
        tx?: Prisma.TransactionClient,
    ): Promise<OrderWithRelations | null> {
        const client = this.getClient(tx)
        return client.order.findFirst({
            where: {
                id: orderId,
                ...(buyerId ? { buyerId } : {}),
            },
            include: {
                orderItems: true,
                address: true,
                statusHistory: { orderBy: { createdAt: 'desc' } },
            },
        })
    }
}
