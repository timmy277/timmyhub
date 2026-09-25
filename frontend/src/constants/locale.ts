import type { Locale } from '@timmyhub/contracts'

// LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isLocale dùng chung với BE — import thẳng từ `@timmyhub/contracts`.

// Key nhãn tên ngôn ngữ trong namespace `common`.
export const LOCALE_LABEL_KEY = {
    vi: 'languageVi',
    en: 'languageEn',
} as const satisfies Record<Locale, string>

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
