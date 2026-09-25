import { HttpStatus } from '@nestjs/common'

import type { ApiErrorCode } from '@timmyhub/contracts'

// HttpException của NestJS (không phải ApiError) → mã lỗi chuẩn ở api-conventions.md §3.3. 400 gộp vào
// VALIDATION_FAILED vì phần lớn 400 do Nest sinh ra là dữ liệu vào sai (ParseIntPipe, body JSON hỏng).
export const HTTP_STATUS_ERROR_CODE: Readonly<Partial<Record<number, ApiErrorCode>>> = {
    400: 'VALIDATION_FAILED',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_FAILED',
    429: 'TOO_MANY_REQUESTS',
}

// Mã 4xx không có trong bảng trên (405, 413, 415…) và mọi mã 5xx.
export const FALLBACK_CLIENT_ERROR_CODE: ApiErrorCode = 'BAD_REQUEST'
export const FALLBACK_SERVER_ERROR_CODE: ApiErrorCode = 'INTERNAL'

// Ngưỡng dưới của lớp 5xx. Là `number` (không dùng enum HttpStatus) để so với `exception.getStatus()` mà không
// vướng @typescript-eslint/no-unsafe-enum-comparison.
export const SERVER_ERROR_STATUS_MIN: number = HttpStatus.INTERNAL_SERVER_ERROR

export const INTERNAL_ERROR_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại sau.'
