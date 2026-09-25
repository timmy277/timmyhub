import type { Locale } from '@timmyhub/contracts'

// Khai báo tập locale cho next-intl để `useLocale()` / `getLocale()` trả về `Locale` — không phải ép kiểu
// `as Locale` ở từng component.
declare module 'next-intl' {
    interface AppConfig {
        Locale: Locale
    }
}
