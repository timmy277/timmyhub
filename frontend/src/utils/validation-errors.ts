// Lỗi của zod không phải câu đã dịch mà là **khoá thông điệp** (`validation.*`) theo luật #15 — catalog `api` dùng
// chung với backend (`i18n/request.ts` gắn sẵn) nên dịch được ngay ở client. `minimum`/`maximum` của zod v4 nằm trực
// tiếp trên issue (không qua `params`) nên đọc bằng `Reflect.get`, giống `validation-issue.utils.ts` của backend.
type MessageLookup = {
    has: (key: string) => boolean
    (key: string, values?: Record<string, number>): string
}

type ValidationIssue = {
    path: readonly PropertyKey[]
    message: string
}

// Gộp nhiều issue về lỗi đầu tiên của mỗi field — dưới mỗi ô chỉ hiện được một câu.
export function toFieldErrors(issues: readonly ValidationIssue[], t: MessageLookup): Record<string, string> {
    const fieldErrors: Record<string, string> = {}

    for (const issue of issues) {
        const field = String(issue.path[0] ?? '')
        if (!field || fieldErrors[field]) continue

        const minimum: unknown = Reflect.get(issue, 'minimum')
        const params =
            typeof minimum === 'number' || typeof minimum === 'bigint' ? { minimum: Number(minimum) } : undefined

        fieldErrors[field] = t.has(issue.message) ? t(issue.message, params) : issue.message
    }

    return fieldErrors
}

export function toFieldErrorMessage(message: string | undefined, t: MessageLookup): string | undefined {
    if (!message) return undefined
    return t.has(message) ? t(message) : message
}
