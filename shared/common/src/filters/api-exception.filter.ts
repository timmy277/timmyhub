import { randomUUID } from 'node:crypto'

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'

import type { ApiErrorCode, ApiMessageKey, ApiMessageParams, Locale } from '@timmyhub/contracts'
import { ApiError, errorMessageKey, translateApiMessage } from '@timmyhub/contracts'

import { CONTENT_LANGUAGE_HEADER, FALLBACK_SERVER_ERROR_CODE, SERVER_ERROR_STATUS_MIN } from '../constants/index'
import { isValidationIssueList, resolveRequestLocale, toApiErrorCode, translateValidationIssues } from '../utils/index'

type ErrorBody = {
    code: ApiErrorCode
    messageKey: ApiMessageKey
    messageParams?: ApiMessageParams | undefined
    details?: unknown
}

// Chuẩn hoá mọi lỗi về đúng khung ở docs/01-architecture/api-conventions.md §3.3 và dịch thông điệp theo locale của
// request (docs/01-architecture/i18n-backend.md §2). Đặt ở shared/common để dùng chung cho apps/api và apps/worker.
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    // ===== Dependencies =====
    private readonly logger = new Logger(ApiExceptionFilter.name)

    // ===== Commands =====
    catch(exception: unknown, host: ArgumentsHost): void {
        const http = host.switchToHttp()
        const response = http.getResponse<Response>()
        const locale = resolveRequestLocale(http.getRequest<Request>().headers)

        if (exception instanceof ApiError) {
            this.send(response, locale, exception.status, {
                code: exception.code,
                messageKey: exception.messageKey,
                messageParams: exception.messageParams,
                details: exception.details,
            })
            return
        }

        if (exception instanceof HttpException) {
            const status = exception.getStatus()
            const body = exception.getResponse()
            if (status >= SERVER_ERROR_STATUS_MIN) {
                this.logger.error('HttpException phía máy chủ', exception.stack)
            }
            // Câu của Nest (tiếng Anh, vd "Cannot GET /x") không đưa ra làm message — dịch theo mã; bản gốc giữ ở details.
            const code = toApiErrorCode(status)
            this.send(response, locale, status, {
                code,
                messageKey: errorMessageKey(code),
                details: typeof body === 'object' ? body : undefined,
            })
            return
        }

        this.logger.error('Lỗi chưa được xử lý', exception instanceof Error ? exception.stack : exception)
        this.send(response, locale, HttpStatus.INTERNAL_SERVER_ERROR, {
            code: FALLBACK_SERVER_ERROR_CODE,
            messageKey: errorMessageKey(FALLBACK_SERVER_ERROR_CODE),
        })
    }

    // ===== Private helpers =====
    private send(response: Response, locale: Locale, status: number, error: ErrorBody): void {
        const details = isValidationIssueList(error.details)
            ? translateValidationIssues(error.details, locale)
            : error.details
        response.setHeader(CONTENT_LANGUAGE_HEADER, locale)
        response.status(status).json({
            success: false,
            error: {
                ...error,
                message: translateApiMessage(locale, error.messageKey, error.messageParams),
                details,
            },
            meta: { requestId: randomUUID(), timestamp: new Date().toISOString() },
        })
    }
}
