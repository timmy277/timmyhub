import { Logger } from '@nestjs/common'
import { OUTBOX_AGGREGATE, OUTBOX_EVENT } from '@timmyhub/contracts'
import type { PrismaService } from '@timmyhub/prisma'

export interface OutboxDispatcherOptions {
    pollIntervalMs?: number
    batchSize?: number
}

export class OutboxDispatcher {
    private readonly logger = new Logger(OutboxDispatcher.name)
    private readonly pollIntervalMs: number
    private readonly batchSize: number
    private timer: NodeJS.Timeout | null = null
    private isProcessing = false
    private isStopping = false

    constructor(
        private readonly prisma: PrismaService,
        options?: OutboxDispatcherOptions,
    ) {
        this.pollIntervalMs = options?.pollIntervalMs ?? 3000
        this.batchSize = options?.batchSize ?? 50
    }

    public start(): void {
        if (this.timer) return
        this.logger.log(`Khởi động Outbox Dispatcher (chu kỳ: ${this.pollIntervalMs}ms, batchSize: ${this.batchSize})`)
        this.timer = setInterval(() => {
            void this.dispatchNextBatch()
        }, this.pollIntervalMs)

        // Kích hoạt ngay đợt quét đầu tiên
        void this.dispatchNextBatch()
    }

    public async stop(): Promise<void> {
        this.isStopping = true
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
        // Chờ batch đang chạy hoàn tất (nếu có)
        while (this.isProcessing) {
            await new Promise((resolve) => setTimeout(resolve, 100))
        }
        this.logger.log('Đã dừng Outbox Dispatcher an toàn')
    }

    public async dispatchNextBatch(): Promise<number> {
        if (this.isProcessing || this.isStopping) return 0
        this.isProcessing = true

        try {
            const events = await this.prisma.outboxEvent.findMany({
                where: { publishedAt: null },
                orderBy: { createdAt: 'asc' },
                take: this.batchSize,
            })

            if (events.length === 0) {
                return 0
            }

            this.logger.log(`Tìm thấy ${events.length} outbox event(s) cần dispatch`)
            let successCount = 0

            for (const event of events) {
                if (this.isStopping) break

                try {
                    // Kiểm tra tính Idempotent qua processed_events (ADR-0002)
                    const alreadyProcessed = await this.prisma.processedEvent.findUnique({
                        where: { eventId: event.id },
                    })

                    if (alreadyProcessed) {
                        await this.prisma.outboxEvent.update({
                            where: { id: event.id },
                            data: { publishedAt: new Date() },
                        })
                        successCount++
                        continue
                    }

                    // Điều phối dispatch theo Aggregate và EventType
                    this.handleEvent(event.aggregateType, event.eventType, event.payload)

                    // Lưu ProcessedEvent và đánh dấu publishedAt trong cùng transaction
                    await this.prisma.$transaction(async (tx) => {
                        await tx.processedEvent.create({
                            data: {
                                eventId: event.id,
                                consumerName: 'worker.outbox-dispatcher',
                            },
                        })
                        await tx.outboxEvent.update({
                            where: { id: event.id },
                            data: { publishedAt: new Date() },
                        })
                    })

                    successCount++
                } catch (eventError) {
                    this.logger.error(
                        `Lỗi khi dispatch outbox event ${event.id} [${event.aggregateType}:${event.eventType}]:`,
                        eventError instanceof Error ? eventError.stack : eventError,
                    )
                }
            }

            return successCount
        } catch (error) {
            this.logger.error('Lỗi truy vấn quét outbox events:', error instanceof Error ? error.stack : error)
            return 0
        } finally {
            this.isProcessing = false
        }
    }

    private handleEvent(aggregateType: string, eventType: string, payload: unknown): void {
        switch (aggregateType) {
            case OUTBOX_AGGREGATE.ORDER:
                this.handleOrderEvent(eventType, payload)
                break

            case OUTBOX_AGGREGATE.PAYMENT:
                this.handlePaymentEvent(eventType, payload)
                break

            case OUTBOX_AGGREGATE.IDENTITY:
                this.logger.log(`[Identity Event] ${eventType}:`, JSON.stringify(payload))
                break

            case OUTBOX_AGGREGATE.SELLER:
                this.logger.log(`[Seller Event] ${eventType}:`, JSON.stringify(payload))
                break

            case OUTBOX_AGGREGATE.CATALOG:
                this.logger.log(`[Catalog Event] ${eventType}:`, JSON.stringify(payload))
                break

            default:
                this.logger.warn(`Chưa có handler chuyên biệt cho aggregate "${aggregateType}", event: "${eventType}"`)
                break
        }
    }

    private handleOrderEvent(eventType: string, payload: unknown): void {
        switch (eventType) {
            case OUTBOX_EVENT.ORDER_CREATED:
                this.logger.log(
                    `[Order Created Dispatch] Gửi thông báo & email xác nhận đặt hàng:`,
                    JSON.stringify(payload),
                )
                break

            case OUTBOX_EVENT.ORDER_PAID:
                this.logger.log(
                    `[Order Paid Dispatch] Đơn hàng đã thanh toán thành công, thông báo seller đóng gói:`,
                    JSON.stringify(payload),
                )
                break

            case OUTBOX_EVENT.ORDER_STATUS_UPDATED:
                this.logger.log(
                    `[Order Status Updated Dispatch] Cập nhật tiến trình vận đơn tới buyer:`,
                    JSON.stringify(payload),
                )
                break

            case OUTBOX_EVENT.ORDER_DELIVERED:
                this.logger.log(
                    `[Order Delivered Dispatch] Đơn đã giao thành công, kích hoạt đối soát & release tiền:`,
                    JSON.stringify(payload),
                )
                break

            case OUTBOX_EVENT.ORDER_CANCELLED:
                this.logger.log(
                    `[Order Cancelled Dispatch] Đơn bị huỷ, tiến hành thông báo & xử lý hoàn trả:`,
                    JSON.stringify(payload),
                )
                break

            default:
                this.logger.log(`[Order Event] ${eventType}:`, JSON.stringify(payload))
                break
        }
    }

    private handlePaymentEvent(eventType: string, payload: unknown): void {
        switch (eventType) {
            case OUTBOX_EVENT.PAYMENT_COMPLETED:
                this.logger.log(
                    `[Payment Completed Dispatch] Giao dịch thanh toán thành công:`,
                    JSON.stringify(payload),
                )
                break

            case OUTBOX_EVENT.PAYMENT_FAILED:
                this.logger.warn(`[Payment Failed Dispatch] Giao dịch thanh toán thất bại:`, JSON.stringify(payload))
                break

            default:
                this.logger.log(`[Payment Event] ${eventType}:`, JSON.stringify(payload))
                break
        }
    }
}
