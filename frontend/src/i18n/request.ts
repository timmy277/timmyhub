import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from '@/constants'
import { isLocale } from '@/utils'

// Không dùng routing/middleware/segment [locale] của next-intl (localePrefix "never") — locale đọc từ
// cookie, URL giữ nguyên dù đổi ngôn ngữ. Đổi locale qua Server Action `setLocale` (`@/services`).
export default getRequestConfig(async () => {
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    }
})
