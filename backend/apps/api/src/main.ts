import { resolve } from 'node:path'

import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { ApiExceptionFilter } from '@timmyhub/common'

import { AppModule } from './app.module'

// NestJS application bootstrap (ChatModule, Notifications & Wishlist enabled)
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)
    // Chạy OnModuleDestroy/OnApplicationShutdown khi nhận SIGTERM/SIGINT — PrismaService ngắt kết nối DB êm.
    app.enableShutdownHooks()
    app.useGlobalFilters(new ApiExceptionFilter())
    const corsOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    app.enableCors({ origin: corsOrigins, credentials: true })

    // Serve static uploads folder for local development (fallback khi không dùng Supabase/R2)
    app.useStaticAssets(resolve(process.cwd(), 'uploads'), { prefix: '/uploads' })

    // Chỉ bật Swagger UI ngoài production — /docs không nên lộ ra môi trường thật.
    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('timmy-hub API')
            .setDescription('Tài liệu API cho backend/apps/api')
            .setVersion('0.0.0')
            .addBearerAuth()
            .build()
        const document = SwaggerModule.createDocument(app, config)
        SwaggerModule.setup('docs', app, document)
    }

    await app.listen(process.env.PORT ?? 3001)
}

void bootstrap()
