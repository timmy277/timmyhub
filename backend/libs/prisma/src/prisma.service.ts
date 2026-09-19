import { Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name)

    constructor() {
        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL,
            max: Number(process.env.DB_POOL_MAX ?? 20),
        })
        super({ adapter })
    }

    async onModuleInit(): Promise<void> {
        await this.$connect()
        this.logger.log('Đã kết nối Postgres')
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect()
    }
}
