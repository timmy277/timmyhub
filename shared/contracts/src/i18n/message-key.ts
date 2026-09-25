import type { API_MESSAGES_VI } from './messages.vi'

type SourceCatalog = typeof API_MESSAGES_VI

// Khuôn mọi ngôn ngữ phải theo: đúng các namespace/khoá của bản vi, giá trị là chuỗi bất kỳ.
export type ApiMessageCatalog = { [N in keyof SourceCatalog]: Record<keyof SourceCatalog[N], string> }

export type ApiMessageNamespace = keyof SourceCatalog

// Khoá phẳng `namespace.key` — đúng cú pháp khoá của next-intl (`t('api.rbac.roleAlreadyExists')` phía FE).
export type ApiMessageKey = {
    [N in ApiMessageNamespace]: `${N}.${keyof SourceCatalog[N] & string}`
}[ApiMessageNamespace]

export type ApiMessageParams = Readonly<Record<string, string | number>>
