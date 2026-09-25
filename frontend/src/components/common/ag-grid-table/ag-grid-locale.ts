import type { Locale } from '@timmyhub/contracts'

type GridLocaleText = Record<string, string> | undefined

// Tiếng Anh là chữ mặc định của AG Grid — không cần tải gì. Ngôn ngữ khác nạp động, chỉ khi bảng render ở ngôn ngữ
// đó (PERF-008). Gói `@ag-grid-community/locale` không có file riêng cho từng ngôn ngữ (subpath `./*.js` trong
// `exports` trỏ tới file không tồn tại) nên nạp entry chính trong chunk riêng; destructure đúng một export để bundler
// có cơ hội tree-shake các ngôn ngữ còn lại.
const GRID_LOCALE_LOADERS: Record<Locale, () => Promise<GridLocaleText>> = {
    vi: () => import('@ag-grid-community/locale').then(({ AG_GRID_LOCALE_VN }) => AG_GRID_LOCALE_VN),
    en: () => Promise.resolve(undefined),
}

// Cache Promise theo ngôn ngữ ở phạm vi module: `use()` đòi cùng một Promise giữa các lần render, và đổi qua lại
// ngôn ngữ không phải tải lại.
const localeTextCache = new Map<Locale, Promise<GridLocaleText>>()

export function loadGridLocaleText(locale: Locale): Promise<GridLocaleText> {
    let promise = localeTextCache.get(locale)
    if (!promise) {
        promise = GRID_LOCALE_LOADERS[locale]()
        localeTextCache.set(locale, promise)
    }
    return promise
}
