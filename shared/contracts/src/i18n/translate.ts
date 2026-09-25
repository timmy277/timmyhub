import type { ApiErrorCode } from '../errors'
import type { Locale } from '../locale'
import { DEFAULT_LOCALE } from '../locale'
import type { ApiMessageCatalog, ApiMessageKey, ApiMessageParams } from './message-key'
import { API_MESSAGES_EN } from './messages.en'
import { API_MESSAGES_VI } from './messages.vi'

export const API_MESSAGES: Readonly<Record<Locale, ApiMessageCatalog>> = {
    vi: API_MESSAGES_VI,
    en: API_MESSAGES_EN,
}

const KEY_SEPARATOR = '.'
const PARAM_PATTERN = /\{(\w+)\}/g

// Đánh dấu một chuỗi là khoá thông điệp — dùng làm message của zod trong contracts để typecheck bắt khoá sai.
export function apiMessageKey<K extends ApiMessageKey>(key: K): K {
    return key
}

export function errorMessageKey(code: ApiErrorCode): ApiMessageKey {
    return `error.${code}`
}

function lookup(catalog: ApiMessageCatalog, key: string): string | undefined {
    const separatorIndex = key.indexOf(KEY_SEPARATOR)
    if (separatorIndex < 0) return undefined
    const namespace = catalog[key.slice(0, separatorIndex) as keyof ApiMessageCatalog] as
        Readonly<Record<string, string>> | undefined
    return namespace?.[key.slice(separatorIndex + 1)]
}

export function isApiMessageKey(value: unknown): value is ApiMessageKey {
    return typeof value === 'string' && lookup(API_MESSAGES_VI, value) !== undefined
}

// Dịch khoá theo locale, rơi về ngôn ngữ mặc định rồi về chính khoá. Chỉ nội suy `{name}` đơn giản — tập con của ICU
// mà next-intl cũng hiểu, nên cùng một chuỗi dùng được ở cả hai phía.
export function translateApiMessage(locale: Locale, key: ApiMessageKey, params?: ApiMessageParams): string {
    const template = lookup(API_MESSAGES[locale], key) ?? lookup(API_MESSAGES[DEFAULT_LOCALE], key) ?? key
    if (!params) return template
    return template.replace(PARAM_PATTERN, (match, name: string) => (name in params ? String(params[name]) : match))
}
