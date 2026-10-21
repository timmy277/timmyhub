import { Logger } from '@nestjs/common'
import { PrismaService } from '@timmyhub/prisma'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'

import { OutboxDispatcher } from './outbox-dispatcher'

// Hai entrypoint dùng chung codebase, khác queue: mặc định job nhẹ (outbox), `--queue=media` cho ffmpeg —
// theo docs/05-infra/monorepo-and-build.md §1.
const logger = new Logger('Worker')
const queueName = process.argv.includes('--queue=media') ? 'media' : 'outbox'
const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
})

const prisma = new PrismaService()
let outboxDispatcher: OutboxDispatcher | null = null

if (queueName === 'outbox') {
    outboxDispatcher = new OutboxDispatcher(prisma)
    outboxDispatcher.start()
}

const worker = new Worker(
    queueName,
    async () => {
        // Placeholder — xử lý BullMQ jobs nếu có
    },
    { connection },
)

worker.on('ready', () => logger.log(`Đang lắng nghe queue "${queueName}"`))
worker.on('error', (error) => logger.error(error))

// Tắt êm khi orchestrator gửi SIGTERM (rolling deploy) hoặc Ctrl+C: worker.close() chờ job đang chạy xong và
// ngừng nhận job mới, dừng outbox poller, đóng Prisma rồi mới đóng kết nối Redis — tránh job bị cắt ngang.
let isShuttingDown = false

async function shutdown(signal: (typeof SHUTDOWN_SIGNALS)[number]): Promise<void> {
    if (isShuttingDown) return
    isShuttingDown = true
    logger.log(`Nhận ${signal}, đang dừng worker...`)
    try {
        if (outboxDispatcher) {
            await outboxDispatcher.stop()
        }
        await worker.close()
        await connection.quit()
        await prisma.$disconnect()
        process.exit(0)
    } catch (error) {
        logger.error(error)
        process.exit(1)
    }
}

for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => void shutdown(signal))
}
