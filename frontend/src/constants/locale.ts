import type { Locale } from '@/types'

export const LOCALES = ['vi', 'en'] as const satisfies readonly Locale[]

export const DEFAULT_LOCALE: Locale = 'vi'

// Key nhãn tên ngôn ngữ trong namespace `common`.
export const LOCALE_LABEL_KEY = {
    vi: 'languageVi',
    en: 'languageEn',
} as const satisfies Record<Locale, string>

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
