import { z } from 'zod'

// Ngôn ngữ hỗ trợ — nguồn duy nhất cho cả FE (next-intl) và BE (dịch thông điệp lỗi). docs/01-architecture/i18n-backend.md §1.
export const Locale = {
    VI: 'vi',
    EN: 'en',
} as const
export type Locale = (typeof Locale)[keyof typeof Locale]

export const LOCALES = Object.values(Locale) as [Locale, ...Locale[]]
export const LocaleSchema = z.enum(Locale)

export const DEFAULT_LOCALE: Locale = Locale.VI

// Locale nằm trong cookie, không nằm trên URL (performance-campaign.md, TASK-PERF-002 đã huỷ). BE đọc cùng cookie này.
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'

export function isLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
