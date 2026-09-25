import type { IncomingHttpHeaders } from 'node:http'

import type { Locale } from '@timmyhub/contracts'
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME } from '@timmyhub/contracts'

import {
    ACCEPT_LANGUAGE_HEADER,
    ACCEPT_LANGUAGE_PARAM_SEPARATOR,
    ACCEPT_LANGUAGE_QUALITY_PREFIX,
    ACCEPT_LANGUAGE_SEPARATOR,
    COOKIE_HEADER,
    COOKIE_PAIR_SEPARATOR,
    COOKIE_VALUE_SEPARATOR,
    DEFAULT_LANGUAGE_QUALITY,
    LANGUAGE_SUBTAG_SEPARATOR,
} from '../constants/index'

function readCookie(header: string | undefined, name: string): string | undefined {
    if (!header) return undefined
    for (const pair of header.split(COOKIE_PAIR_SEPARATOR)) {
        const separatorIndex = pair.indexOf(COOKIE_VALUE_SEPARATOR)
        if (separatorIndex < 0) continue
        if (pair.slice(0, separatorIndex).trim() === name) return pair.slice(separatorIndex + 1).trim()
    }
    return undefined
}

// `vi-VN,vi;q=0.9,en;q=0.8` → locale hỗ trợ có q cao nhất, so theo subtag ngôn ngữ chính (`vi-VN` → `vi`).
function negotiateAcceptLanguage(header: string | undefined): Locale | undefined {
    if (!header) return undefined
    let best: { locale: Locale; quality: number } | undefined
    for (const entry of header.split(ACCEPT_LANGUAGE_SEPARATOR)) {
        const [tag = '', ...params] = entry.trim().split(ACCEPT_LANGUAGE_PARAM_SEPARATOR)
        const language = tag.split(LANGUAGE_SUBTAG_SEPARATOR)[0]?.toLowerCase()
        if (!isLocale(language)) continue
        const qualityParam = params.find((param) => param.trim().startsWith(ACCEPT_LANGUAGE_QUALITY_PREFIX))
        const quality = qualityParam
            ? Number(qualityParam.trim().slice(ACCEPT_LANGUAGE_QUALITY_PREFIX.length))
            : DEFAULT_LANGUAGE_QUALITY
        if (Number.isFinite(quality) && (!best || quality > best.quality)) best = { locale: language, quality }
    }
    return best?.locale
}

// docs/01-architecture/i18n-backend.md §1: cookie `NEXT_LOCALE` (ngôn ngữ người dùng chọn trên FE) → Accept-Language
// → `vi`. Locale lạ không báo lỗi, chỉ bỏ qua.
export function resolveRequestLocale(headers: IncomingHttpHeaders): Locale {
    const cookieLocale = readCookie(headers[COOKIE_HEADER], LOCALE_COOKIE_NAME)
    if (isLocale(cookieLocale)) return cookieLocale
    const acceptLanguage = headers[ACCEPT_LANGUAGE_HEADER]
    return (
        negotiateAcceptLanguage(Array.isArray(acceptLanguage) ? acceptLanguage.join() : acceptLanguage) ??
        DEFAULT_LOCALE
    )
}
