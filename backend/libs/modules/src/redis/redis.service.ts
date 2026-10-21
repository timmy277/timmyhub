import { Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import IORedis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name)
    private client: IORedis | null = null
    private isConnected = false

    public onModuleInit(): void {
        const redisUrl =
            process.env.REDIS_URL ??
            (process.env.REDIS_HOST
                ? `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT ?? 6379}`
                : 'redis://localhost:6379')

        try {
            this.client = new IORedis(redisUrl, {
                maxRetriesPerRequest: 1,
                retryStrategy: (times) => {
                    if (times > 3) {
                        return null // Ngừng retry liên tục nếu không bật Redis
                    }
                    return Math.min(times * 1000, 3000)
                },
                enableReadyCheck: false,
                lazyConnect: true,
            })

            this.client.on('connect', () => {
                this.isConnected = true
                this.logger.log('Đã kết nối Redis thành công')
            })

            this.client.on('error', (err: Error) => {
                this.isConnected = false
                this.logger.warn(`Redis cảnh báo/lỗi kết nối: ${err.message}`)
            })

            this.client.on('close', () => {
                this.isConnected = false
            })

            // Thử kết nối nền, không chặn bootstrap ứng dụng nếu Redis chưa bật
            void this.client.connect().catch((err: Error) => {
                this.logger.warn(`Chưa thể kết nối Redis lúc khởi động (${err.message}). Chuyển sang chế độ Bypass.`)
            })
        } catch (_error) {
            this.logger.warn('Khởi tạo Redis client thất bại, tính năng cache sẽ chạy fallback.')
        }
    }

    public async onModuleDestroy(): Promise<void> {
        if (this.client) {
            try {
                await this.client.quit()
                this.logger.log('Đã đóng kết nối Redis an toàn')
            } catch {
                this.client.disconnect()
            }
        }
    }

    public isReady(): boolean {
        return this.isConnected && this.client !== null && this.client.status === 'ready'
    }

    public getClient(): IORedis | null {
        return this.client
    }

    public async get<T>(key: string): Promise<T | null> {
        if (!this.client || !this.isConnected) return null
        try {
            const raw = await this.client.get(key)
            if (!raw) return null
            return JSON.parse(raw) as T
        } catch (error) {
            this.logger.warn(`Lỗi đọc cache key "${key}": ${error instanceof Error ? error.message : String(error)}`)
            return null
        }
    }

    public async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        if (!this.client || !this.isConnected) return
        try {
            const payload = JSON.stringify(value)
            if (ttlSeconds && ttlSeconds > 0) {
                await this.client.set(key, payload, 'EX', ttlSeconds)
            } else {
                await this.client.set(key, payload)
            }
        } catch (error) {
            this.logger.warn(`Lỗi ghi cache key "${key}": ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    public async del(key: string): Promise<void> {
        if (!this.client || !this.isConnected) return
        try {
            await this.client.del(key)
        } catch (error) {
            this.logger.warn(`Lỗi xoá cache key "${key}": ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    public async delPattern(pattern: string): Promise<void> {
        if (!this.client || !this.isConnected) return
        try {
            let cursor = '0'
            do {
                const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
                cursor = nextCursor
                if (keys.length > 0) {
                    await this.client.del(...keys)
                }
            } while (cursor !== '0')
        } catch (error) {
            this.logger.warn(
                `Lỗi xoá pattern cache "${pattern}": ${error instanceof Error ? error.message : String(error)}`,
            )
        }
    }

    public async acquireLock(key: string, ttlSeconds = 10): Promise<boolean> {
        if (!this.client || !this.isConnected) return true // Fallback cho phép tiếp tục nếu không bật Redis
        try {
            const lockKey = `lock:${key}`
            const res = await this.client.set(lockKey, '1', 'EX', ttlSeconds, 'NX')
            return res === 'OK'
        } catch (error) {
            this.logger.warn(`Lỗi acquireLock "${key}": ${error instanceof Error ? error.message : String(error)}`)
            return true
        }
    }

    public async releaseLock(key: string): Promise<void> {
        if (!this.client || !this.isConnected) return
        try {
            await this.client.del(`lock:${key}`)
        } catch (error) {
            this.logger.warn(`Lỗi releaseLock "${key}": ${error instanceof Error ? error.message : String(error)}`)
        }
    }
}
