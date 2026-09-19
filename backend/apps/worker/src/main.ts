import { Logger } from '@nestjs/common'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'

// Hai entrypoint dùng chung codebase, khác queue: mặc định job nhẹ (outbox), `--queue=media` cho ffmpeg —
// theo docs/05-infra/monorepo-and-build.md §1. Logic xử lý job thật (mail, transcode, index) sẽ nối vào theo
// từng spec domain, khung này chỉ đủ để build và kết nối được Redis.
const logger = new Logger('Worker')
const queueName = process.argv.includes('--queue=media') ? 'media' : 'outbox'

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
})

const worker = new Worker(
    queueName,
    async () => {
        // Placeholder — chưa xử lý job thật.
    },
    { connection },
)

worker.on('ready', () => logger.log(`Đang lắng nghe queue "${queueName}"`))
worker.on('error', (error) => logger.error(error))
