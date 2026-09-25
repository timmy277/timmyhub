import type { core } from 'zod'

import type { ApiMessageParams, ApiValidationIssue, Locale } from '@timmyhub/contracts'
import { apiMessageKey, isApiMessageKey, translateApiMessage } from '@timmyhub/contracts'

// Thuộc tính của issue zod được đưa làm tham số nội suy (`{minimum}` trong `validation.passwordMin`).
const ISSUE_PARAM_FIELDS = ['minimum', 'maximum'] as const

function pickIssueParams(issue: core.$ZodIssue): ApiMessageParams | undefined {
    const params: Record<string, string | number> = {}
    for (const field of ISSUE_PARAM_FIELDS) {
        // Chỉ vài loại issue (too_small, too_big) có các field này — đọc động thay vì thu hẹp từng loại.
        const value: unknown = Reflect.get(issue, field)
        if (typeof value === 'number' || typeof value === 'bigint') params[field] = Number(value)
    }
    return Object.keys(params).length > 0 ? params : undefined
}

// Issue zod → dạng trả về API. Message của schema trong contracts là khoá thông điệp; issue không mang khoá (message
// mặc định tiếng Anh của zod) rơi về `validation.invalid` thay vì lộ nguyên văn.
export function toValidationIssues(issues: readonly core.$ZodIssue[]): ApiValidationIssue[] {
    return issues.map((issue) => ({
        path: issue.path.map((segment) => (typeof segment === 'number' ? segment : String(segment))),
        messageKey: isApiMessageKey(issue.message) ? issue.message : apiMessageKey('validation.invalid'),
        messageParams: pickIssueParams(issue),
    }))
}

export function isValidationIssueList(value: unknown): value is ApiValidationIssue[] {
    return (
        Array.isArray(value) &&
        value.every(
            (item: unknown) =>
                typeof item === 'object' && item !== null && 'messageKey' in item && isApiMessageKey(item.messageKey),
        )
    )
}

export function translateValidationIssues(issues: readonly ApiValidationIssue[], locale: Locale): ApiValidationIssue[] {
    return issues.map((issue) => ({
        ...issue,
        message: translateApiMessage(locale, issue.messageKey, issue.messageParams),
    }))
}
