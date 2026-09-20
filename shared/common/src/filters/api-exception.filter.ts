import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Catch, HttpException, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { ApiError } from '@timmyhub/contracts'
import { randomUUID } from 'node:crypto'

// Chuẩn hoá mọi lỗi về đúng khung ở docs/01-architecture/api-conventions.md §3.3.
// Đặt ở shared/common để dùng chung cho apps/api và apps/worker, không riêng một process.
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ApiExceptionFilter.name)

    catch(exception: unknown, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response>()
        const meta = { requestId: randomUUID(), timestamp: new Date().toISOString() }

        if (exception instanceof ApiError) {
            response.status(exception.status).json({
                success: false,
                error: { code: exception.code, message: exception.message, details: exception.details },
                meta,
            })
            return
        }

        if (exception instanceof HttpException) {
            const status = exception.getStatus()
            const body = exception.getResponse()
            const message =
                typeof body === 'string' ? body : ((body as { message?: string }).message ?? exception.message)
            response.status(status).json({
                success: false,
                error: { code: 'VALIDATION_FAILED', message, details: typeof body === 'object' ? body : undefined },
                meta,
            })
            return
        }

        this.logger.error('Lỗi chưa được xử lý', exception instanceof Error ? exception.stack : exception)
        response.status(500).json({
            success: false,
            error: { code: 'INTERNAL', message: 'Có lỗi xảy ra, vui lòng thử lại sau.' },
            meta,
        })
    }
}
