import { Logger } from '@nestjs/common'
import { VideoTranscodeService } from '@timmyhub/modules'
import { PrismaService } from '@timmyhub/prisma'
import { Worker } from 'bullmq'
import type { Job } from 'bullmq'
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
const transcodeService = new VideoTranscodeService()

if (queueName === 'outbox') {
    outboxDispatcher = new OutboxDispatcher(prisma)
    outboxDispatcher.start()
}

const worker = new Worker(
    queueName,
    async (job: Job) => {
        if (queueName === 'media' && job.name === 'transcode-video') {
            const { postId, videoUrl } = job.data as { postId: string; videoUrl: string }
            logger.log(`[MediaWorker] Bắt đầu xử lý job transcode "${job.id}" cho bài đăng ${postId}`)

            const post = await prisma.post.findUnique({
                where: { id: postId },
                select: { id: true, videoUrl: true },
            })
            if (!post) {
                logger.warn(`[MediaWorker] Bài đăng ${postId} không tồn tại hoặc đã bị xóa. Bỏ qua job.`)
                return
            }

            const res = await transcodeService.processVideoForPost(videoUrl, postId)
            if (res.success && res.hlsUrl) {
                await prisma.post.update({
                    where: { id: postId },
                    data: {
                        videoUrl: res.hlsUrl,
                        ...(res.thumbnailUrl ? { thumbnailUrl: res.thumbnailUrl } : {}),
                    },
                })
                logger.log(
                    `[MediaWorker] Hoàn tất nén & chuyển đổi HLS thành công cho bài đăng ${postId}: ${res.hlsUrl}`,
                )
            } else {
                logger.warn(`[MediaWorker] Nén video thất bại cho bài đăng ${postId}: ${res.error}`)
                throw new Error(res.error || 'Video transcode failed')
            }
        }
    },
    {
        connection,
        concurrency: queueName === 'media' ? 1 : 5,
    },
)

worker.on('ready', () => logger.log(`Đang lắng nghe queue "${queueName}"`))
worker.on('completed', (job) => logger.log(`Job ${job.id} [${job.name}] trên queue "${queueName}" hoàn tất`))
worker.on('failed', (job, error) => logger.error(`Job ${job?.id} [${job?.name}] thất bại: ${error.message}`))
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
