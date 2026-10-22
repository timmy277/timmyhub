import { Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export interface TranscodeJobData {
    postId: string
    videoUrl: string
}

@Injectable()
export class MediaQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MediaQueueService.name)
    private queue: Queue<TranscodeJobData> | null = null
    private connection: IORedis | null = null

    public onModuleInit(): void {
        const redisUrl =
            process.env.REDIS_URL ??
            (process.env.REDIS_HOST
                ? `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT ?? 6379}`
                : 'redis://localhost:6379')

        try {
            this.connection = new IORedis(redisUrl, {
                maxRetriesPerRequest: null,
                retryStrategy: (times) => {
                    if (times > 3) return null
                    return Math.min(times * 1000, 3000)
                },
                lazyConnect: true,
            })

            this.queue = new Queue<TranscodeJobData>('media', {
                connection: this.connection,
            })

            this.logger.log('Khởi tạo BullMQ Queue producer "media" thành công')
        } catch (error) {
            this.logger.warn(`Không thể khởi tạo BullMQ Media Queue: ${(error as Error).message}`)
        }
    }

    public async onModuleDestroy(): Promise<void> {
        try {
            if (this.queue) {
                await this.queue.close()
            }
            if (this.connection) {
                await this.connection.quit()
            }
        } catch (error) {
            this.logger.warn(`Lỗi khi đóng MediaQueue: ${(error as Error).message}`)
        }
    }

    /**
     * Đẩy tác vụ nén video và sinh HLS vào hàng đợi BullMQ "media"
     */
    public async addTranscodeJob(postId: string, videoUrl: string): Promise<boolean> {
        if (!this.queue) {
            return false
        }

        try {
            await this.queue.add(
                'transcode-video',
                { postId, videoUrl },
                {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: true,
                    removeOnFail: 100,
                },
            )
            this.logger.log(`[MediaQueue] Đã đẩy job transcode video cho post ${postId} vào BullMQ`)
            return true
        } catch (error) {
            this.logger.warn(
                `[MediaQueue] Không thể đẩy job vào hàng đợi cho post ${postId}: ${(error as Error).message}`,
            )
            return false
        }
    }
}
