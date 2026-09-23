import { LOCALES } from '@/constants'
import type { Locale } from '@/types'

export function isLocale(value: string | undefined): value is Locale {
    return LOCALES.includes(value as Locale)
}
