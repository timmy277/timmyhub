import type { OutboxAggregateType, OutboxEventType } from '@timmyhub/contracts'
import type { Prisma } from '@timmyhub/prisma'

export type OutboxEventInput = {
    aggregateType: OutboxAggregateType
    aggregateId: string
    eventType: OutboxEventType
    payload: Prisma.InputJsonObject
}

// Luật cứng #3 CLAUDE.md: event chỉ phát qua transactional outbox. Hàm nhận `tx` bắt buộc (không nhận PrismaService)
// để không thể ghi outbox ngoài transaction của thay đổi nghiệp vụ; eventType/aggregateType là union từ contracts nên
// không gõ nhầm tên event được.
export async function writeOutboxEvent(tx: Prisma.TransactionClient, event: OutboxEventInput): Promise<void> {
    await tx.outboxEvent.create({
        data: {
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            payload: event.payload,
        },
    })
}
