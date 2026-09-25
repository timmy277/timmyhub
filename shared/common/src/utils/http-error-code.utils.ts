import type { ApiErrorCode } from '@timmyhub/contracts'

import {
    FALLBACK_CLIENT_ERROR_CODE,
    FALLBACK_SERVER_ERROR_CODE,
    HTTP_STATUS_ERROR_CODE,
    SERVER_ERROR_STATUS_MIN,
} from '../constants/index'

// Mã HTTP của một HttpException (không phải ApiError) → mã lỗi chuẩn; mã lạ rơi về BAD_REQUEST (4xx) hoặc INTERNAL (5xx).
export function toApiErrorCode(status: number): ApiErrorCode {
    const mapped = HTTP_STATUS_ERROR_CODE[status]
    if (mapped) return mapped
    return status >= SERVER_ERROR_STATUS_MIN ? FALLBACK_SERVER_ERROR_CODE : FALLBACK_CLIENT_ERROR_CODE
}
