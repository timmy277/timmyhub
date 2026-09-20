import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ApiExceptionFilter } from '@timmyhub/common'

import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.useGlobalFilters(new ApiExceptionFilter())

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

    await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
