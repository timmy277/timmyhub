export const LOCALES = ['vi', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'vi'

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'

export function isLocale(value: string | undefined): value is Locale {
    return LOCALES.includes(value as Locale)
}
