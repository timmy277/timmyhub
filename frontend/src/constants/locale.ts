import type { Locale } from '@/types'

export const LOCALES = ['vi', 'en'] as const

export const DEFAULT_LOCALE: Locale = 'vi'

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
