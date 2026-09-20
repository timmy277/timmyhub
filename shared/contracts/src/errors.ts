// Danh mục mã lỗi dùng chung FE/BE — theo docs/01-architecture/api-conventions.md §3.3/§5.
// Bắt đầu với các mã của domain identity-auth; các domain khác bổ sung dần, không tạo file catalog riêng.
export const API_ERROR_CODES = {
    VALIDATION_FAILED: { status: 422 },
    EMAIL_ALREADY_REGISTERED: { status: 409 },
    WEAK_PASSWORD: { status: 422 },
    INVALID_CREDENTIALS: { status: 401 },
    ACCOUNT_LOCKED: { status: 423 },
    ACCOUNT_BANNED: { status: 403 },
    REFRESH_TOKEN_REUSED: { status: 401 },
    REFRESH_TOKEN_EXPIRED: { status: 401 },
    REFRESH_TOKEN_INVALID: { status: 401 },
    UNAUTHORIZED: { status: 401 },
    NOT_FOUND: { status: 404 },
    INTERNAL: { status: 500 },
} as const

export type ApiErrorCode = keyof typeof API_ERROR_CODES

// message là chuỗi hiển thị mặc định (tiếng Việt) — tầng gọi có thể thay bằng bản dịch theo Accept-Language.
export class ApiError extends Error {
    readonly code: ApiErrorCode
    readonly status: number
    readonly details?: unknown

    constructor(code: ApiErrorCode, message: string, details?: unknown) {
        super(message)
        this.code = code
        this.status = API_ERROR_CODES[code].status
        this.details = details
    }
}
