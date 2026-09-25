import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

import { API_MESSAGES, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME } from '@timmyhub/contracts'

// Không dùng routing/middleware/segment [locale] của next-intl (localePrefix "never") — locale đọc từ
// cookie, URL giữ nguyên dù đổi ngôn ngữ. Đổi locale qua Server Action `setLocale` (`@/services`).
// Catalog thông điệp API (lỗi, validation) dùng chung với BE, gắn vào namespace `api` để FE dịch
// `messageKey` trả về từ BE bằng `useTranslations('api')`.
export default getRequestConfig(async () => {
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE

    return {
        locale,
        messages: {
            ...(await import(`../../messages/${locale}.json`)).default,
            api: API_MESSAGES[locale],
        },
    }
})
