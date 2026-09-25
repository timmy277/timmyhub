import type { ApiMessageKey, ApiMessageParams } from './i18n/message-key'
import { errorMessageKey } from './i18n/translate'

// Danh mục mã lỗi dùng chung FE/BE — theo docs/01-architecture/api-conventions.md §3.3/§5.
// Bắt đầu với các mã của domain identity-auth; các domain khác bổ sung dần, không tạo file catalog riêng.
export const API_ERROR_CODES = {
    BAD_REQUEST: { status: 400 },
    VALIDATION_FAILED: { status: 422 },
    CONFLICT: { status: 409 },
    TOO_MANY_REQUESTS: { status: 429 },
    EMAIL_ALREADY_REGISTERED: { status: 409 },
    WEAK_PASSWORD: { status: 422 },
    INVALID_CREDENTIALS: { status: 401 },
    ACCOUNT_LOCKED: { status: 423 },
    ACCOUNT_BANNED: { status: 403 },
    REFRESH_TOKEN_REUSED: { status: 401 },
    REFRESH_TOKEN_EXPIRED: { status: 401 },
    REFRESH_TOKEN_INVALID: { status: 401 },
    UNAUTHORIZED: { status: 401 },
    FORBIDDEN: { status: 403 },
    NOT_FOUND: { status: 404 },
    INTERNAL: { status: 500 },
    // domain rbac — docs/03-specs/rbac-permission/design.md
    ROLE_NOT_FOUND: { status: 404 },
    ROLE_ALREADY_EXISTS: { status: 409 },
    ROLE_IS_SYSTEM: { status: 403 },
    ROLE_IN_USE: { status: 409 },
    PERMISSION_NOT_FOUND: { status: 404 },
    PERMISSION_ALREADY_EXISTS: { status: 409 },
    CANNOT_ESCALATE_PRIVILEGE: { status: 403 },
} as const

export type ApiErrorCode = keyof typeof API_ERROR_CODES

// Một lỗi validation trong `error.details` của VALIDATION_FAILED. `message` do BE dịch theo locale của request; FE có
// thể tự dịch lại từ `messageKey` + `messageParams` (namespace `api` của next-intl).
export type ApiValidationIssue = {
    path: (string | number)[]
    messageKey: ApiMessageKey
    messageParams?: ApiMessageParams | undefined
    message?: string
}

export type ApiErrorOptions = {
    // Mặc định `error.<code>`. Dùng khoá riêng khi cần câu cụ thể hơn câu chung của mã lỗi.
    messageKey?: ApiMessageKey
    messageParams?: ApiMessageParams | undefined
    details?: unknown
}

// Không mang câu đã dịch: chỉ mang khoá + tham số, ApiExceptionFilter dịch theo locale của request
// (docs/01-architecture/i18n-backend.md §2). `Error.message` là khoá — đủ để đọc log.
export class ApiError extends Error {
    readonly code: ApiErrorCode
    readonly status: number
    readonly messageKey: ApiMessageKey
    readonly messageParams: ApiMessageParams | undefined
    readonly details?: unknown

    constructor(code: ApiErrorCode, options: ApiErrorOptions = {}) {
        const messageKey = options.messageKey ?? errorMessageKey(code)
        super(messageKey)
        this.code = code
        this.status = API_ERROR_CODES[code].status
        this.messageKey = messageKey
        this.messageParams = options.messageParams
        this.details = options.details
    }
}
